import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactInquiry {
  name: string;
  phone: string;
  email: string;
  notes?: string;
  officeSize?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, phone, email, notes, officeSize }: ContactInquiry = await req.json();

    if (!name || !phone || !email) {
      return new Response(
        JSON.stringify({ error: "חסרים פרטים נדרשים: שם, טלפון ומייל" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic length limits
    if (name.length > 200 || phone.length > 50 || email.length > 255 || (notes && notes.length > 2000) || (officeSize && officeSize.length > 100)) {
      return new Response(
        JSON.stringify({ error: "אחד מהשדות ארוך מדי" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const subject = `🔔 פנייה חדשה מ-EasyDocs: ${escape(name)}`;
    const body = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#f9fafb;">
        <div style="background:#1E3A8A; color:#fff; padding:20px; border-radius:10px 10px 0 0;">
          <h1 style="margin:0;font-size:22px;">📩 פנייה חדשה מדף הנחיתה</h1>
        </div>
        <div style="background:#fff; padding:24px; border-radius:0 0 10px 10px; border:1px solid #e5e7eb;">
          <p style="font-size:15px;color:#374151;margin-top:0;">התקבלה פנייה חדשה לקבלת הצעה מותאמת:</p>
          <table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:15px;">
            <tr><td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold; width:120px;">שם:</td><td style="padding:10px; border-bottom:1px solid #eee;">${escape(name)}</td></tr>
            <tr><td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold;">טלפון:</td><td style="padding:10px; border-bottom:1px solid #eee;"><a href="tel:${escape(phone)}" style="color:#1E3A8A;">${escape(phone)}</a></td></tr>
            <tr><td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold;">מייל:</td><td style="padding:10px; border-bottom:1px solid #eee;"><a href="mailto:${escape(email)}" style="color:#1E3A8A;">${escape(email)}</a></td></tr>
            ${officeSize ? `<tr><td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold;">גודל משרד:</td><td style="padding:10px; border-bottom:1px solid #eee;">${escape(officeSize)}</td></tr>` : ""}
            ${notes ? `<tr><td style="padding:10px; font-weight:bold; vertical-align:top;">הערות:</td><td style="padding:10px; white-space:pre-wrap;">${escape(notes)}</td></tr>` : ""}
          </table>
          <p style="margin-top:24px;font-size:13px;color:#6b7280;">נשלח אוטומטית מ-EasyDocs Landing Page · ${new Date().toLocaleString("he-IL")}</p>
        </div>
      </div>
    `;

    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "שירות המייל אינו מוגדר כרגע" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "EasyDocs Leads", email: "dg.smarter1@gmail.com" },
        replyTo: { email, name },
        to: [{ email: "dv4343@gmail.com", name: "EasyDocs" }],
        subject,
        htmlContent: body,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Brevo API error:", errorData);
      return new Response(
        JSON.stringify({ error: "שגיאה בשליחת הפנייה" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await res.json();
    console.log("Inquiry sent successfully via Brevo:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending inquiry:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);