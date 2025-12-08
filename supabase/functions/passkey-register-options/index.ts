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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user from auth token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing credentials for exclusion
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: existingCredentials } = await adminClient
      .from('passkey_credentials')
      .select('credential_id')
      .eq('user_id', user.id);

    // Generate challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const challengeBase64 = base64urlEncode(challenge);

    // Store challenge temporarily (expires in 5 minutes)
    await adminClient
      .from('passkey_credentials')
      .upsert({
        id: crypto.randomUUID(),
        user_id: user.id,
        credential_id: `challenge_${user.id}`,
        public_key: challengeBase64,
        counter: Date.now() + 5 * 60 * 1000, // Expiry timestamp
      }, { onConflict: 'credential_id' });

    const rpId = new URL(req.headers.get('origin') || 'https://localhost').hostname;

    const options = {
      challenge: challengeBase64,
      rp: {
        name: 'MMNT.Cue',
        id: rpId,
      },
      user: {
        id: base64urlEncode(new TextEncoder().encode(user.id)),
        name: user.email || user.id,
        displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: (existingCredentials || [])
        .filter(c => !c.credential_id.startsWith('challenge_'))
        .map(c => ({
          id: c.credential_id,
          type: 'public-key',
          transports: ['internal', 'hybrid'],
        })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
      },
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
