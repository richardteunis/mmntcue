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

interface WorkspaceInviteRequest {
  email: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}

const getCurrentYear = () => new Date().getFullYear();

const generateWorkspaceInvitationEmail = (params: {
  inviterName: string;
  workspaceName: string;
  role: string;
  actionUrl: string;
  year: number;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>You're Invited to a Workspace on mmnt. Cue</title>
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
                You've been invited to join a workspace
              </h1>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding:8px 24px 0 24px; text-align:left;">
              <p style="margin:0 0 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                <strong style="color:#e5e7eb;">${params.inviterName}</strong> has invited you to join the workspace <strong style="color:#e5e7eb;">${params.workspaceName}</strong> as a <strong style="color:#e5e7eb;">${params.role}</strong>.
              </p>
              <p style="margin:0 0 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                As a workspace member, you'll have access to all shows and resources shared within the workspace.
              </p>
              <p style="margin:0 0 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                Click the button below to accept the invitation and get started.
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-workspace-invite function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract and decode JWT to get user ID
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

    const requestBody: WorkspaceInviteRequest = await req.json();
    const { email, workspaceId, workspaceName, inviterName, role } = requestBody;
    
    // Input validation
    if (!isValidEmail(email)) {
      console.error("Invalid email format:", email);
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isValidUUID(workspaceId)) {
      console.error("Invalid workspace ID format:", workspaceId);
      return new Response(JSON.stringify({ error: "Invalid workspace ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify user has permission to invite to this workspace (owner or admin)
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      console.error("User not a member of workspace:", memberError);
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin';
    if (!isOwnerOrAdmin) {
      console.error("User lacks permission to invite:", membership.role);
      return new Response(JSON.stringify({ error: "Permission denied - must be owner or admin" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sanitize string inputs
    const safeWorkspaceName = sanitizeString(workspaceName, 200);
    const safeInviterName = sanitizeString(inviterName, 100);
    const safeRole = sanitizeString(role, 50);
    
    console.log("Sending workspace invite to:", email, "for workspace:", safeWorkspaceName);

    // Construct the invite link using SITE_URL from env
    let siteUrl = Deno.env.get("SITE_URL") || "https://cue.mmnt.dev";
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = `https://${siteUrl}`;
    }
    siteUrl = siteUrl.replace(/\/$/, '');
    
    // Link to auth page - user will be redirected after login
    const inviteLink = `${siteUrl}/auth?workspace=${workspaceId}&inviter=${encodeURIComponent(safeInviterName)}`;
    
    console.log("Constructed invite link:", inviteLink);

    const year = getCurrentYear();

    // Send the invite email
    const emailResponse = await resend.emails.send({
      from: `${safeInviterName} via mmnt. Cue <invites@cue.mmnt.dev>`,
      reply_to: "support@mmnt.dev",
      to: [email],
      subject: `${safeInviterName} invited you to join "${safeWorkspaceName}" workspace`,
      html: generateWorkspaceInvitationEmail({
        inviterName: safeInviterName,
        workspaceName: safeWorkspaceName,
        role: safeRole,
        actionUrl: inviteLink,
        year,
      }),
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "High",
      },
    });

    console.log("Workspace invite email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending workspace invite email:", error);
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
