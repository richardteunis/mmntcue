import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
const VALID_CUE_TYPES = ['audio', 'video', 'lighting', 'stage'] as const;

const sanitizeString = (str: unknown, maxLength: number = 200): string => {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>]/g, '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization header exists
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = await req.json();
    const { showName, existingCues, cueType } = requestBody;
    
    // Input validation
    const safeShowName = sanitizeString(showName, 200) || 'Untitled Show';
    const safeCueType = cueType && VALID_CUE_TYPES.includes(cueType) ? cueType : null;
    
    // Validate and sanitize existing cues array
    const safeExistingCues = Array.isArray(existingCues) 
      ? existingCues.slice(0, 50).map((c: any) => ({
          name: sanitizeString(c?.name, 100),
          type: sanitizeString(c?.type, 20),
          start_time: sanitizeString(c?.start_time, 20),
        }))
      : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const cueContext = safeExistingCues.length > 0 
      ? `Existing cues in the show:\n${safeExistingCues.map((c) => `- ${c.name} (${c.type}) at ${c.start_time}`).join('\n')}`
      : 'No existing cues yet.';

    const systemPrompt = `You are an expert stage manager and show producer. You help create run of show cues for live events, productions, and presentations.
    
Given the context of a show, suggest relevant cues that would enhance the production. Each cue should have:
- A descriptive name
- Type: audio, video, lighting, or stage
- Suggested duration
- Brief notes about the cue's purpose

Be creative but practical. Consider common production needs like transitions, audience engagement, and technical requirements.`;

    const userPrompt = `Show Name: ${safeShowName}

${cueContext}

${safeCueType ? `Please suggest 3 ${safeCueType} cues that would work well in this show.` : 'Please suggest 3 diverse cues (mix of audio, video, lighting, or stage directions) that would enhance this show.'}

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
