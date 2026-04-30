import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

    if (docsError) throw docsError;

    const clientDocs = new Map<string, any>();
    for (const doc of rejectedDocs || []) {
      const caseData = (doc as any).cases;
      const clientData = caseData?.clients;
      if (!clientData?.email) continue;
      const key = caseData.id;
      if (!clientDocs.has(key)) {
        clientDocs.set(key, {
          caseId: caseData.id, clientEmail: clientData.email, clientName: clientData.full_name,
          caseTitle: caseData.title, portalToken: caseData.portal_token, advisorId: caseData.advisor_id, clientId: clientData.id, documents: []
        });
      }
      clientDocs.get(key)!.documents.push({ doc_name: doc.doc_name, rejection_reason: (doc as any).advisor_note || 'לא צוינה סיבה', case_title: caseData.title });
    }

    let emailsSent = 0;
    for (const [, data] of clientDocs) {
      const portalUrl = `https://easydocs.tech/portal/${data.portalToken}`;
      const { data: advisorProfile } = await supabase.from('profiles').select('name').eq('user_id', data.advisorId).single();

      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "daily-rejection",
          recipientEmail: data.clientEmail,
          idempotencyKey: `rejection-${data.caseId}-${new Date().toISOString().slice(0, 10)}`,
          templateData: { clientName: data.clientName, advisorName: advisorProfile?.name, portalUrl, rejectedDocs: data.documents },
        },
      });
      if (!error) {
        emailsSent++;
        await supabase.from('email_logs').insert({
          advisor_id: data.advisorId, case_id: data.caseId, client_id: data.clientId,
          email_type: 'מסמך נדחה', to_email: data.clientEmail,
          subject: `נדרש תיקון מסמכים - ${data.caseTitle}`,
          body_preview: `מסמכים שנדחו: ${data.documents.map((d: any) => d.doc_name).join(', ')}`
        });
      } else {
        console.error("Failed to send rejection email:", error);
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent, totalClients: clientDocs.size }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in daily rejection emails:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});