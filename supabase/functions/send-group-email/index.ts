import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const FUNCTION_VERSION = "send-group-email@2026-06-02-fetch-v2";

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

type RecipientResult = {
  email: string;
  status: "sent" | "failed" | "suppressed";
  reason?: string;
};

function isValidRecipient(value: unknown): value is Recipient {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.email === "string" && item.email.trim().length > 0;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const error = typeof record.error === "string" ? record.error : null;
    const details = typeof record.details === "string" ? record.details : null;
    const reason = typeof record.reason === "string" ? record.reason : null;
    return error || details || reason || `HTTP ${status}`;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return `HTTP ${status}`;
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

    // Optional file attachments: array of { filename, content (base64) }.
    const attachments: Array<{ filename: string; content: string }> = Array.isArray(body?.attachments)
      ? body.attachments
          .filter(
            (a: unknown): a is { filename: string; content: string } =>
              !!a &&
              typeof a === "object" &&
              typeof (a as Record<string, unknown>).filename === "string" &&
              typeof (a as Record<string, unknown>).content === "string" &&
              (a as Record<string, unknown>).content !== "",
          )
          .map((a: { filename: string; content: string }) => ({
            filename: a.filename,
            content: a.content,
          }))
      : [];

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

    const settled = await Promise.allSettled(
      recipients.map(async (recipient, index) => {
        const normalizedEmail = recipient.email.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
          return {
            email: normalizedEmail,
            status: "failed",
            reason: "Invalid recipient email format",
          } as RecipientResult;
        }

        const idempotencySuffix = crypto.randomUUID();
        const idempotencyKey = `group-${normalizedEmail}-${Date.now()}-${index}-${idempotencySuffix}`;

        const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
          },
          body: JSON.stringify({
            templateName: "group-message",
            recipientEmail: normalizedEmail,
            idempotencyKey,
            senderName: advisorName || undefined,
            replyTo: advisorEmail || undefined,
            ...(attachments.length > 0 ? { attachments } : {}),
            templateData: {
              name: recipient.name || undefined,
              message,
              advisorName: advisorName || undefined,
              portalLink: recipient.portalLink || undefined,
              subjectLine: subject,
            },
          }),
        });

        const rawBody = await response.text();
        let data: Record<string, unknown> | null = null;
        try {
          data = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : null;
        } catch {
          data = rawBody ? { error: rawBody } : null;
        }

        if (!response.ok) {
          return {
            email: normalizedEmail,
            status: "failed",
            reason: extractErrorMessage(data, response.status),
          } as RecipientResult;
        }

        if (data?.success === false && data?.reason === "email_suppressed") {
          return {
            email: normalizedEmail,
            status: "suppressed",
            reason: "Recipient unsubscribed (suppressed)",
          } as RecipientResult;
        }

        return {
          email: normalizedEmail,
          status: "sent",
        } as RecipientResult;
      }),
    );

    const results: RecipientResult[] = settled.map((item, index) => {
      const fallbackEmail = recipients[index]?.email || "unknown";
      if (item.status === "fulfilled") {
        return item.value;
      }
      return {
        email: fallbackEmail,
        status: "failed",
        reason: item.reason instanceof Error ? item.reason.message : String(item.reason),
      };
    });

    const failed = results
      .filter((item) => item.status === "failed")
      .map((item) => ({ email: item.email, error: item.reason || "Unknown error" }));
    const suppressed = results.filter((item) => item.status === "suppressed").map((item) => item.email);
    const sentCount = results.filter((item) => item.status === "sent").length;

    return new Response(
      JSON.stringify({
        version: FUNCTION_VERSION,
        success: failed.length === 0,
        sentCount,
        failedCount: failed.length,
        suppressedCount: suppressed.length,
        suppressed,
        failed,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message, version: FUNCTION_VERSION }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
