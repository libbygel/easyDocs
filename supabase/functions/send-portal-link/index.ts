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
      clientEmail,
      caseTitle,
      portalLink,
      advisorEmail,
      advisorName: advisorNameRaw,
      emailType,
      caseId: caseIdRaw,
    } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, supabaseServiceKey);

    let advisorName = advisorNameRaw;
    if (!advisorName && advisorEmail) {
      try {
        const { data } = await supa.from("profiles").select("name, sender_display_name").eq("email", advisorEmail).maybeSingle();
        advisorName = (data as any)?.sender_display_name || (data as any)?.name || "";
      } catch (_) {}
    }

    if (!clientEmail || !portalLink) {
      return new Response(JSON.stringify({ error: "חסרים פרטים נדרשים" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Normalize clientName: strip invisible/control Unicode characters that can cause rendering artifacts
    const cleanClientName = (clientName || '')
      .normalize('NFC')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g, '')
      .trim();

    let caseId: string | null = typeof caseIdRaw === "string" && caseIdRaw ? caseIdRaw : null;
    if (!caseId) {
      try {
        const token = new URL(portalLink).pathname.split("/").filter(Boolean).pop();
        if (token) {
          const { data: caseByToken } = await supa
            .from("cases")
            .select("id")
            .eq("portal_token", token)
            .maybeSingle();
          caseId = (caseByToken as any)?.id || null;
        }
      } catch {
        // Ignore token parsing errors and continue without documents list
      }
    }

    let requiredDocuments: string[] = [];
    if (caseId) {
      const { data: docs } = await supa
        .from("case_documents")
        .select("doc_name")
        .eq("case_id", caseId)
        .eq("required", true)
        .order("display_order", { ascending: true });

      requiredDocuments = ((docs || []) as any[])
        .map((d) => String(d.doc_name || "").trim())
        .filter(Boolean);
    }

    const { data, error } = await supa.functions.invoke("send-transactional-email", {
      body: {
        templateName: "portal-link",
        recipientEmail: clientEmail,
        idempotencyKey: `portal-${portalLink}-${emailType || "reminder"}-${Date.now()}`,
        senderName: advisorName || undefined,
        replyTo: advisorEmail || undefined,
        templateData: {
          clientName: cleanClientName,
          caseTitle,
          portalLink,
          advisorName,
          emailType: emailType || "reminder",
          requiredDocuments,
        },
      },
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error sending portal link:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});