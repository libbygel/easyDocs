import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendPortalLinkRequest {
  clientName: string;
  clientEmail: string;
  caseTitle: string;
  portalLink: string;
  advisorEmail?: string;
  advisorName?: string;
  emailType?: "new_case" | "reminder" | "new_document";
}

function getEmailContent(
  emailType: string,
  clientName: string,
  caseTitle: string,
  portalLink: string,
  advisorName?: string,
): { subject: string; body: string } {
  const fromLine = advisorName
    ? `<p style="font-size: 15px; color: #555; margin: 4px 0 16px;">מאת: <strong>${advisorName}</strong></p>`
    : '';
  const buttonHtml = `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalLink}" style="background-color: #4361ee; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
        העלאת מסמכים
      </a>
    </div>
    <p style="font-size: 14px; color: #666;">
      או העתק/י את הקישור הבא:<br/>
      <a href="${portalLink}" style="color: #4361ee;">${portalLink}</a>
    </p>
  `;

  const footer = `
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999;">
      הודעה זו נשלחה באופן אוטומטי. אין צורך להשיב למייל זה.
    </p>
  `;

  switch (emailType) {
    case "new_case":
      return {
        subject: advisorName
          ? `${advisorName} פתח/ה עבורך תיק חדש - ${caseTitle}`
          : `נפתח תיק חדש - ${caseTitle}`,
        body: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e;">שלום ${clientName},</h1>
            ${fromLine}
            <p style="font-size: 16px; line-height: 1.6;">
              נפתח עבורך תיק חדש${advisorName ? ` על ידי <strong>${advisorName}</strong>` : ''}: <strong>${caseTitle}</strong>
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              להלן רשימת המסמכים הנדרשים. אנא לחץ/י על הכפתור למטה כדי להתחיל בהעלאה:
            </p>
            ${buttonHtml}
            ${footer}
          </div>
        `,
      };

    case "new_document":
      return {
        subject: advisorName
          ? `${advisorName} הוסיף/ה מסמך חדש לתיק ${caseTitle}`
          : `נוסף מסמך חדש לתיק - ${caseTitle}`,
        body: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e;">שלום ${clientName},</h1>
            ${fromLine}
            <p style="font-size: 16px; line-height: 1.6;">
              ${advisorName ? `<strong>${advisorName}</strong> הוסיף/ה` : 'נוסף'} מסמך חדש לתיק <strong>${caseTitle}</strong> שדורש את טיפולך.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              לחץ/י על הכפתור למטה כדי לצפות ולהעלות את המסמכים:
            </p>
            ${buttonHtml}
            ${footer}
          </div>
        `,
      };

    case "reminder":
    default:
      return {
        subject: `תזכורת: מסמכים ממתינים - ${caseTitle}`,
        body: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e;">שלום ${clientName},</h1>
            ${fromLine}
            <p style="font-size: 16px; line-height: 1.6;">
              זוהי תזכורת${advisorName ? ` מ<strong>${advisorName}</strong>` : ''} בנוגע לתיק <strong>${caseTitle}</strong> — ישנם מסמכים שעדיין ממתינים להעלאה.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              לחץ/י על הכפתור למטה כדי להעלות את המסמכים:
            </p>
            ${buttonHtml}
            ${footer}
          </div>
        `,
      };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, caseTitle, portalLink, advisorEmail, advisorName, emailType }: SendPortalLinkRequest = await req.json();

    if (!clientEmail || !portalLink) {
      return new Response(
        JSON.stringify({ error: "חסרים פרטים נדרשים" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, body } = getEmailContent(emailType || "reminder", clientName, caseTitle, portalLink, advisorName);

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
        htmlContent: body,
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

    const data = await res.json();
    console.log("Email sent successfully via Brevo:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
