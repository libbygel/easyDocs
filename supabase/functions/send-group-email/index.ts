import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GroupRecipient {
  email: string;
  name: string;
  portalLink?: string;
}

interface GroupEmailRequest {
  recipients: GroupRecipient[];
  subject: string;
  message: string;
  advisorName?: string;
  advisorEmail?: string;
}

function buildHtml(name: string, message: string, advisorName: string | undefined, portalLink?: string) {
  const portalBlock = portalLink
    ? `<div style="text-align:center; margin:24px 0;">
         <a href="${portalLink}" style="display:inline-block; padding:12px 28px; background:#1E3A8A; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">פתח פורטל אישי</a>
       </div>`
    : '';
  return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#fff;">
      <h2 style="color:#1E3A8A;">שלום ${name},</h2>
      ${advisorName ? `<p style="color:#555; margin:0 0 12px;">מאת: <strong>${advisorName}</strong></p>` : ''}
      <div style="font-size:15px; line-height:1.7; color:#333; white-space:pre-wrap;">${message}</div>
      ${portalBlock}
      <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
      <p style="font-size:12px; color:#999;">הודעה זו נשלחה מ-EasyDocs.</p>
    </div>
  `;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, message, advisorName, advisorEmail }: GroupEmailRequest = await req.json();

    if (!recipients || recipients.length === 0 || !subject || !message) {
      return new Response(JSON.stringify({ error: "חסרים פרטים" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const r of recipients) {
      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY! },
          body: JSON.stringify({
            sender: { name: advisorName ? `${advisorName} | EasyDocs` : "EasyDocs", email: "dg.smarter1@gmail.com" },
            ...(advisorEmail ? { replyTo: { email: advisorEmail, name: advisorName || "יועץ" } } : {}),
            to: [{ email: r.email, name: r.name }],
            subject,
            htmlContent: buildHtml(r.name, message, advisorName, r.portalLink),
          }),
        });
        if (res.ok) sentCount++;
        else { failedCount++; console.error("Brevo error for", r.email, await res.text()); }
      } catch (e) {
        failedCount++;
        console.error("Send failed for", r.email, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sentCount, failedCount, totalCount: recipients.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Group email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});