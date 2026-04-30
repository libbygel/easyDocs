import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendReminderRequest {
  clientName: string;
  clientEmail: string;
  caseTitle: string;
  portalToken: string;
  personalMessage?: string;
  advisorEmail?: string;
  advisorName?: string;
  missingDocs: { doc_name: string; review_status: string; due_date?: string | null; advisor_note?: string | null }[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, caseTitle, portalToken, personalMessage, advisorEmail, advisorName, missingDocs }: SendReminderRequest = await req.json();

    if (!clientEmail || !missingDocs || missingDocs.length === 0) {
      return new Response(
        JSON.stringify({ error: "חסרים פרטים נדרשים" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build document list HTML
    const docsHtml = missingDocs.map(doc => {
      const isRejected = doc.review_status === 'לא תקין';
      const statusText = isRejected ? '❌ נדחה - נדרש העלאה מחדש' : '⏳ טרם הועלה';
      const statusColor = isRejected ? '#dc2626' : '#d97706';
      const noteHtml = doc.advisor_note ? `<p style="color: #64748b; font-size: 13px; margin: 6px 0 0; padding-right: 8px; border-right: 2px solid #e2e8f0;">💬 ${doc.advisor_note}</p>` : '';
      const dueDateHtml = doc.due_date ? `<p style="color: #dc2626; font-size: 13px; margin: 4px 0 0;">📅 תאריך יעד: ${new Date(doc.due_date).toLocaleDateString('he-IL')}</p>` : '';
      return `
        <div style="background: #ffffff; padding: 14px 16px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${doc.doc_name}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: ${statusColor}; font-weight: 500;">${statusText}</p>
          ${noteHtml}
          ${dueDateHtml}
        </div>
      `;
    }).join('');

    const origin = req.headers.get('origin') || 'https://siman-sheer-shlem.lovable.app';
    const portalUrl = `${origin}/portal/${portalToken}`;

    const subject = advisorName
      ? `תזכורת מ${advisorName}: מסמכים חסרים לתיק ${caseTitle}`
      : `תזכורת: מסמכים חסרים לתיק ${caseTitle}`;
    const fromName = advisorName ? `${advisorName} דרך EasyDocs` : "EasyDocs";
    console.log("Sending reminder email:", { to: clientEmail, subject, docsCount: missingDocs.length, provider: RESEND_API_KEY ? "Resend" : "Brevo" });

    const htmlContent = `
      <div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">📋 EasyDocs</h1>
          <p style="color: #a0aec0; margin: 8px 0 0; font-size: 14px;">${advisorName ? `מאת ${advisorName}` : 'מערכת ניהול מסמכים'}</p>
        </div>
        <div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="color: #1a1a2e; margin: 0 0 8px; font-size: 20px;">שלום ${clientName},</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            זוהי תזכורת${advisorName ? ` מ-<strong style="color: #1a1a2e;">${advisorName}</strong>` : ''} בנוגע למסמכים שטרם הועלו לתיק: <strong style="color: #1a1a2e;">${caseTitle}</strong>
          </p>
          ${personalMessage ? `
            <div style="background: #eff6ff; border-right: 4px solid #3b82f6; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
              <p style="color: #1e40af; font-size: 14px; margin: 0 0 4px; font-weight: 600;">💬 הודעה מהיועץ:</p>
              <p style="color: #1e3a5f; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${personalMessage}</p>
            </div>
          ` : ''}
          <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #334155; margin: 0 0 16px; font-size: 16px; font-weight: 600;">📄 מסמכים שנדרשים (${missingDocs.length}):</h3>
            ${docsHtml}
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${portalUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
              העלאת מסמכים ←
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
            לחץ על הכפתור כדי לעבור לפורטל ולהעלות את המסמכים הנדרשים
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 20px 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
            הודעה זו נשלחה באופן אוטומטי ממערכת סימן שיר. אין צורך להשיב למייל זה.
          </p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: advisorName ? `${advisorName} | EasyDocs` : "EasyDocs", email: "dg.smarter1@gmail.com" },
        ...(advisorEmail ? { replyTo: { email: advisorEmail, name: advisorName || "יועץ" } } : {}),
        to: [{ email: clientEmail, name: clientName }],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Brevo API error:", errorData);
      return new Response(
        JSON.stringify({ error: "שגיאה בשליחת המייל" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResult = await res.json();
    console.log("Reminder email sent successfully via Brevo:", emailResult);

    return new Response(
      JSON.stringify({ success: true, documentCount: missingDocs.length, sentTo: clientEmail }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
