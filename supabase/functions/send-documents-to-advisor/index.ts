import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isValidEmail,
  isValidHttpUrl,
  isValidUuid,
  validateTextField,
} from "../_shared/input-validation.ts";

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
      advisorEmail: advisorEmailParam,
      advisorId,            // preferred: pass this from the portal so we can look up server-side
      advisorName: advisorNameParam,
      note,
      mode, // 'client-submission' | undefined
      portalUrl,
    } = await req.json();

    const clientNameValidation = validateTextField('clientName', clientName, { maxLength: 120 });
    const caseTitleValidation = validateTextField('caseTitle', caseTitle, { maxLength: 160 });
    const advisorNameValidation = validateTextField('advisorName', advisorNameParam, { maxLength: 120 });
    const noteValidation = validateTextField('note', note, { maxLength: 2000, allowNewLines: true });
    const advisorEmailValidation = validateTextField('advisorEmail', advisorEmailParam, { maxLength: 255 });
    const advisorIdValidation = validateTextField('advisorId', advisorId, { maxLength: 64 });
    const portalUrlValidation = validateTextField('portalUrl', portalUrl, { maxLength: 500 });

    if (!clientNameValidation.ok || !caseTitleValidation.ok || !advisorNameValidation.ok || !noteValidation.ok || !advisorEmailValidation.ok || !advisorIdValidation.ok || !portalUrlValidation.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'אחד או יותר מהשדות אינו תקין' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (advisorEmailValidation.value && !isValidEmail(advisorEmailValidation.value)) {
      return new Response(
        JSON.stringify({ success: false, error: 'advisorEmail לא תקין' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (advisorIdValidation.value && !isValidUuid(advisorIdValidation.value)) {
      return new Response(
        JSON.stringify({ success: false, error: 'advisorId לא תקין' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (portalUrlValidation.value && !isValidHttpUrl(portalUrlValidation.value)) {
      return new Response(
        JSON.stringify({ success: false, error: 'portalUrl לא תקין' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const safeDocumentNames = Array.isArray(documentNames)
      ? documentNames
          .map((d: unknown) => validateTextField('documentName', d, { required: true, maxLength: 250 }))
          .filter((r) => r.ok && r.value)
          .map((r) => r.value)
      : [];

    if (Array.isArray(documentNames) && safeDocumentNames.length !== documentNames.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'documentNames מכיל ערכים לא תקינים' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve advisor email + name.  The portal (anon) cannot read profiles via
    // RLS, so if the caller passes advisorId we do the lookup here with service role.
    let advisorEmail = advisorEmailValidation.value || '';
    let advisorName  = advisorNameValidation.value || '';

    if (advisorIdValidation.value && (!advisorEmail || !advisorName)) {
      let profile: Record<string, any> | null = null;

      const ext = await supa
        .from('profiles')
        .select('email, name, sender_display_name, notify_on_client_upload')
        .eq('id', advisorIdValidation.value)
        .maybeSingle();

      if (ext.error && /notify_on_client_upload|column .* does not exist|schema cache/i.test(ext.error.message || '')) {
        // Backward compatibility for environments where notify_on_client_upload does not exist yet.
        const fallback = await supa
          .from('profiles')
          .select('email, name, sender_display_name')
          .eq('id', advisorIdValidation.value)
          .maybeSingle();
        profile = (fallback.data as any) || null;
      } else {
        profile = (ext.data as any) || null;
      }

      if (profile) {
        advisorEmail = advisorEmail || profile.email || '';
        advisorName = advisorName || profile.sender_display_name || profile.name || '';

        // Honour advisor's email-notification preference (default: true).
        if (Object.prototype.hasOwnProperty.call(profile, 'notify_on_client_upload') && profile.notify_on_client_upload === false) {
          return new Response(
            JSON.stringify({ success: true, skipped: 'notify_on_client_upload=false' }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      }
    }

    if (!advisorEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "missing advisorEmail" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const documents = safeDocumentNames.map((doc_name: string) => ({ doc_name }));
    const subjectTitle = caseTitleValidation.value || "מסמך חדש";
    const safeClientName = clientNameValidation.value;
    const safeNote = noteValidation.value;
    const safePortalUrl = portalUrlValidation.value;

    const isClientSubmission = mode === 'client-submission';
    const templateName = isClientSubmission ? 'client-submission-notification' : 'documents-to-advisor';
    const templateData: Record<string, any> = isClientSubmission
      ? {
          recipientName: advisorName || 'יועץ',
          clientName: safeClientName || 'לקוח',
          caseTitle: subjectTitle,
          documents,
          portalUrl: safePortalUrl || undefined,
        }
      : {
          recipientName: advisorName || 'יועץ',
          caseTitle: subjectTitle,
          senderName: safeClientName || 'EasyDocs',
          note: safeNote || (safeClientName ? `הלקוח ${safeClientName} שלח מסמכים חדשים` : 'התקבלו מסמכים חדשים'),
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
