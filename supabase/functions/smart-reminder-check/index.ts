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

    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select(`
        id, title, portal_token, advisor_id, client_id,
        last_reminder_sent_at, last_client_activity_at,
        clients!cases_client_id_fkey(full_name, email),
        profiles!cases_advisor_id_fkey(email, name)
      `)
      .eq('status', 'פתוח');

    if (casesError) {
      console.error("Error fetching cases:", casesError);
      throw new Error("Failed to fetch cases");
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const fortyEightHoursAgo = new Date(now);
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    let sentCount = 0;
    const results: any[] = [];

    for (const caseData of cases || []) {
      const clientData = caseData.clients as any;
      const advisorProfile = caseData.profiles as any;
      if (!clientData?.email) continue;

      const { data: docs, error: docsError } = await supabase
        .from('case_documents')
        .select('doc_name, review_status, due_date, advisor_note')
        .eq('case_id', caseData.id)
        .in('review_status', ['חסר', 'לא תקין']);

      if (docsError || !docs || docs.length === 0) continue;

      const hasDueTomorrow = docs.some(doc => {
        if (!doc.due_date) return false;
        return new Date(doc.due_date) <= tomorrow;
      });

      const lastActivity = caseData.last_client_activity_at ? new Date(caseData.last_client_activity_at) : null;
      const noRecentActivity = !lastActivity || lastActivity < fortyEightHoursAgo;

      if (!hasDueTomorrow && !noRecentActivity) continue;

      const missingCount = docs.length;
      const headerText = missingCount === 1 ? 'נשאר עוד מסמך אחד' : `נותרו ${missingCount} מסמכים להשלמה`;

      const docsHtml = docs.map(doc => {
        const statusText = doc.review_status === 'לא תקין' ? 'נדחה - נדרש העלאה מחדש' : 'טרם הועלה';
        const noteHtml = doc.advisor_note ? `<br/><span style="color: #666; font-size: 14px;">הערה: ${doc.advisor_note}</span>` : '';
        const dueDateHtml = doc.due_date ? `<br/><span style="color: #DC2626; font-size: 14px;">תאריך יעד: ${new Date(doc.due_date).toLocaleDateString('he-IL')}</span>` : '';
        return `
          <li style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <strong>${doc.doc_name}</strong>
            <br/><span style="color: ${doc.review_status === 'לא תקין' ? '#DC2626' : '#F59E0B'};">${statusText}</span>
            ${noteHtml}${dueDateHtml}
          </li>
        `;
      }).join('');

      const portalUrl = `https://siman-sheer-shlem.lovable.app/portal/${caseData.portal_token}`;

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY!,
        },
        body: JSON.stringify({
          sender: { name: "EasyDocs", email: "dg.smarter1@gmail.com" },
          ...(advisorProfile?.email ? { replyTo: { email: advisorProfile.email, name: advisorProfile.name || "יועץ" } } : {}),
          to: [{ email: clientData.email, name: clientData.full_name }],
          subject: `תזכורת: ${headerText} - ${caseData.title}`,
          htmlContent: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a2e;">שלום ${clientData.full_name},</h1>
              <p style="font-size: 18px; line-height: 1.6; color: #2563EB; font-weight: bold;">${headerText}</p>
              <p style="font-size: 16px; line-height: 1.6;">לתיק: <strong>${caseData.title}</strong></p>
              <h2 style="color: #333; margin-top: 30px;">המסמכים הנדרשים:</h2>
              <ul style="list-style: none; padding: 0; margin: 15px 0;">${docsHtml}</ul>
              <p style="margin-top: 30px;">
                <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">להעלאת המסמכים</a>
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999;">הודעה זו נשלחה באופן אוטומטי. אין צורך להשיב למייל זה.</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        sentCount++;
        await supabase.from('cases').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', caseData.id);
        await supabase.from('case_activity_log').insert({
          case_id: caseData.id, action_type: 'שליחת תזכורת',
          description: `תזכורת אוטומטית נשלחה ל-${clientData.email} עם ${missingCount} מסמכים חסרים`,
        });
        await supabase.from('email_logs').insert({
          advisor_id: caseData.advisor_id, case_id: caseData.id, client_id: caseData.client_id,
          email_type: 'תזכורת יומית', to_email: clientData.email,
          subject: `תזכורת: ${headerText} - ${caseData.title}`,
          body_preview: `${headerText}: ${docs.map(d => d.doc_name).join(', ')}`
        });
        results.push({ caseId: caseData.id, clientEmail: clientData.email, reason: hasDueTomorrow ? 'due_tomorrow' : 'no_activity', docCount: missingCount });
      } else {
        const errorData = await res.text();
        console.error(`Failed to send to ${clientData.email}:`, errorData);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sentCount, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in smart reminder check:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
