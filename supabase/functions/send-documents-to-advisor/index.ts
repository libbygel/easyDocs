import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      clientName,
      caseTitle,
      documentNames = [],
      advisorEmail,
      advisorName,
      note,
      mode, // 'client-submission' | undefined
      portalUrl,
    } = await req.json();

    if (!advisorEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "missing advisorEmail" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, supabaseServiceKey);

    const documents = (Array.isArray(documentNames) ? documentNames : []).map((doc_name: string) => ({ doc_name }));
    const subjectTitle = caseTitle || "מסמך חדש";

    const isClientSubmission = mode === 'client-submission';
    const templateName = isClientSubmission ? 'client-submission-notification' : 'documents-to-advisor';
    const templateData: Record<string, any> = isClientSubmission
      ? {
          recipientName: advisorName || 'יועץ',
          clientName: clientName || 'לקוח',
          caseTitle: subjectTitle,
          documents,
          portalUrl,
        }
      : {
          recipientName: advisorName || 'יועץ',
          caseTitle: subjectTitle,
          senderName: clientName || 'EasyDocs',
          note: note || (clientName ? `הלקוח ${clientName} שלח מסמכים חדשים` : 'התקבלו מסמכים חדשים'),
          documents,
        };

    const { data, error } = await supa.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: advisorEmail,
        idempotencyKey: `client-upload-${advisorEmail}-${subjectTitle}-${Date.now()}`,
        senderName: "EasyDocs",
        templateData,
      },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("send-documents-to-advisor error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
