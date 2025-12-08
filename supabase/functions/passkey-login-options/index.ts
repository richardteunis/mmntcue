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

    // Generate challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const challengeBase64 = base64urlEncode(challenge);

    // Store challenge with a temporary ID (for anonymous login flow)
    const tempId = crypto.randomUUID();
    
    // We'll store this challenge in a way that can be verified later
    // Using a special prefix to identify login challenges
    await adminClient
      .from('passkey_credentials')
      .upsert({
        id: tempId,
        user_id: '00000000-0000-0000-0000-000000000000', // Placeholder for login challenges
        credential_id: `login_challenge_${challengeBase64}`,
        public_key: challengeBase64,
        counter: Date.now() + 5 * 60 * 1000, // Expiry timestamp
      }, { onConflict: 'credential_id' });

    const rpId = new URL(req.headers.get('origin') || 'https://localhost').hostname;

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
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
