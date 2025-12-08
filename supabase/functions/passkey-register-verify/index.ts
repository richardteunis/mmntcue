import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const body = await req.json();
    const { credential, deviceName } = body;

    if (!credential || !credential.id || !credential.response) {
      return new Response(JSON.stringify({ error: 'Invalid credential data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify challenge exists and hasn't expired
    const { data: challengeData, error: challengeError } = await adminClient
      .from('passkey_credentials')
      .select('*')
      .eq('credential_id', `challenge_${user.id}`)
      .single();

    if (challengeError || !challengeData) {
      return new Response(JSON.stringify({ error: 'No pending registration' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if challenge expired
    if (Date.now() > challengeData.counter) {
      await adminClient
        .from('passkey_credentials')
        .delete()
        .eq('credential_id', `challenge_${user.id}`);
      
      return new Response(JSON.stringify({ error: 'Registration expired, please try again' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete the challenge
    await adminClient
      .from('passkey_credentials')
      .delete()
      .eq('credential_id', `challenge_${user.id}`);

    // Store the credential
    const { error: insertError } = await adminClient
      .from('passkey_credentials')
      .insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: credential.response.publicKey || credential.response.attestationObject,
        counter: 0,
        device_type: deviceName || 'Unknown Device',
        backed_up: credential.clientExtensionResults?.credProps?.rk || false,
        transports: credential.response.transports || [],
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save passkey' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
