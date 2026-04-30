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
    const body = await req.json();
    const {
      clientName,
      clientEmail,
      caseTitle,
      portalLink: portalLinkRaw,
      portalToken,
      missingDocs = [],
      rejectedDocs = [],
      advisorEmail,
      advisorName: advisorNameRaw,
      personalMessage,
    } = body;

    const portalLink = portalLinkRaw || (portalToken ? `https://easydocs.tech/portal/${portalToken}` : null);

    if (!clientEmail || !portalLink) {
      return new Response(JSON.stringify({ success: false, error: "חסרים פרטים נדרשים" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, supabaseServiceKey);

    let advisorName = advisorNameRaw;
    if (!advisorName && advisorEmail) {
      try {
        const { data } = await supa
          .from("profiles")
          .select("name, sender_display_name")
          .eq("email", advisorEmail)
          .maybeSingle();
        advisorName = (data as any)?.sender_display_name || (data as any)?.name || "";
      } catch (_) {}
    }

    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
      body: JSON.stringify({
        templateName: "reminder",
        recipientEmail: clientEmail,
        idempotencyKey: `reminder-${portalLink}-${Date.now()}`,
        senderName: advisorName || undefined,
        replyTo: advisorEmail || undefined,
        templateData: {
          clientName,
          caseTitle,
          portalUrl: portalLink,
          missingDocs,
          rejectedDocs,
          advisorName,
          personalMessage,
        },
      }),
    });
    const data = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      throw new Error(`send-transactional-email ${sendRes.status}: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending reminder:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "שגיאה בשליחת המייל" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});