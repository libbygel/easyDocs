import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function monthLabel(d: Date): string {
  return `${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function periodKey(d: Date): string {
  // YYYY-MM marker we embed in the description so we never duplicate.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date();
    const today = now.getDate();

    // Optional filter for manual run from a specific client.
    let clientFilter: string | null = null;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body && typeof body.client_id === "string") {
          clientFilter = body.client_id;
        }
      }
    } catch {
      // ignore
    }

    let q = supabase
      .from("recurring_charges")
      .select("*")
      .eq("is_active", true);

    if (clientFilter) {
      q = q.eq("client_id", clientFilter);
    } else {
      q = q.lte("day_of_month", today);
    }

    const { data: recs, error: recErr } = await q;
    if (recErr) throw recErr;

    const period = periodKey(now);
    const label = monthLabel(now);
    let created = 0;
    const skipped: string[] = [];

    for (const rc of recs || []) {
      // Skip if not yet at the configured day for the manual run case.
      if (clientFilter && rc.day_of_month > today) {
        skipped.push(`${rc.id}: not yet day ${rc.day_of_month}`);
        continue;
      }

      // Avoid duplicate within the same calendar month: check existing
      // charges that already have our marker for this period.
      const marker = `[recurring:${rc.id}:${period}]`;
      const { data: existing, error: existErr } = await supabase
        .from("case_charges")
        .select("id")
        .eq("case_id", rc.case_id)
        .ilike("description", `%${marker}%`)
        .limit(1);
      if (existErr) {
        console.error("existing check error", existErr);
        continue;
      }
      if (existing && existing.length > 0) {
        skipped.push(`${rc.id}: already exists for ${period}`);
        continue;
      }

      const baseDesc = rc.description || "חיוב חודשי";
      const finalDesc = `${baseDesc} — ${label} ${marker}`;

      const { error: insErr } = await supabase.from("case_charges").insert({
        advisor_id: rc.advisor_id,
        client_id: rc.client_id,
        case_id: rc.case_id,
        amount: rc.amount,
        description: finalDesc,
        charged_at: new Date().toISOString(),
      });
      if (insErr) {
        console.error("insert charge error", insErr);
        continue;
      }

      const nextRunOn = new Date(now.getFullYear(), now.getMonth() + 1, rc.day_of_month);
      await supabase
        .from("recurring_charges")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_on: nextRunOn.toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rc.id);

      created++;
    }

    return new Response(
      JSON.stringify({ ok: true, created, skipped: skipped.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("run-recurring-charges error", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});