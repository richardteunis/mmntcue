import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  showId: string;
  showName: string;
  inviterName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invite function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, showId, showName, inviterName, role }: InviteRequest = await req.json();
    
    console.log("Sending invite to:", email, "for show:", showName);

    // Construct the invite link
    const siteUrl = Deno.env.get("SITE_URL") || "https://lovable.dev";
    const inviteLink = `${siteUrl}/show/${showId}`;

    // Send the invite email
    const emailResponse = await resend.emails.send({
      from: "MMNT.Cue <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to collaborate on "${showName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1a1a2e; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #16213e; border-radius: 12px; padding: 40px; border: 1px solid #0f3460;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #38b2ac; margin: 0; font-size: 28px;">MMNT.Cue</h1>
              <p style="color: #a0aec0; margin-top: 5px; font-size: 14px;">Show Control</p>
            </div>
            
            <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 20px;">You've been invited!</h2>
            
            <p style="color: #e2e8f0; line-height: 1.6;">
              <strong>${inviterName}</strong> has invited you to collaborate on <strong>"${showName}"</strong> as a <strong>${role}</strong>.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; background-color: #6e59a5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Show
              </a>
            </div>
            
            <p style="color: #a0aec0; font-size: 13px; line-height: 1.5;">
              If you don't have an account yet, you'll be prompted to sign in with your email when you click the link above.
            </p>
            
            <hr style="border: none; border-top: 1px solid #0f3460; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 12px; text-align: center;">
              This invite was sent from MMNT.Cue. If you didn't expect this email, you can ignore it.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invite email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
