import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateNotificationRequest {
  advisorId: string;
  caseId?: string;
  clientId?: string;
  type: 'מסמך_התקבל' | 'מסמך_דחוף' | 'לקוח_לא_פעיל' | 'מסמך_נדחה' | 'תיק_חדש' | 'מסמך_אושר';
  title: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { advisorId, caseId, clientId, type, title, message }: CreateNotificationRequest = await req.json();

    if (!advisorId || !type || !title) {
      return new Response(
        JSON.stringify({ error: "חסרים פרטים נדרשים" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        advisor_id: advisorId,
        case_id: caseId || null,
        client_id: clientId || null,
        type,
        title,
        message: message || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return new Response(
        JSON.stringify({ error: "שגיאה ביצירת ההתראה" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Notification created:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
