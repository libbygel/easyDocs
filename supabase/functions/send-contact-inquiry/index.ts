import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RECIPIENTS = ["dv4343@gmail.com", "dg.smarter1@gmail.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const cleanText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

interface ContactInquiry {
  name: string;
  phone: string;
  email: string;
  notes?: string;
  officeSize?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ContactInquiry = await req.json();
    const name = cleanText(body.name);
    const phone = cleanText(body.phone);
    const email = cleanText(body.email);
    const notes = cleanText(body.notes);
    const officeSize = cleanText(body.officeSize);

    if (!name || !phone || !email) {
      return jsonResponse({ error: "חסרים פרטים נדרשים: שם, טלפון ומייל" }, 400);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ error: "כתובת המייל אינה תקינה" }, 400);
    }

    if (name.length > 200 || phone.length > 50 || email.length > 255 || notes.length > 2000 || officeSize.length > 100) {
      return jsonResponse({ error: "אחד מהשדות ארוך מדי" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing email infrastructure environment variables");
      return jsonResponse({ error: "שירות המייל אינו מוגדר כרגע" }, 500);
    }

    const submittedAt = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
    const sendResults = await Promise.all(
      RECIPIENTS.map(async (recipientEmail) => {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            templateName: "contact-inquiry",
            recipientEmail,
            idempotencyKey: `contact-inquiry-${recipientEmail}-${crypto.randomUUID()}`,
            senderName: "EasyDocs Leads",
            replyTo: email,
            templateData: { name, phone, email, officeSize, notes, submittedAt },
          }),
        });

        const responseText = await response.text();
        if (!response.ok) {
          throw new Error(`send-transactional-email failed for ${recipientEmail}: ${response.status} ${responseText.slice(0, 300)}`);
        }
        return { recipientEmail, responseText };
      })
    );

    console.log("Inquiry emails enqueued successfully:", sendResults.map((result) => result.recipientEmail));

    return jsonResponse({ success: true, queued: true });
  } catch (error: any) {
    console.error("Error sending inquiry:", error?.message || error);
    return jsonResponse(
      { error: "אירעה שגיאה. נסה שוב או פנה אלינו במייל dg.smarter1@gmail.com." },
      500
    );
  }
};
    }

    const data = await res.json();
    console.log("Inquiry sent successfully via Brevo:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending inquiry:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);