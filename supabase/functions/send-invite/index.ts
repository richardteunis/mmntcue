import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// mmnt. Cue logo as base64 data URI for email compatibility
const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYiIGhlaWdodD0iMjYiIHZpZXdCb3g9IjAgMCAyNiAyNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iNiIgZmlsbD0iI0U5MUU2MyIgZmlsbC1vcGFjaXR5PSIwLjQ1Ii8+CjxyZWN0IHg9IjE0IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHJ4PSIzIiBmaWxsPSIjRTkxRTYzIi8+CjxyZWN0IHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgcng9IjMiIGZpbGw9IiNFOTFFNjMiLz4KPHJlY3QgeT0iMTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgcng9IjMiIGZpbGw9IiNFOTFFNjMiLz4KPC9zdmc+`;

// Input validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 255 && emailRegex.test(email);
};

const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

const sanitizeString = (str: string, maxLength: number = 200): string => {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>]/g, '');
};

interface InviteRequest {
  email: string;
  showId: string;
  showName: string;
  inviterName: string;
  role: string;
  userName?: string;
}

const getCurrentYear = () => new Date().getFullYear();

const generateInvitationEmail = (params: {
  userName: string;
  inviterName: string;
  eventName: string;
  actionUrl: string;
  year: number;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>You're Invited to mmnt. Cue</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#020617;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#020617;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px; background-color:#020617; border-radius:16px; border:1px solid #1f2937;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 24px 8px 24px; text-align:left;">
              <img src="${LOGO_DATA_URI}" alt="mmnt. Cue" width="26" height="26" style="display:inline-block; vertical-align:middle; margin-right:8px;" />
              <span style="display:inline-block; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; letter-spacing:0.16em; text-transform:uppercase; color:#6b7280; vertical-align:middle;">
                mmnt. Cue
              </span>
              <h1 style="margin:12px 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:22px; line-height:1.4; color:#e5e7eb; font-weight:600;">
                You've been invited to mmnt. Cue
              </h1>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding:8px 24px 0 24px; text-align:left;">
              <p style="margin:0 0 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                Hi ${params.userName},
              </p>
              <p style="margin:0 0 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                ${params.inviterName} has invited you to join <strong style="color:#e5e7eb;">mmnt. Cue</strong> for the event <strong style="color:#e5e7eb;">${params.eventName}</strong>.
              </p>
              <p style="margin:0 0 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                Click the button below to create your account and get set up.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding:0 24px 24px 24px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#38bdf8" style="border-radius:999px;">
                    <a href="${params.actionUrl}"
                       style="display:inline-block; padding:10px 22px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; font-weight:500; text-decoration:none; color:#020617;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Secondary info -->
          <tr>
            <td style="padding:0 24px 24px 24px; text-align:left;">
              <p style="margin:0 0 8px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; line-height:1.7; color:#6b7280;">
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 16px; font-family:monospace; font-size:12px; word-break:break-all; color:#9ca3af;">
                ${params.actionUrl}
              </p>
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; line-height:1.6; color:#4b5563;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px 24px; text-align:left; border-top:1px solid #111827;">
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; color:#4b5563;">
                &copy; ${params.year} mmnt. Cue. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const generateAddedToShowEmail = (params: {
  userName: string;
  roleName: string;
  eventName: string;
  actionUrl: string;
  year: number;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Your role has been updated in mmnt. Cue</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#020617;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#020617;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px; background-color:#020617; border-radius:16px; border:1px solid #1f2937;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <img src="${LOGO_DATA_URI}" alt="mmnt. Cue" width="26" height="26" style="display:inline-block; vertical-align:middle; margin-right:8px;" />
              <span style="display:inline-block; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; letter-spacing:0.16em; text-transform:uppercase; color:#6b7280; vertical-align:middle;">
                mmnt. Cue
              </span>
              <h1 style="margin:12px 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:22px; line-height:1.4; color:#e5e7eb; font-weight:600;">
                You've been added as ${params.roleName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:8px 24px 0 24px;">
              <p style="margin:0 0 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                Hi ${params.userName},
              </p>
              <p style="margin:0 0 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                You've been added as a <strong style="color:#e5e7eb;">${params.roleName}</strong> on the event <strong style="color:#e5e7eb;">${params.eventName}</strong> in mmnt. Cue.
              </p>
              <p style="margin:0 0 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                Use the link below to view your event workspace and see what's next on the show.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding:0 24px 24px 24px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#38bdf8" style="border-radius:999px;">
                    <a href="${params.actionUrl}"
                       style="display:inline-block; padding:10px 22px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; font-weight:500; text-decoration:none; color:#020617;">
                      Open event in mmnt. Cue
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Secondary -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <p style="margin:0 0 8px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; line-height:1.7; color:#6b7280;">
                Direct link:
              </p>
              <p style="margin:0 0 16px; font-family:monospace; font-size:12px; word-break:break-all; color:#9ca3af;">
                ${params.actionUrl}
              </p>
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; line-height:1.6; color:#4b5563;">
                If you think this change was made in error, contact your event admin or reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px 24px; border-top:1px solid #111827;">
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; color:#4b5563;">
                &copy; ${params.year} mmnt. Cue. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invite function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract and decode JWT to get user ID (JWT is already verified by Supabase when verify_jwt=true)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    
    if (!userId) {
      console.error("No user ID in token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create Supabase client with service role for database queries
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const requestBody: InviteRequest = await req.json();
    const { email, showId, showName, inviterName, role, userName } = requestBody;
    
    // Input validation
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isValidUUID(showId)) {
      return new Response(JSON.stringify({ error: "Invalid show ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify user has permission to invite to this show
    const { data: membership, error: memberError } = await supabase
      .from('show_members')
      .select('role')
      .eq('show_id', showId)
      .eq('user_id', userId)
      .single();

    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('user_id')
      .eq('id', showId)
      .single();

    const isOwner = show?.user_id === userId;
    const isEditorOrOwner = membership?.role === 'owner' || membership?.role === 'editor';

    if (!isOwner && !isEditorOrOwner) {
      console.error("Permission denied for user:", userId, "on show:", showId);
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sanitize string inputs
    const safeShowName = sanitizeString(showName, 200);
    const safeInviterName = sanitizeString(inviterName, 100);
    const safeUserName = userName ? sanitizeString(userName, 100) : undefined;
    const safeRole = sanitizeString(role, 50);
    
    console.log("Sending invite to:", email, "for show:", safeShowName);

    // Construct the invite link
    const siteUrl = Deno.env.get("SITE_URL") || "https://lovable.dev";
    const inviteLink = `${siteUrl}/show/${showId}`;

    // Determine email type based on whether user exists
    const displayName = safeUserName || email.split("@")[0];
    const year = getCurrentYear();

    // Send the invite email with branded template
    const emailResponse = await resend.emails.send({
      from: "mmnt. Cue <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to collaborate on "${safeShowName}"`,
      html: generateInvitationEmail({
        userName: displayName,
        inviterName: safeInviterName,
        eventName: safeShowName,
        actionUrl: inviteLink,
        year,
      }),
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
