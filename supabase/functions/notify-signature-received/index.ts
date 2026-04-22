import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifySignatureRequest {
  caseId: string;
  docName: string;
  clientName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, docName, clientName }: NotifySignatureRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: caseData, error: caseError } = await supabase
      .from("cases").select("*, clients(*)").eq("id", caseId).single();

    if (caseError || !caseData) throw new Error("Case not found");

    const { data: advisorProfile } = await supabase
      .from("profiles").select("email, name").eq("user_id", caseData.advisor_id).single();

    if (!advisorProfile?.email) throw new Error("Advisor email not found");

    await supabase.from("notifications").insert({
      advisor_id: caseData.advisor_id, case_id: caseId, client_id: caseData.client_id,
      type: "מסמך_אושר",
      title: `חתימה חדשה התקבלה מ-${clientName}`,
      message: `הלקוח ${clientName} חתם על המסמך "${docName}" בתיק "${caseData.title}"`,
    });

    if (BREVO_API_KEY) {
      const portalUrl = `https://siman-sheer-shlem.lovable.app/cases/${caseId}`;

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: "EasyDocs", email: "dg.smarter1@gmail.com" },
          to: [{ email: advisorProfile.email, name: advisorProfile.name || "יועץ" }],
          subject: `✍️ חתימה חדשה התקבלה מ-${clientName}`,
          htmlContent: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #22c55e;">✍️ חתימה חדשה התקבלה!</h2>
              <p>שלום ${advisorProfile.name || "יועץ יקר"},</p>
              <p>הלקוח <strong>${clientName}</strong> חתם על המסמך:</p>
              <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">${docName}</p>
                <p style="margin: 8px 0 0; color: #666;">תיק: ${caseData.title}</p>
              </div>
              <p>
                <a href="${portalUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">צפה בתיק</a>
              </p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        await supabase.from("email_logs").insert({
          advisor_id: caseData.advisor_id, case_id: caseId, client_id: caseData.client_id,
          to_email: advisorProfile.email, subject: `חתימה חדשה התקבלה מ-${clientName}`,
          email_type: "הודעה על העלאה",
          body_preview: `הלקוח ${clientName} חתם על המסמך "${docName}"`,
        });
      } else {
        const errorData = await res.text();
        console.error("Brevo API error:", errorData);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-signature-received:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
