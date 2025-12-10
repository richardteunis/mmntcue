import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// mmnt. Cue logo as base64 data URI for email compatibility
const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYiIGhlaWdodD0iMjYiIHZpZXdCb3g9IjAgMCAyNiAyNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iNiIgZmlsbD0iI0U5MUU2MyIgZmlsbC1vcGFjaXR5PSIwLjQ1Ii8+CjxyZWN0IHg9IjE0IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHJ4PSIzIiBmaWxsPSIjRTkxRTYzIi8+CjxyZWN0IHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgcng9IjMiIGZpbGw9IiNFOTFFNjMiLz4KPHJlY3QgeT0iMTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgcng9IjMiIGZpbGw9IiNFOTFFNjMiLz4KPC9zdmc+`;

type EmailType = 'forgot_password' | 'confirm_email' | 'added_to_show';

interface NotificationEmailRequest {
  email: string;
  type: EmailType;
  userName?: string;
  actionUrl: string;
  // For added_to_show
  roleName?: string;
  eventName?: string;
  // For forgot_password
  expirationMinutes?: number;
}

const getCurrentYear = () => new Date().getFullYear();

const generateForgotPasswordEmail = (params: {
  userName: string;
  actionUrl: string;
  expirationMinutes: number;
  year: number;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Reset your mmnt. Cue password</title>
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
                Reset your password
              </h1>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding:8px 24px 0 24px;">
              <p style="margin:0 0 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                Hi ${params.userName},
              </p>
              <p style="margin:0 0 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                We received a request to reset the password for your <strong style="color:#e5e7eb;">mmnt. Cue</strong> account.
              </p>
              <p style="margin:0 0 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                If this was you, click the button below to choose a new password. This link will expire in ${params.expirationMinutes} minutes.
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
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Secondary info -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <p style="margin:0 0 8px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; line-height:1.7; color:#6b7280;">
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 16px; font-family:monospace; font-size:12px; word-break:break-all; color:#9ca3af;">
                ${params.actionUrl}
              </p>
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; line-height:1.6; color:#4b5563;">
                If you didn't request a password reset, you can safely ignore this email.
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

const generateConfirmEmailEmail = (params: {
  userName: string;
  actionUrl: string;
  year: number;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Confirm your email for mmnt. Cue</title>
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
                Confirm your email
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
                Thanks for signing up for <strong style="color:#e5e7eb;">mmnt. Cue</strong>. To finish setting up your account, please confirm that this email address is correct.
              </p>
              <p style="margin:0 0 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; line-height:1.7; color:#9ca3af;">
                Once confirmed, you'll be ready to start building and running your shows.
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
                      Confirm email
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
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 16px; font-family:monospace; font-size:12px; word-break:break-all; color:#9ca3af;">
                ${params.actionUrl}
              </p>
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:11px; line-height:1.6; color:#4b5563;">
                If you didn't create a mmnt. Cue account, you can ignore this email.
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
  console.log("send-notification-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      type, 
      userName, 
      actionUrl, 
      roleName, 
      eventName, 
      expirationMinutes 
    }: NotificationEmailRequest = await req.json();
    
    console.log("Sending notification email type:", type, "to:", email);

    const displayName = userName || email.split("@")[0];
    const year = getCurrentYear();

    let subject: string;
    let html: string;

    switch (type) {
      case 'forgot_password':
        subject = "Reset your mmnt. Cue password";
        html = generateForgotPasswordEmail({
          userName: displayName,
          actionUrl,
          expirationMinutes: expirationMinutes || 60,
          year,
        });
        break;
      
      case 'confirm_email':
        subject = "Confirm your email for mmnt. Cue";
        html = generateConfirmEmailEmail({
          userName: displayName,
          actionUrl,
          year,
        });
        break;
      
      case 'added_to_show':
        subject = `You've been added as ${roleName} on ${eventName}`;
        html = generateAddedToShowEmail({
          userName: displayName,
          roleName: roleName || 'team member',
          eventName: eventName || 'an event',
          actionUrl,
          year,
        });
        break;
      
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "mmnt. Cue <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
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
