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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { credential, challenge } = body;

    if (!credential || !credential.id) {
      return new Response(JSON.stringify({ error: 'Invalid credential data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify challenge exists and hasn't expired
    const { data: challengeData, error: challengeError } = await adminClient
      .from('passkey_credentials')
      .select('*')
      .eq('credential_id', `login_challenge_${challenge}`)
      .single();

    if (challengeError || !challengeData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired challenge' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if challenge expired
    if (Date.now() > challengeData.counter) {
      await adminClient
        .from('passkey_credentials')
        .delete()
        .eq('credential_id', `login_challenge_${challenge}`);
      
      return new Response(JSON.stringify({ error: 'Login expired, please try again' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete the challenge
    await adminClient
      .from('passkey_credentials')
      .delete()
      .eq('credential_id', `login_challenge_${challenge}`);

    // Find the credential and associated user
    const { data: storedCredential, error: credError } = await adminClient
      .from('passkey_credentials')
      .select('*')
      .eq('credential_id', credential.id)
      .single();

    if (credError || !storedCredential) {
      return new Response(JSON.stringify({ error: 'Passkey not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last used timestamp and counter
    await adminClient
      .from('passkey_credentials')
      .update({
        last_used_at: new Date().toISOString(),
        counter: storedCredential.counter + 1,
      })
      .eq('id', storedCredential.id);

    // Get user email for signing in
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
      storedCredential.user_id
    );

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a magic link token for the user (passwordless sign-in)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: {
        redirectTo: new URL(req.headers.get('origin') || 'https://localhost').origin,
      },
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      return new Response(JSON.stringify({ error: 'Failed to authenticate' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token from the magic link
    const linkUrl = new URL(linkData.properties.action_link);
    const token = linkUrl.searchParams.get('token');
    const type = linkUrl.searchParams.get('type');

    return new Response(JSON.stringify({ 
      success: true,
      token,
      type,
      email: userData.user.email,
    }), {
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
