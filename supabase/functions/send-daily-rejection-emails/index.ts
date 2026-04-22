import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: rejectedDocs, error: docsError } = await supabase
      .from('case_documents')
      .select(`
        id, doc_name, advisor_note, case_id,
        cases!case_documents_case_id_fkey(
          id, title, portal_token, client_id, advisor_id,
          clients!cases_client_id_fkey(id, full_name, email)
        )
      `)
      .eq('review_status', 'לא תקין')
      .eq('sent_status', 'נשלח');

    if (docsError) {
      console.error("Error fetching rejected documents:", docsError);
      return new Response(
        JSON.stringify({ error: "Error fetching documents" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${rejectedDocs?.length || 0} rejected documents`);

    const clientDocs = new Map<string, {
      clientEmail: string; clientName: string; caseTitle: string;
      portalToken: string; advisorId: string; documents: { name: string; note: string }[];
    }>();

    for (const doc of rejectedDocs || []) {
      const caseData = doc.cases as any;
      const clientData = caseData?.clients;
      if (!clientData?.email) continue;

      const key = `${caseData.id}`;
      if (!clientDocs.has(key)) {
        clientDocs.set(key, {
          clientEmail: clientData.email, clientName: clientData.full_name,
          caseTitle: caseData.title, portalToken: caseData.portal_token, advisorId: caseData.advisor_id, documents: []
        });
      }
      clientDocs.get(key)!.documents.push({ name: doc.doc_name, note: doc.advisor_note || 'לא צוינה סיבה' });
    }

    console.log(`Sending emails to ${clientDocs.size} clients`);
    let emailsSent = 0;

    for (const [caseId, data] of clientDocs) {
      const docsHtml = data.documents.map(d => `
        <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
          <strong>${d.name}</strong><br/>
          <span style="color: #DC2626;">הערה: ${d.note}</span>
        </li>
      `).join('');

      const portalUrl = `https://siman-sheer-shlem.lovable.app/portal/${data.portalToken}`;

      // Fetch advisor email for replyTo
      const { data: advisorProfile } = await supabase
        .from('profiles').select('email, name').eq('user_id', data.advisorId).single();

      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY!,
          },
          body: JSON.stringify({
            sender: { name: "EasyDocs", email: "dg.smarter1@gmail.com" },
            ...(advisorProfile?.email ? { replyTo: { email: advisorProfile.email, name: advisorProfile.name || "יועץ" } } : {}),
            to: [{ email: data.clientEmail, name: data.clientName }],
            subject: `נדרש תיקון מסמכים - ${data.caseTitle}`,
            htmlContent: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #DC2626;">שלום ${data.clientName},</h1>
                <p style="font-size: 16px; line-height: 1.6;">
                  חלק מהמסמכים שהעלית לתיק <strong>${data.caseTitle}</strong> נדחו וצריכים לטפל בהם:
                </p>
                <h2 style="color: #333; margin-top: 30px;">מסמכים שנדחו:</h2>
                <ul style="list-style: none; padding: 0; margin: 15px 0;">${docsHtml}</ul>
                <p style="margin-top: 30px;">
                  <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    להעלאת מסמכים מתוקנים
                  </a>
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #999;">הודעה זו נשלחה באופן אוטומטי. אין צורך להשיב למייל זה.</p>
              </div>
            `,
          }),
        });

        if (res.ok) {
          emailsSent++;
          console.log(`Email sent to ${data.clientEmail}`);
          await supabase.from('email_logs').insert({
            advisor_id: (await supabase.from('cases').select('advisor_id').eq('id', caseId).single()).data?.advisor_id,
            case_id: caseId,
            client_id: (await supabase.from('cases').select('client_id').eq('id', caseId).single()).data?.client_id,
            email_type: 'מסמך נדחה',
            to_email: data.clientEmail,
            subject: `נדרש תיקון מסמכים - ${data.caseTitle}`,
            body_preview: `מסמכים שנדחו: ${data.documents.map(d => d.name).join(', ')}`
          });
        } else {
          const errorData = await res.text();
          console.error(`Failed to send email to ${data.clientEmail}:`, errorData);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${data.clientEmail}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent, totalClients: clientDocs.size }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in daily rejection emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
