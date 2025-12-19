import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice style modifiers for the prompt
const STYLE_MODIFIERS: Record<string, string> = {
  calm: 'Speak in a calm, measured, and relaxed tone.',
  energetic: 'Speak with energy and enthusiasm.',
  authoritative: 'Speak with confidence and authority.',
  warm: 'Speak with warmth and friendliness.',
  dramatic: 'Speak with theatrical emphasis and drama.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generationId, script, voiceId, style, showId, cueId } = await req.json();

    if (!generationId || !script) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase
      .from('vog_generations')
      .update({ status: 'processing' })
      .eq('id', generationId);

    // Check if ElevenLabs API key is configured
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!elevenLabsKey) {
      // Mock implementation for development
      console.log('ElevenLabs API key not configured - using mock response');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock audio URL (in production, this would be the actual audio file URL)
      const mockAudioUrl = `https://example.com/vog/${generationId}.mp3`;
      const estimatedDuration = Math.ceil(script.length / 15); // ~15 chars per second

      // Update generation record with mock success
      await supabase
        .from('vog_generations')
        .update({
          status: 'succeeded',
          audio_url: mockAudioUrl,
          audio_duration: estimatedDuration,
          file_name: `VOG_${Date.now()}.mp3`,
        })
        .eq('id', generationId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          mock: true,
          message: 'VOG generated (mock mode - configure ELEVENLABS_API_KEY for real audio)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real ElevenLabs implementation
    const voiceMapping: Record<string, string> = {
      alloy: 'EXAVITQu4vr4xnSDxMaL', // Sarah
      echo: 'JBFqnCBsd6RMkjVDRZzb',   // George
      fable: 'FGY2WhTYpPnrIDTdsKH5',  // Laura
      onyx: 'TX3LPaxmHKxFdv7VOQHJ',   // Liam
      nova: 'cgSgspJ2msm6clMCkdW9',   // Jessica
      shimmer: 'pFZP5JQG7iQjIQuC4Bku', // Lily
    };

    const elevenLabsVoiceId = voiceMapping[voiceId] || voiceMapping.alloy;
    const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.calm;

    // Enhance script with style instruction
    const enhancedScript = `${styleModifier}\n\n${script}`;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: style === 'calm' ? 0.7 : 0.5,
            similarity_boost: 0.75,
            style: style === 'dramatic' ? 0.8 : 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      
      await supabase
        .from('vog_generations')
        .update({ 
          status: 'failed', 
          error_message: `ElevenLabs API error: ${response.status}` 
        })
        .eq('id', generationId);

      return new Response(
        JSON.stringify({ error: 'Failed to generate audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    const fileName = `vog_${showId}_${Date.now()}.mp3`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(`vog/${fileName}`, audioBuffer, {
        contentType: 'audio/mpeg',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(`vog/${fileName}`);

    // Estimate duration (rough calculation)
    const estimatedDuration = Math.ceil(script.length / 15);

    // Update generation record
    await supabase
      .from('vog_generations')
      .update({
        status: 'succeeded',
        audio_url: publicUrl,
        audio_duration: estimatedDuration,
        file_name: fileName,
      })
      .eq('id', generationId);

    return new Response(
      JSON.stringify({ success: true, audioUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-vog:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
