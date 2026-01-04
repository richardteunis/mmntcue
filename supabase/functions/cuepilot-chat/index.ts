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

interface Segment {
  id: string;
  name: string;
  target_duration: number;
  color?: string;
  order_index: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { show_id, message, cues, segments, history } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the system prompt with show context
    const cueList = (cues as Cue[])
      .map((c, i) => `${i + 1}. [${c.id.slice(0,8)}] "${c.name}" (${c.type}) - ${c.start_time}, dur: ${c.duration}, track: ${c.track}${c.notes ? `, notes: ${c.notes}` : ''}`)
      .join("\n");

    const segmentList = ((segments || []) as Segment[])
      .map((s, i) => `${i + 1}. [${s.id.slice(0,8)}] "${s.name}" - ${Math.floor(s.target_duration / 60)}min${s.color ? `, color: ${s.color}` : ''}`)
      .join("\n");

    const systemPrompt = `You are Coco, a friendly and witty AI assistant for live event production. You help producers and showcallers manage their run of show with charm and efficiency.

## Current Show Context

**${cues.length} Cues:**
${cueList || "No cues yet - suggest adding some!"}

**${(segments || []).length} Segments:**
${segmentList || "No segments yet"}

## Your Capabilities

You can help with:
1. **Cue Management**: Add, edit, delete, reorder, duplicate cues
2. **Segment Management**: Create, modify, delete, reorder segments  
3. **Timing Operations**: Shift times, adjust durations, fix overlaps
4. **Bulk Operations**: Update multiple items at once
5. **Show Analysis**: Identify timing issues, suggest improvements
6. **Smart Suggestions**: Recommend based on show type and context

## Response Format

When making changes, respond with a brief explanation and a JSON block:

\`\`\`json
{
  "changes": [
    { "target": "cue", "type": "insert", "item": { "name": "...", "type": "presentation", "track": "Stage", "start_time": "HH:MM:SS", "duration": "HH:MM:SS", "notes": "..." }, "index": 0 },
    { "target": "cue", "type": "update", "id": "uuid", "changes": { "field": "new_value" } },
    { "target": "cue", "type": "delete", "id": "uuid" },
    { "target": "cue", "type": "move", "id": "uuid", "to_index": 2 },
    { "target": "cue", "type": "shift", "ids": ["uuid1", "uuid2"], "time_delta": 300, "direction": "forward" },
    { "target": "cue", "type": "duplicate", "id": "uuid", "new_name": "Copy of..." },
    { "target": "segment", "type": "insert", "item": { "name": "...", "target_duration": 1800, "color": "#hex" }, "index": 0 },
    { "target": "segment", "type": "update", "id": "uuid", "changes": { "name": "...", "target_duration": 2400 } },
    { "target": "segment", "type": "delete", "id": "uuid" },
    { "target": "segment", "type": "reorder", "order": ["uuid1", "uuid2", "uuid3"] }
  ],
  "summary": "Brief description of changes"
}
\`\`\`

## Cue Types
Available types: presentation, speaker, video, audio, break, transition, vog, lighting, custom

## Segment Colors  
Suggested: #3B82F6 (blue), #10B981 (green), #F59E0B (amber), #EF4444 (red), #8B5CF6 (purple), #EC4899 (pink)

## Rules
- time_delta is in seconds (300 = 5 minutes)
- target_duration for segments is in seconds (1800 = 30 minutes)
- Always include a summary
- Ask for clarification if the request is ambiguous
- Be friendly, concise, and professional
- Use the exact IDs provided when referencing existing items
- For bulk operations, you can update multiple items in one change set`;

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
