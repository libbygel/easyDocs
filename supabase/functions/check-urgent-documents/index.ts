import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get date range: today + 2 days ahead
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twoDaysAhead = new Date(today);
    twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);
    twoDaysAhead.setHours(23, 59, 59, 999);

    console.log(`Checking for documents due between ${today.toISOString()} and ${twoDaysAhead.toISOString()}`);

    // Find documents with due_date within next 2 days that are still missing
    const { data: urgentDocs, error: docsError } = await supabase
      .from('case_documents')
      .select(`
        id,
        doc_name,
        due_date,
        review_status,
        case_id,
        cases!case_documents_case_id_fkey(
          id,
          title,
          advisor_id,
          client_id,
          clients!cases_client_id_fkey(
            full_name,
            email
          )
        )
      `)
      .gte('due_date', today.toISOString())
      .lte('due_date', twoDaysAhead.toISOString())
      .in('review_status', ['חסר', 'לא תקין']);

    if (docsError) {
      console.error("Error fetching urgent documents:", docsError);
      return new Response(
        JSON.stringify({ error: "Error fetching documents" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${urgentDocs?.length || 0} urgent documents`);

    // Check existing notifications to avoid duplicates
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('case_id, title')
      .eq('type', 'מסמך_דחוף')
      .gte('created_at', todayStart.toISOString());

    const existingKeys = new Set(
      (existingNotifications || []).map(n => `${n.case_id}-${n.title}`)
    );

    let notificationsCreated = 0;

    for (const doc of urgentDocs || []) {
      const caseData = doc.cases as any;
      const clientData = caseData?.clients;
      
      if (!caseData?.advisor_id) continue;

      const notificationKey = `${caseData.id}-מסמך דחוף: ${doc.doc_name}`;
      
      // Skip if notification already exists today
      if (existingKeys.has(notificationKey)) {
        console.log(`Skipping duplicate notification for ${doc.doc_name}`);
        continue;
      }

      const dueDate = new Date(doc.due_date);
      const now = new Date();
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const dueDateFormatted = dueDate.toLocaleDateString('he-IL');
      const urgencyText = daysLeft <= 0 ? 'היום' : daysLeft === 1 ? 'מחר' : `בעוד ${daysLeft} ימים`;

      // Create urgent notification
      const { error: insertError } = await supabase.from('notifications').insert({
        advisor_id: caseData.advisor_id,
        case_id: caseData.id,
        client_id: caseData.client_id,
        type: 'מסמך_דחוף',
        title: `מסמך דחוף: ${doc.doc_name}`,
        message: `תאריך יעד ${urgencyText} (${dueDateFormatted}) - ${clientData?.full_name || 'לקוח'} - תיק: ${caseData.title}`,
      });

      if (insertError) {
        console.error(`Error creating notification for ${doc.doc_name}:`, insertError);
      } else {
        notificationsCreated++;
        console.log(`Created urgent notification for ${doc.doc_name}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentsChecked: urgentDocs?.length || 0,
        notificationsCreated
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error checking urgent documents:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
