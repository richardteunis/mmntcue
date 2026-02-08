import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, fileName, fileType } = await req.json();

    if (!documentContent) {
      return new Response(
        JSON.stringify({ success: false, error: "Document content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Parsing document: ${fileName} (${fileType}), content length: ${documentContent.length}`);

    const systemPrompt = `You are an expert at parsing Run of Show (ROS) documents for live events. Your task is to extract structured cue/item data from documents that may be in various formats (schedules, agendas, scripts, production notes, etc.).

Extract each item/cue/segment and return structured data. Pay attention to:
- Timing information (start times, durations, end times)
- Item titles/descriptions
- Speaker/presenter names
- Technical cues (audio, video, lighting)
- Notes and special instructions
- Item types/categories

Return the data as a JSON object with a "items" array.`;

    const userPrompt = `Parse this ${fileType || 'document'} named "${fileName || 'unknown'}" and extract Run of Show items.

Document content:
---
${documentContent.substring(0, 50000)}
---

Return a JSON object with this structure:
{
  "items": [
    {
      "title": "Item title (required)",
      "start_time": "HH:MM:SS or HH:MM format if available",
      "duration": "Duration in HH:MM:SS or minutes format if available",
      "item_type": "cue | segment | break | transition",
      "speaker": "Speaker/presenter name if applicable",
      "notes": "Any notes or special instructions",
      "audio": "Audio cues/instructions",
      "video": "Video cues/instructions",
      "lighting": "Lighting cues/instructions"
    }
  ],
  "metadata": {
    "show_name": "Detected show/event name if found",
    "event_date": "Detected date if found",
    "venue": "Detected venue if found",
    "total_items": "Number of items extracted"
  }
}

Extract all items in order. If timing info is unclear, leave those fields empty. Be thorough - extract everything that looks like a cue, segment, or scheduled item.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_ros_items",
              description: "Extract Run of Show items from a document",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Item/cue title" },
                        start_time: { type: "string", description: "Start time in HH:MM:SS or HH:MM format" },
                        duration: { type: "string", description: "Duration in HH:MM:SS or minutes format" },
                        item_type: { type: "string", enum: ["cue", "segment", "break", "transition"] },
                        speaker: { type: "string", description: "Speaker or presenter name" },
                        notes: { type: "string", description: "Notes or special instructions" },
                        audio: { type: "string", description: "Audio cues" },
                        video: { type: "string", description: "Video cues" },
                        lighting: { type: "string", description: "Lighting cues" }
                      },
                      required: ["title"]
                    }
                  },
                  metadata: {
                    type: "object",
                    properties: {
                      show_name: { type: "string" },
                      event_date: { type: "string" },
                      venue: { type: "string" },
                      total_items: { type: "number" }
                    }
                  }
                },
                required: ["items"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_ros_items" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse document with AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ success: false, error: "AI did not return structured data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool call arguments:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${parsedData.items?.length || 0} items`);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-ros-document error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
