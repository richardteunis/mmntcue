import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple base64url encoding
function base64urlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up expired challenges
    await adminClient.rpc('cleanup_expired_challenges').catch(() => {});

    // Generate challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const challengeBase64 = base64urlEncode(challenge);

    // Store challenge in dedicated table
    const { error: insertError } = await adminClient
      .from('webauthn_challenges')
      .insert({
        challenge: challengeBase64,
        type: 'login',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      });

    if (insertError) {
      console.error('Failed to store challenge:', insertError);
      throw new Error('Failed to create login challenge');
    }

    const rpId = new URL(req.headers.get('origin') || 'https://localhost').hostname;

    console.log('Login options generated for rpId:', rpId);

    const options = {
      challenge: challengeBase64,
      timeout: 60000,
      rpId: rpId,
      userVerification: 'required',
      // Empty allowCredentials for discoverable credentials (passkeys)
      allowCredentials: [],
    };

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in passkey-login-options:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
