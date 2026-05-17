import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildEmailHtml(taskTitle: string, advisorName: string, dueDate: string | null, description: string | null) {
  const greeting = advisorName ? `שלום ${escapeHtml(advisorName)},` : 'שלום,'
  const dueLine = dueDate
    ? `<p style="margin:0 0 12px;font-size:15px;color:#374151;text-align:right;direction:rtl;">📅 תאריך יעד: <strong>${escapeHtml(new Date(dueDate).toLocaleDateString('he-IL'))}</strong></p>`
    : ''
  const descLine = description
    ? `<p style="margin:0 0 18px;font-size:15px;color:#4b5563;line-height:1.7;text-align:right;direction:rtl;white-space:pre-wrap;">${escapeHtml(description)}</p>`
    : ''
  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="UTF-8"></head>
<body dir="rtl" style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937;text-align:right;direction:rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" dir="rtl"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" dir="rtl" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <tr><td dir="rtl" style="background:#1E3A8A;color:#ffffff;padding:22px 28px;text-align:right;">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">⏰ תזכורת למשימה</h1>
      </td></tr>
      <tr><td dir="rtl" style="padding:26px 28px;text-align:right;">
        <p style="margin:0 0 14px;font-size:15px;color:#374151;">${greeting}</p>
        <p style="margin:0 0 18px;font-size:16px;color:#111827;">זוהי תזכורת למשימה הבאה:</p>
        <div style="background:#f9fafb;border-right:4px solid #F59E0B;border-radius:8px;padding:16px 18px;margin:0 0 18px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111827;font-weight:700;">${escapeHtml(taskTitle)}</h2>
          ${dueLine}
          ${descLine}
        </div>
        <div style="text-align:center;margin:24px 0;"><a href="https://easydocs.tech/tasks" style="display:inline-block;background:#1E3A8A;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:8px;">פתח את המשימה</a></div>
      </td></tr>
      <tr><td dir="rtl" style="background:#f8fafc;padding:14px 28px;font-size:12px;color:#64748b;text-align:center;">EasyDocs - easydocs.tech</td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

async function sendResendEmail(toEmail: string, _toName: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) return { ok: false, error: 'RESEND_API_KEY not set' }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'EasyDocs <noreply@libbygel.com>',
      to: [toEmail],
      subject,
      html,
    }),
  })
  const text = await response.text()
  if (!response.ok) return { ok: false, error: `Resend ${response.status}: ${text.slice(0, 300)}` }
  return { ok: true }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supa = createClient(supabaseUrl, serviceKey)

    const nowIso = new Date().toISOString()

    const { data: dueTasks, error: dueErr } = await supa
      .from('personal_tasks')
      .select('id, advisor_id, title, description, due_date, reminder_at, case_id, client_id')
      .lte('reminder_at', nowIso)
      .is('reminder_sent_at', null)
      .eq('is_completed', false)
      .limit(100)

    if (dueErr) throw new Error(`Query failed: ${dueErr.message}`)

    const tasks = (dueTasks as any[]) || []
    let processed = 0
    let emailed = 0

    for (const task of tasks) {
      // Insert in-app notification
      try {
        await supa.from('notifications').insert({
          advisor_id: task.advisor_id,
          type: 'task_reminder',
          title: 'תזכורת למשימה',
          message: task.title,
          case_id: task.case_id,
          client_id: task.client_id,
        })
      } catch (_) {}

      // Lookup advisor email + name
      let advisorEmail = ''
      let advisorName = ''
      try {
        const { data: profile } = await supa
          .from('profiles')
          .select('email, name, sender_display_name')
          .eq('id', task.advisor_id)
          .maybeSingle()
        advisorEmail = (profile as any)?.email || ''
        advisorName = (profile as any)?.sender_display_name || (profile as any)?.name || ''
      } catch (_) {}

      if (advisorEmail) {
        const html = buildEmailHtml(task.title, advisorName, task.due_date, task.description)
        const result = await sendResendEmail(
          advisorEmail,
          advisorName,
          `⏰ תזכורת: ${task.title}`,
          html,
        )
        if (result.ok) emailed++
      }

      // Mark sent regardless of email result so we don't loop
      await supa
        .from('personal_tasks')
        .update({ reminder_sent_at: nowIso })
        .eq('id', task.id)

      processed++
    }

    return new Response(
      JSON.stringify({ success: true, processed, emailed, checked_at: nowIso }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: String(err?.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})