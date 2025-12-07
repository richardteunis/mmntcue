import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { showName, existingCues, cueType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const cueContext = existingCues?.length > 0 
      ? `Existing cues in the show:\n${existingCues.map((c: any) => `- ${c.name} (${c.type}) at ${c.start_time}`).join('\n')}`
      : 'No existing cues yet.';

    const systemPrompt = `You are an expert stage manager and show producer. You help create run of show cues for live events, productions, and presentations.
    
Given the context of a show, suggest relevant cues that would enhance the production. Each cue should have:
- A descriptive name
- Type: audio, video, lighting, or stage
- Suggested duration
- Brief notes about the cue's purpose

Be creative but practical. Consider common production needs like transitions, audience engagement, and technical requirements.`;

    const userPrompt = `Show Name: ${showName || 'Untitled Show'}

${cueContext}

${cueType ? `Please suggest 3 ${cueType} cues that would work well in this show.` : 'Please suggest 3 diverse cues (mix of audio, video, lighting, or stage directions) that would enhance this show.'}

Respond in JSON format:
{
  "suggestions": [
    {
      "name": "Cue Name",
      "type": "audio|video|lighting|stage",
      "duration": "00:00:30",
      "notes": "Brief description of the cue"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let suggestions;
    try {
      suggestions = JSON.parse(content);
    } catch {
      suggestions = { suggestions: [] };
    }

    console.log("AI suggestions generated:", suggestions);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-cue function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
