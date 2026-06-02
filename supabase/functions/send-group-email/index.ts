import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Recipient = {
  email: string;
  name?: string;
  portalLink?: string;
};

function isValidRecipient(value: unknown): value is Recipient {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.email === "string" && item.email.trim().length > 0;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const recipientsRaw = Array.isArray(body?.recipients) ? body.recipients : [];
    const recipients = recipientsRaw.filter(isValidRecipient);
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const advisorName = typeof body?.advisorName === "string" ? body.advisorName.trim() : "";
    const advisorEmail = typeof body?.advisorEmail === "string" ? body.advisorEmail.trim() : "";

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "Subject and message are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supa = createClient(supabaseUrl, supabaseServiceKey);

    const settled = await Promise.allSettled(
      recipients.map(async (recipient, index) => {
        const idempotencySuffix = crypto.randomUUID();
        const idempotencyKey = `group-${recipient.email}-${Date.now()}-${index}-${idempotencySuffix}`;

        const { data, error } = await supa.functions.invoke("send-transactional-email", {
          body: {
            templateName: "group-message",
            recipientEmail: recipient.email,
            idempotencyKey,
            senderName: advisorName || undefined,
            replyTo: advisorEmail || undefined,
            templateData: {
              name: recipient.name || undefined,
              message,
              advisorName: advisorName || undefined,
              portalLink: recipient.portalLink || undefined,
              subjectLine: subject,
            },
          },
        });

        if (error) {
          throw new Error(error.message || "send-transactional-email failed");
        }

        return { email: recipient.email, data };
      }),
    );

    const failed = settled
      .map((result, index) => ({ result, recipient: recipients[index] }))
      .filter((item) => item.result.status === "rejected")
      .map((item) => ({
        email: item.recipient.email,
        error: item.result.status === "rejected"
          ? (item.result.reason instanceof Error ? item.result.reason.message : String(item.result.reason))
          : "unknown",
      }));

    const sentCount = settled.length - failed.length;
    return new Response(
      JSON.stringify({
        success: failed.length === 0,
        sentCount,
        failedCount: failed.length,
        failed,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
