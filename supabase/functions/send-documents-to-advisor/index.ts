import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchFileAsBase64(url: string): Promise<{ content: string; size: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch file: ${url} - ${res.status}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";

    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }

    return { content: btoa(binary), size: uint8Array.length };
  } catch (err) {
    console.error(`Error fetching file ${url}:`, err);
    return null;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.recipientEmail && body.documents) {
      const {
        recipientName,
        recipientEmail,
        caseTitle,
        advisorName,
        advisorEmail,
        senderDisplayName,
        note,
        documents,
      } = body;

      if (!documents || documents.length === 0) {
        return new Response(JSON.stringify({ error: "לא נבחרו מסמכים" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const attachments: { name: string; content: string }[] = [];
      const failedDocs: string[] = [];

      for (const doc of documents) {
        const fileData = await fetchFileAsBase64(doc.file_url);
        if (fileData) {
          attachments.push({
            name: doc.file_name || `${doc.doc_name}.pdf`,
            content: fileData.content,
          });
        } else {
          failedDocs.push(doc.doc_name);
        }
      }

      if (attachments.length === 0) {
        return new Response(JSON.stringify({ error: "לא ניתן היה להוריד את הקבצים" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const effectiveSenderName = senderDisplayName || advisorName || "EasyDocs";
      const effectiveReplyToName = senderDisplayName || advisorName || "יועץ";
      const docListHtml = documents
        .map(
          (doc: { doc_name: string }) => `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${doc.doc_name}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
                ${failedDocs.includes(doc.doc_name) ? '<span style="color: #ef4444;">שגיאה בהורדה</span>' : "✅ מצורף"}
              </td>
            </tr>
          `,
        )
        .join("");
      const noteHtml = note
        ? `<p style="margin: 16px 0; padding: 12px; background: #f3f4f6; border-radius: 8px; direction: rtl;">${note}</p>`
        : "";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">מסמכים לתיק: ${caseTitle}</h2>
          <p>שלום ${recipientName || "נמען"},</p>
          <p>מצורפים מסמכים לתיק <strong>${caseTitle}</strong>:</p>
          ${noteHtml}
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">מסמך</th>
                <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">סטטוס</th>
              </tr>
            </thead>
            <tbody>${docListHtml}</tbody>
          </table>
          <p style="font-size: 13px; color: #666;">הקבצים מצורפים למייל זה.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">נשלח מ-${effectiveSenderName}</p>
        </div>
      `;

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY!,
        },
        body: JSON.stringify({
          sender: { name: effectiveSenderName, email: "dg.smarter1@gmail.com" },
          ...(advisorEmail
            ? { replyTo: { email: advisorEmail, name: effectiveReplyToName } }
            : {}),
          to: [{ email: recipientEmail, name: recipientName || "נמען" }],
          subject: `מסמכים לתיק: ${caseTitle}`,
          htmlContent,
          attachment: attachments,
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Brevo error: ${errorData}`);
      }

      return new Response(JSON.stringify({ success: true, failedDocs }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { clientName, caseTitle, documentNames, advisorEmail, advisorName } = body;

    if (!documentNames || documentNames.length === 0) {
      return new Response(JSON.stringify({ error: "חסרים פרטים נדרשים" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!advisorEmail) {
      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const docsHtml = documentNames
      .map(
        (docName: string) => `
          <li style="padding: 8px 0; border-bottom: 1px solid #eee;">${docName}</li>
        `,
      )
      .join("");

    let emailSent = false;

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY!,
        },
        body: JSON.stringify({
          sender: { name: "EasyDocs", email: "dg.smarter1@gmail.com" },
          to: [{ email: advisorEmail, name: advisorName || "יועץ" }],
          subject: `הלקוח ${clientName} העלה מסמכים - ${caseTitle}`,
          htmlContent: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a2e;">שלום ${advisorName || "יועץ יקר"},</h1>
              <p style="font-size: 16px; line-height: 1.6;">
                הלקוח <strong>${clientName}</strong> העלה מסמכים לתיק: <strong>${caseTitle}</strong>
              </p>
              <h2 style="color: #333; margin-top: 30px;">המסמכים שהועלו:</h2>
              <ul style="list-style: none; padding: 0; margin: 15px 0;">
                ${docsHtml}
              </ul>
              <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
                כדי לצפות במסמכים, היכנס למערכת ופתח את התיק.
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999;">
                הודעה זו נשלחה באופן אוטומטי. אין צורך להשיב למייל זה.
              </p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        emailSent = true;
        console.log("Notification email sent to advisor:", advisorEmail);
      } else {
        const errorData = await res.text();
        console.error("Brevo API error:", errorData);
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return new Response(JSON.stringify({ success: true, emailSent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});