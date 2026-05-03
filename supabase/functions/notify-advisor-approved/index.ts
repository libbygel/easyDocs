import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function getAdvisorName(record: Record<string, unknown>): string {
  return (
    cleanText(record.full_name) ||
    cleanText(record.name) ||
    cleanText(record.sender_display_name) ||
    cleanText(record.display_name)
  )
}

function approvalEmailHtml(advisorName: string, loginUrl: string): string {
  const greeting = advisorName ? `שלום ${escapeHtml(advisorName)},` : 'שלום,'
  return `<!doctype html>
<html lang="he" dir="rtl">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body dir="rtl" style="margin:0;background:#ffffff;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;text-align:right;direction:rtl;unicode-bidi:plaintext;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" dir="rtl" style="background:#ffffff;direction:rtl;text-align:right;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" dir="rtl" style="max-width:600px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;direction:rtl;text-align:right;">
          <tr><td dir="rtl" style="background:#1E3A8A;color:#ffffff;padding:28px 30px;text-align:right;direction:rtl;">
            <h1 style="margin:0;font-size:24px;line-height:1.4;font-weight:700;color:#ffffff;text-align:right;direction:rtl;">ברוך הבא ל-EasyDocs</h1>
            <p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#dbeafe;text-align:right;direction:rtl;">החשבון שלך אושר ומוכן לשימוש</p>
          </td></tr>
          <tr><td dir="rtl" style="padding:30px;text-align:right;direction:rtl;unicode-bidi:plaintext;">
            <h2 style="margin:0 0 18px;font-size:22px;line-height:1.5;color:#111827;text-align:right;direction:rtl;">${greeting}</h2>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#374151;text-align:right;direction:rtl;">שמחים לבשר לך שהחשבון שלך במערכת <strong>EasyDocs</strong> אושר בהצלחה.</p>
            <p style="margin:0 0 26px;font-size:16px;line-height:1.8;color:#374151;text-align:right;direction:rtl;">מעכשיו אפשר להיכנס למערכת, לפתוח תיקים ללקוחות, לנהל מסמכים, חתימות דיגיטליות ותזכורות אוטומטיות.</p>
            <div style="text-align:center;margin:30px 0;direction:rtl;">
              <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#1E3A8A;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 34px;border-radius:8px;">כניסה למערכת</a>
            </div>
            <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#64748b;text-align:right;direction:rtl;">יש שאלות? אנחנו כאן לעזור — פשוט השב למייל הזה.</p>
          </td></tr>
          <tr><td dir="rtl" style="background:#f8fafc;padding:18px 30px;font-size:12px;line-height:1.6;color:#64748b;text-align:center;direction:rtl;">הודעה זו נשלחה ממערכת EasyDocs - easydocs.tech</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function approvalEmailText(advisorName: string, loginUrl: string): string {
  const greeting = advisorName ? `שלום ${advisorName},` : 'שלום,'
  return `${greeting}\n\nהחשבון שלך במערכת EasyDocs אושר בהצלחה.\n\nאפשר להיכנס למערכת כאן:\n${loginUrl}\n\nEasyDocs - easydocs.tech`
}

async function sendApprovalWithBrevo(recipientEmail: string, advisorName: string, loginUrl: string) {
  const brevoApiKey = Deno.env.get('BREVO_API_KEY')
  if (!brevoApiKey) return false

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: 'EasyDocs', email: 'dg.smarter1@gmail.com' },
      to: [{ email: recipientEmail }],
      subject: 'החשבון שלך ב-EasyDocs אושר',
      htmlContent: approvalEmailHtml(advisorName, loginUrl),
      textContent: approvalEmailText(advisorName, loginUrl),
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Brevo approval email failed: ${response.status} ${body.slice(0, 300)}`)
  }
  return true
}

async function sendApprovalWithResend(recipientEmail: string, advisorName: string, loginUrl: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) return false

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'EasyDocs <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: 'החשבון שלך ב-EasyDocs אושר',
      html: approvalEmailHtml(advisorName, loginUrl),
      text: approvalEmailText(advisorName, loginUrl),
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Resend approval email failed: ${response.status} ${body.slice(0, 300)}`)
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { record, old_record } = await req.json()

    // Only fire when is_paid flips from false → true
    if (!record?.is_paid || old_record?.is_paid === true) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipientEmail = record.email
    const advisorName = getAdvisorName(record)
    const loginUrl = 'https://easydocs.tech/auth'

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'No email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sentViaBrevo = false
    try {
      sentViaBrevo = await sendApprovalWithBrevo(recipientEmail, advisorName, loginUrl)
    } catch (brevoError) {
      console.error('Brevo approval email failed, falling back to Lovable email:', brevoError)
    }
    if (sentViaBrevo) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase.from('email_send_log').insert({
          message_id: crypto.randomUUID(),
          template_name: 'advisor-approved',
          recipient_email: recipientEmail,
          status: 'sent',
          metadata: { provider: 'brevo', advisorName: advisorName || null },
        })
      }

      return new Response(JSON.stringify({ success: true, provider: 'brevo', advisorName: advisorName || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sentViaResend = false
    try {
      sentViaResend = await sendApprovalWithResend(recipientEmail, advisorName, loginUrl)
    } catch (resendError) {
      console.error('Resend approval email failed, falling back to Lovable email:', resendError)
    }
    if (sentViaResend) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase.from('email_send_log').insert({
          message_id: crypto.randomUUID(),
          template_name: 'advisor-approved',
          recipient_email: recipientEmail,
          status: 'sent',
          metadata: { provider: 'resend', advisorName: advisorName || null },
        })
      }

      return new Response(JSON.stringify({ success: true, provider: 'resend', advisorName: advisorName || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'advisor-approved',
        recipientEmail,
        idempotencyKey: `advisor-approved-${record.user_id || record.id || recipientEmail}-${Date.now()}`,
        templateData: {
          advisorName: advisorName || undefined,
          loginUrl,
        },
      },
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-advisor-approved error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})