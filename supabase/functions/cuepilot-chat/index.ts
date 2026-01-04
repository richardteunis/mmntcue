import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Cue {
  id: string;
  name: string;
  type: string;
  track: string;
  start_time: string;
  duration: string;
  order_index: number;
  notes?: string;
}

interface ChangeOperation {
  type: "insert" | "update" | "delete" | "move" | "shift";
  item?: Record<string, unknown>;
  id?: string;
  changes?: Record<string, unknown>;
  previous?: Record<string, unknown>;
  index?: number;
  from_index?: number;
  to_index?: number;
  ids?: string[];
  time_delta?: number;
  direction?: "forward" | "backward";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { show_id, message, cues, history } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the system prompt with show context
    const cueList = (cues as Cue[])
      .map((c, i) => `${i + 1}. "${c.name}" (${c.type}) - ${c.start_time}, ${c.duration} on ${c.track}`)
      .join("\n");

    const systemPrompt = `You are CuePilot, an AI assistant for live event production. You help producers and showcallers manage their run of show.

Current show has ${cues.length} cues:
${cueList || "No cues yet"}

When the user asks you to make changes, you MUST respond with:
1. A brief explanation of what you'll do
2. A JSON block with the proposed changes in this exact format:

\`\`\`json
{
  "changes": [
    { "type": "insert", "item": { "title": "...", "start_time": "HH:MM:SS", "duration": "HH:MM:SS" }, "index": 0 },
    { "type": "update", "id": "uuid", "changes": { "field": "new_value" }, "previous": { "field": "old_value" } },
    { "type": "delete", "id": "uuid", "item": { "title": "..." } },
    { "type": "move", "id": "uuid", "from_index": 0, "to_index": 2 },
    { "type": "shift", "ids": ["uuid1", "uuid2"], "time_delta": 300, "direction": "forward" }
  ],
  "summary": "Brief description of changes"
}
\`\`\`

Rules:
- For time shifts, time_delta is in seconds (e.g., 300 = 5 minutes)
- Always include a summary
- If the request is ambiguous, ask for clarification
- If you can't find a matching cue, say so
- For inserts, suggest appropriate type, track, and timing based on context
- Be concise and professional`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: { role: string; content: string }) => ({
        role: h.role,
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    console.log("Calling Lovable AI with message:", message);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "I couldn't process that request.";

    console.log("AI response:", aiMessage);

    // Try to extract JSON changes from the response
    let changeRequestId: string | null = null;
    const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        
        if (parsed.changes && Array.isArray(parsed.changes) && parsed.changes.length > 0) {
          // Create a change request
          const { data: changeRequest, error } = await supabase
            .from("ros_change_requests")
            .insert([{
              show_id,
              request_type: "ai",
              status: "pending",
              diff_payload: parsed.changes,
              summary: parsed.summary || "AI-proposed changes",
              ai_prompt: message,
              ai_response: aiMessage,
            }])
            .select()
            .single();

          if (error) {
            console.error("Error creating change request:", error);
          } else {
            changeRequestId = changeRequest.id;
            console.log("Created change request:", changeRequestId);
          }
        }
      } catch (e) {
        console.error("Error parsing AI JSON:", e);
      }
    }

    // Clean the message for display (remove JSON block)
    const cleanMessage = aiMessage.replace(/```json[\s\S]*?```/g, "").trim();

    return new Response(
      JSON.stringify({
        message: cleanMessage || "I've prepared the changes for your review.",
        change_request_id: changeRequestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CuePilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
