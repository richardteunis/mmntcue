import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const VALID_TEMPLATES = ['concert', 'corporate', 'theater', 'wedding', 'festival', 'awards', 'church', 'broadcast'] as const;

const sanitizeString = (str: unknown, maxLength: number = 200): string => {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>]/g, '');
};

interface GenerateShowRequest {
  template: string;
  eventName?: string;
  duration?: number; // in minutes
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
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

    const requestBody = await req.json() as GenerateShowRequest;
    const { template, eventName, duration } = requestBody;
    
    // Input validation
    const safeTemplate = VALID_TEMPLATES.includes(template as any) ? template : 'concert';
    const safeEventName = sanitizeString(eventName, 200);
    const safeDuration = Math.min(Math.max(Number(duration) || 60, 5), 480); // 5 min to 8 hours

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const templateDescriptions: Record<string, string> = {
      concert: "A live music concert with multiple acts, lighting changes, and video displays",
      corporate: "A corporate event or conference with presentations, speakers, and multimedia",
      theater: "A theatrical production with scene changes, lighting cues, and sound effects",
      wedding: "A wedding ceremony and reception with music, lighting, and video moments",
      festival: "A multi-stage festival or outdoor event with various performers",
      awards: "An awards ceremony with presentations, walk-on music, and visual displays",
      church: "A religious service with worship music, multimedia, and lighting",
      broadcast: "A live broadcast or stream with graphics, audio, and video switching",
    };

    const templateDescription = templateDescriptions[safeTemplate] || templateDescriptions.concert;
    const showName = safeEventName || `${safeTemplate.charAt(0).toUpperCase() + safeTemplate.slice(1)} Show`;

    const systemPrompt = `You are a professional show caller and technical director who creates detailed cue sheets for live events. Generate realistic, practical cues that would be used in a real production.

Return a JSON object with this exact structure:
{
  "showName": "string",
  "description": "string",
  "cues": [
    {
      "name": "string (short descriptive name)",
      "type": "audio" | "video" | "lighting" | "stage",
      "duration": "HH:MM:SS format",
      "notes": "string (brief technical note)"
    }
  ]
}

Rules:
- Generate 8-15 cues that tell a complete story for the event
- Use realistic timing (most cues are 30 seconds to 5 minutes)
- Include a mix of audio, video, lighting, and stage cues
- Cue names should be professional and concise (e.g., "House Open", "Intro Video", "Applause Light")
- Notes should include technical details a crew would need
- Total runtime should be approximately ${safeDuration} minutes`;

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
          { 
            role: "user", 
            content: `Generate a professional cue sheet for: ${templateDescription}. Event name: "${showName}". Target duration: ${safeDuration} minutes.` 
          },
        ],
        response_format: { type: "json_object" },
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
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let showData;
    try {
      showData = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify(showData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-show error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
