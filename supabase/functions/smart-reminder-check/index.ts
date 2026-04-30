import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, supabaseServiceKey);

    // Find documents with due_date in 2 days that are still missing
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const dateStr = twoDaysFromNow.toISOString().split("T")[0];

    const { data: docs } = await supa
      .from("documents")
      .select("id, doc_name, due_date, case_id, cases(id, case_title, client_id, advisor_id, clients(name, email, portal_password))")
      .eq("due_date", dateStr)
      .in("review_status", ["ממתין", "לא תקין"]);

    let sent = 0;
    const grouped = new Map<string, any>();
    for (const d of docs || []) {
      const c: any = (d as any).cases;
      if (!c?.clients?.email) continue;
      const key = c.id;
      if (!grouped.has(key)) {
        grouped.set(key, { case: c, docs: [] });
      }
      grouped.get(key).docs.push(d);
    }

    for (const { case: c, docs: caseDocs } of grouped.values()) {
      const portalLink = `https://easydocs.tech/portal/${c.clients.portal_password || c.client_id}`;
      await supa.functions.invoke("send-reminder-to-client", {
        body: {
          clientName: c.clients.name,
          clientEmail: c.clients.email,
          caseTitle: c.case_title,
          portalLink,
          missingDocs: caseDocs,
          advisorEmail: null,
        },
      });
      sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("smart-reminder-check error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});