import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const EXTERNAL_SUPABASE_URL = "https://hndzejkwwpwrtzqpnqme.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "sb_publishable_KK3uDx2kOLcgvFpyTcU3IA_vf7E6x0F";
const ADMIN_NOTIFY_EMAIL = "dv4343@gmail.com";

async function notifyAdminViaLovableEmails(email: string, name: string | undefined) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.warn("Lovable email env missing, skipping branded admin notification");
      return;
    }
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({
        templateName: "admin-new-signup",
        recipientEmail: ADMIN_NOTIFY_EMAIL,
        idempotencyKey: `admin-signup-${email}-${Date.now()}`,
        templateData: {
          advisorName: name || "לא צוין",
          advisorEmail: email,
          signupTime: new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
          approveUrl: "https://easydocs.tech",
        },
      }),
    });
    const txt = await res.text();
    console.log("Lovable admin notification status:", res.status, txt.slice(0, 200));
  } catch (err) {
    console.error("Failed to send Lovable admin notification:", err);
  }
}

async function notifyAdminOfSignup(email: string, name: string | undefined) {
  // Send via Lovable Emails (branded + logged in email_send_log)
  await notifyAdminViaLovableEmails(email, name);

  // Also send via Resend as backup
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set, skipping admin notification");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "EasyDocs <noreply@libbygel.com>",
        to: [ADMIN_NOTIFY_EMAIL],
        subject: `הרשמה חדשה למערכת: ${name || email}`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;">
            <h2>משתמש חדש נרשם למערכת EasyDocs</h2>
            <p><strong>שם:</strong> ${name || "לא צוין"}</p>
            <p><strong>אימייל:</strong> ${email}</p>
            <p><strong>זמן:</strong> ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</p>
            <hr/>
            <p style="color:#888;">החשבון הופעל אוטומטית ויכול להתחבר למערכת.</p>
          </div>
        `,
      }),
    });
    const body = await res.text();
    console.log("Resend admin notification status:", res.status, body.slice(0, 200));
  } catch (err) {
    console.error("Failed to send admin notification:", err);
  }
}

async function ensureExternalProfile(userId: string | null, accessToken: string | null, email: string, name: string | undefined) {
  if (!userId || !accessToken) return;

  const baseProfile = {
    id: userId,
    email,
    name: name || email.split("@")[0],
  };

  const headers = {
    "Content-Type": "application/json",
    "apikey": EXTERNAL_SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${accessToken}`,
    "Prefer": "resolution=merge-duplicates",
  };

  const upsert = async (body: Record<string, unknown>) => fetch(`${EXTERNAL_SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let res = await upsert({ ...baseProfile, is_paid: true });
  if (!res.ok && res.status === 400) {
    res = await upsert(baseProfile);
  }

  if (!res.ok) {
    console.warn("External profile upsert failed:", res.status, (await res.text()).slice(0, 300));
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type SignupRequest = {
  email: string;
  password: string;
  name?: string;
  requestId?: string;
};

type SignupResponse = {
  success: boolean;
  error: string | null;
  pendingApproval?: boolean;
  message?: string;
  userId?: string | null;
  requestId: string;
  invocationCount: number;
  upstreamInvocationCount: number;
  deduped?: boolean;
  status?: number | string;
  code?: string | number;
};

const requestInvocationCounts = new Map<string, number>();
const upstreamInvocationCounts = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<SignupResponse>>();
const completedRequests = new Map<string, { response: SignupResponse; createdAt: number }>();
const COMPLETED_REQUEST_TTL_MS = 5 * 60 * 1000;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function createRequestId() {
  return `auth-signup-${Date.now()}-${crypto.randomUUID()}`;
}

function incrementInvocationCount(requestId: string) {
  const nextCount = (requestInvocationCounts.get(requestId) ?? 0) + 1;
  requestInvocationCounts.set(requestId, nextCount);
  return nextCount;
}

function incrementUpstreamInvocationCount(requestId: string) {
  const nextCount = (upstreamInvocationCounts.get(requestId) ?? 0) + 1;
  upstreamInvocationCounts.set(requestId, nextCount);
  return nextCount;
}

function getUpstreamInvocationCount(requestId: string) {
  return upstreamInvocationCounts.get(requestId) ?? 0;
}

function pruneCompletedRequests() {
  const cutoff = Date.now() - COMPLETED_REQUEST_TTL_MS;
  for (const [requestId, value] of completedRequests.entries()) {
    if (value.createdAt < cutoff) {
      completedRequests.delete(requestId);
      requestInvocationCounts.delete(requestId);
      upstreamInvocationCounts.delete(requestId);
    }
  }
}

function withDebugMetadata(response: SignupResponse, overrides: Partial<SignupResponse> = {}): SignupResponse {
  return {
    ...response,
    ...overrides,
    requestId: overrides.requestId ?? response.requestId,
    invocationCount: overrides.invocationCount ?? response.invocationCount,
    upstreamInvocationCount: overrides.upstreamInvocationCount ?? response.upstreamInvocationCount,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  let requestId = createRequestId();
  let invocationCount = 0;

  try {
    const { email, password, name, requestId: incomingRequestId }: SignupRequest = await req.json();
    requestId = incomingRequestId?.trim() || requestId;
    invocationCount = incrementInvocationCount(requestId);
    pruneCompletedRequests();

    const normalizedEmail = email?.trim();
    const normalizedName = name?.trim();

    console.log(
      JSON.stringify({
        scope: "auth-signup",
        phase: "start",
        requestId,
        invocationCount,
        upstreamInvocationCount: getUpstreamInvocationCount(requestId),
        email: normalizedEmail,
      }),
    );

    if (!normalizedEmail || !password) {
      console.warn(JSON.stringify({
        scope: "auth-signup",
        phase: "validation_failed",
        requestId,
        invocationCount,
        upstreamInvocationCount: getUpstreamInvocationCount(requestId),
      }));
      return jsonResponse({
        success: false,
        error: "Missing email or password",
        requestId,
        invocationCount,
        upstreamInvocationCount: getUpstreamInvocationCount(requestId),
      }, 400);
    }

    const cachedResponse = completedRequests.get(requestId)?.response;
    if (cachedResponse) {
      const dedupedResponse = withDebugMetadata(cachedResponse, {
        requestId,
        invocationCount,
        upstreamInvocationCount: getUpstreamInvocationCount(requestId),
        deduped: true,
      });

      console.warn(JSON.stringify({
        scope: "auth-signup",
        phase: "duplicate_cached",
        requestId,
        invocationCount,
        upstreamInvocationCount: dedupedResponse.upstreamInvocationCount,
        email: normalizedEmail,
      }));

      return jsonResponse(dedupedResponse, cachedResponse.success ? 200 : Number(cachedResponse.status ?? 500));
    }

    const existingInFlight = inFlightRequests.get(requestId);
    if (existingInFlight) {
      console.warn(JSON.stringify({
        scope: "auth-signup",
        phase: "duplicate_inflight",
        requestId,
        invocationCount,
        upstreamInvocationCount: getUpstreamInvocationCount(requestId),
        email: normalizedEmail,
      }));

      const sharedResponse = await existingInFlight;
      const dedupedResponse = withDebugMetadata(sharedResponse, {
        requestId,
        invocationCount,
        upstreamInvocationCount: getUpstreamInvocationCount(requestId),
        deduped: true,
      });

      return jsonResponse(dedupedResponse, sharedResponse.success ? 200 : Number(sharedResponse.status ?? 500));
    }

    const signupPromise = (async (): Promise<SignupResponse> => {
      const upstreamInvocationCount = incrementUpstreamInvocationCount(requestId);

      console.log(JSON.stringify({
        scope: "auth-signup",
        phase: "upstream_request",
        requestId,
        invocationCount,
        upstreamInvocationCount,
        email: normalizedEmail,
      }));

      const signupResponse = await fetch(`${EXTERNAL_SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "apikey": EXTERNAL_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          data: normalizedName ? { name: normalizedName } : undefined,
        }),
      });

      const rawBody = await signupResponse.text();
      let parsedBody: Record<string, unknown> = {};

      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        parsedBody = rawBody ? { error: rawBody } : {};
      }

      console.log(JSON.stringify({
        scope: "auth-signup",
        phase: "upstream_response",
        requestId,
        invocationCount,
        upstreamInvocationCount,
        status: signupResponse.status,
      }));

      if (!signupResponse.ok) {
        const errorResponse: SignupResponse = {
          success: false,
          error: String(parsedBody.error || parsedBody.message || parsedBody.msg || "Signup failed"),
          status: signupResponse.status,
          code: (parsedBody.code || parsedBody.error_code || signupResponse.status) as string | number,
          requestId,
          invocationCount,
          upstreamInvocationCount,
        };

        console.warn(JSON.stringify({
          scope: "auth-signup",
          phase: "upstream_error",
          requestId,
          invocationCount,
          upstreamInvocationCount,
          status: signupResponse.status,
          error: errorResponse.error,
        }));

        return errorResponse;
      }

      const userId = (parsedBody?.user as { id?: string } | undefined)?.id ?? (parsedBody?.id as string | undefined) ?? null;
      const accessToken = (parsedBody?.access_token as string | undefined) ?? (parsedBody?.session as { access_token?: string } | undefined)?.access_token ?? null;

      await ensureExternalProfile(userId, accessToken, normalizedEmail, normalizedName);

      const successResponse: SignupResponse = {
        success: true,
        error: null,
        pendingApproval: false,
        message: "ההרשמה נקלטה בהצלחה. אפשר להתחבר למערכת.",
        userId,
        requestId,
        invocationCount,
        upstreamInvocationCount,
      };

      console.log(JSON.stringify({
        scope: "auth-signup",
        phase: "success",
        requestId,
        invocationCount,
        upstreamInvocationCount,
        userId: successResponse.userId,
      }));

      // Send admin notification (fire-and-forget)
      notifyAdminOfSignup(normalizedEmail, normalizedName);

      return successResponse;
    })();

    inFlightRequests.set(requestId, signupPromise);
    const result = await signupPromise;
    completedRequests.set(requestId, { response: result, createdAt: Date.now() });

    return jsonResponse(result, result.success ? 200 : Number(result.status ?? 500));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({
      scope: "auth-signup",
      phase: "exception",
      requestId,
      invocationCount,
      upstreamInvocationCount: getUpstreamInvocationCount(requestId),
      error: message,
    }));
    return jsonResponse({
      success: false,
      error: message,
      requestId,
      invocationCount,
      upstreamInvocationCount: getUpstreamInvocationCount(requestId),
    }, 500);
  } finally {
    inFlightRequests.delete(requestId);
  }
});
