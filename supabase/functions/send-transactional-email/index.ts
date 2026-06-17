import * as React from 'npm:react@18.3.1'
import { renderToStaticMarkup } from 'npm:react-dom@18.3.1/server'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

// Configuration baked in at scaffold time — do NOT change these manually.
// To update, re-run the email domain setup flow.
const SITE_NAME = "easydocs1"
// SENDER_DOMAIN is the verified sender subdomain FQDN (e.g., "notify.example.com").
// It MUST match the subdomain delegated to Lovable's nameservers — never the root domain.
// The email API looks up this exact domain; a mismatch causes "No email domain record found".
const SENDER_DOMAIN = "notify.easydocs.tech"
// FROM_DOMAIN is the domain shown in the From: header (e.g., "example.com").
// When display_from_root is enabled, this can be the root domain for cleaner branding,
// even though actual sending uses the subdomain above.
const FROM_DOMAIN = "easydocs.tech"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Diagnostic helper — logs every Unicode code point in a string so that
 * garbled / invisible / control characters are visible in Supabase edge logs.
 * Output example:  [email-dbg] subject.raw: "שלום" → ש(U+05E9) ל(U+05DC) ו(U+05D5) מ(U+05DE)
 * Search for U+FFFD in the output: if present the data is corrupted upstream
 * of this function and encoding will only preserve the corruption.
 */
function dbgStr(label: string, s: string): void {
  const points = [...s]
    .map((c) => `${c}(U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`)
    .join(' ')
  console.log(`[email-dbg] ${label}: "${s}" → ${points}`)
}

// Characters that cause garbled rendering in email clients:
// - C0 control chars (except tab U+0009, LF U+000A, CR U+000D)
// - DEL (U+007F)
// - C1 control chars U+0080-U+009F — this range is the #1 cause of garbling:
//   legacy Hebrew/Windows-1255 text copy-pasted into the app lands here
//   (e.g. U+0091/U+0092 = curly-quote bytes in Windows-1252 that never got
//   converted to proper Unicode U+2018/U+2019)
// - U+FFFD replacement character
// - Invisible directional / formatting controls
const GARBLE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u061C\uFEFF\u00AD\uFFF9-\uFFFB]/g

function cleanStr(s: string): string {
  // 1. NFKC decomposes Hebrew Presentation Forms (U+FB00-U+FB4F) and other
  //    compatibility characters that NFC leaves intact.
  // 2. Round-trip through TextEncoder/TextDecoder forces any lone surrogates or
  //    other unpaired code units to U+FFFD so the GARBLE_RE below catches them.
  // 3. Strip all known-bad characters.
  const nfkc = s.normalize('NFKC')
  const bytes = new TextEncoder().encode(nfkc)
  const safe = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  return safe.replace(GARBLE_RE, '').trim()
}

/**
 * RFC 2047 §4 encoded-word encoding (Base64 variant).
 *
 * Converts non-ASCII header values (Hebrew names, subjects) to the form
 *   =?UTF-8?B?BASE64?=
 * so they survive SMTP header transit without garbling in any email client.
 *
 * Key properties:
 * - Pure-ASCII input is returned unchanged → no double-encoding risk if Resend
 *   also encodes: once encoded the result is ASCII, so Resend leaves it alone.
 * - Strings longer than 45 UTF-8 bytes are chunked into multiple 75-char
 *   encoded-words (RFC 2047 §4.2 limit) separated by a single space.
 * - UTF-8 multi-byte sequences are never split across chunk boundaries.
 */
export function encodeEmailHeader(value: string): string {
  // Printable ASCII only → return as-is
  if (!/[^\x20-\x7E]/.test(value)) return value

  // 75-char max per encoded-word: =?UTF-8?B?(10) + base64 + ?=(2) = 12 overhead
  // → max 63 base64 chars → encodes ⌊63 × 3/4⌋ = 47 raw bytes.  Use 45 to stay safe.
  const MAX_BYTES = 45
  const bytes = new TextEncoder().encode(value)
  const words: string[] = []
  let i = 0
  while (i < bytes.length) {
    let end = Math.min(i + MAX_BYTES, bytes.length)
    // Don't split inside a multi-byte UTF-8 continuation byte (10xxxxxx)
    while (end < bytes.length && (bytes[end] & 0xC0) === 0x80) end++
    const chunk = bytes.slice(i, end)
    let bin = ''
    for (const b of chunk) bin += String.fromCharCode(b)
    words.push(`=?UTF-8?B?${btoa(bin)}?=`)
    i = end
  }
  return words.join(' ')
}

// Recursively normalize all string values inside templateData so that
// garbled bytes from any field (caseTitle, advisorName, doc_name, etc.)
// never reach the React Email renderer.
function normalizeTemplateData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') {
      out[k] = cleanStr(v)
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        typeof item === 'string'
          ? cleanStr(item)
          : item !== null && typeof item === 'object'
          ? normalizeTemplateData(item as Record<string, unknown>)
          : item
      )
    } else if (v !== null && typeof v === 'object') {
      out[k] = normalizeTemplateData(v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out
}

// Auth note: this function uses verify_jwt = true in config.toml, so Supabase's
// gateway validates the caller's JWT (anon or service_role) before the request
// reaches this code. No in-function auth check is needed.

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const bearerToken = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const requestApiKey = req.headers.get('apikey')
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const isInternalCall =
    bearerToken === supabaseServiceKey ||
    requestApiKey === supabaseServiceKey ||
    (!!lovableApiKey && bearerToken === lovableApiKey)

  if (!isInternalCall) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse request body
  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let messageId: string
  let templateData: Record<string, any> = {}
  let senderName: string | undefined
  let replyTo: string | undefined
  let attachments: Array<{ filename: string; content: string }> = []
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = normalizeTemplateData(body.templateData)
    }
    senderName = body.senderName || body.sender_name
    replyTo = body.replyTo || body.reply_to
    // Optional file attachments: array of { filename, content (base64) }.
    if (Array.isArray(body.attachments)) {
      attachments = body.attachments
        .filter(
          (a: unknown): a is { filename: string; content: string } =>
            !!a &&
            typeof a === 'object' &&
            typeof (a as Record<string, unknown>).filename === 'string' &&
            typeof (a as Record<string, unknown>).content === 'string' &&
            (a as Record<string, unknown>).content !== '',
        )
        .map((a: { filename: string; content: string }) => ({
          filename: a.filename,
          content: a.content,
        }))
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 1. Look up template from registry (early — needed to resolve recipient)
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error('Template not found in registry', { templateName })
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Resolve effective recipient: template-level `to` takes precedence over
  // the caller-provided recipientEmail. This allows notification templates
  // to always send to a fixed address (e.g., site owner from env var).
  const effectiveRecipient = template.to || recipientEmail

  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({
        error: 'recipientEmail is required (unless the template defines a fixed recipient)',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 2. Check suppression list (fail-closed: if we can't verify, don't send)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient.toLowerCase())
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed — refusing to send', {
      error: suppressionError,
      effectiveRecipient,
    })
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (suppressed) {
    // Log the suppressed attempt
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })

    console.log('Email suppressed', { effectiveRecipient, templateName })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 3. Get or create unsubscribe token (one token per email address)
  const normalizedEmail = effectiveRecipient.toLowerCase()
  let unsubscribeToken: string

  // Check for existing token for this email
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', {
      error: tokenLookupError,
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return new Response(
      JSON.stringify({ error: 'Failed to prepare email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (existingToken && !existingToken.used_at) {
    // Reuse existing unused token
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    // Create new token — upsert handles concurrent inserts gracefully
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (tokenError) {
      console.error('Failed to create unsubscribe token', {
        error: tokenError,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If another request raced us, our upsert was silently ignored.
    // Re-read to get the actual stored token.
    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken) {
      console.error('Failed to read back unsubscribe token after upsert', {
        error: reReadError,
        email: normalizedEmail,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    unsubscribeToken = storedToken.token
  } else {
    // Token exists but is already used — email should have been caught by suppression check above.
    // This is a safety fallback; log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 4. Render React Email template to HTML and plain text.
  // We use React's native renderToStaticMarkup instead of renderAsync from
  // @react-email/components@0.0.22 because that package's render pipeline
  // (specifically its html-to-text post-processing) can corrupt multi-byte
  // UTF-8 sequences in Hebrew strings inside Deno's npm compatibility layer.
  const rawHtml = renderToStaticMarkup(
    React.createElement(template.component, templateData)
  )
  // Prepend the standard email HTML doctype that react-email normally adds.
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">${rawHtml}`
  // Build plain-text fallback by stripping HTML tags and decoding entities.
  // Avoids the html-to-text library that was the source of the garbling.
  const plainText = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!rawHtml.trim() || !plainText) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Rendered email content was empty',
    })

    return new Response(
      JSON.stringify({ error: 'Rendered email content was empty' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Resolve subject — supports static string or dynamic function
  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  const finalSubject = (resolvedSubject || template.displayName || templateName).trim()

  // 5. Send via Resend directly (libbygel.com)
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'RESEND_API_KEY not configured',
    })
    return new Response(JSON.stringify({ error: 'Email provider not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Sanitize sender display name — strip characters that break RFC 5322 From headers
  // Also apply Unicode normalization to remove garble-causing chars from Hebrew names.
  const safeSenderName = cleanStr(senderName || SITE_NAME)
    .replace(/[\r\n"<>]/g, '')
    .trim() || SITE_NAME

  // ── Diagnostic: log every code point at each pipeline stage ──────────────
  // Check for U+FFFD in any value: if present, the corruption is upstream
  // (database / frontend / caller) and encoding will only preserve it.
  dbgStr('senderName.raw', senderName ?? '(none)')
  dbgStr('safeSenderName.afterClean', safeSenderName)
  dbgStr('templateData.advisorName.afterNormalize', String(templateData.advisorName ?? '(none)'))
  dbgStr('templateData.caseTitle.afterNormalize', String(templateData.caseTitle ?? '(none)'))

  // RFC 2047-encode headers that may contain Hebrew (or any non-ASCII).
  // The encoded form is pure ASCII, so Resend's own encoding layer will
  // leave it unchanged — no double-encoding risk.
  const encodedSubject = encodeEmailHeader(finalSubject)
  const encodedSenderName = encodeEmailHeader(safeSenderName)

  dbgStr('resolvedSubject.beforeEncode', finalSubject)
  console.log('[email-dbg] encodedSubject.rfc2047:', encodedSubject)
  console.log('[email-dbg] from-field:', `${encodedSenderName} <noreply@libbygel.com>`)
  console.log('[email-dbg] to-field (no display name):', effectiveRecipient)
  // ─────────────────────────────────────────────────────────────────────────

  // Log pending BEFORE send so we have a record even if request crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${encodedSenderName} <noreply@libbygel.com>`,
        to: [effectiveRecipient],
        subject: encodedSubject,
        html,
        text: plainText,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments.length > 0 ? { attachments } : {}),
        headers: {
          'List-Unsubscribe': `<https://easydocs.tech/unsubscribe?token=${unsubscribeToken}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    const resendBody = await resendRes.text()
    if (!resendRes.ok) {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: `Resend ${resendRes.status}: ${resendBody.slice(0, 500)}`,
      })
      console.error('Resend send failed', { status: resendRes.status, body: resendBody.slice(0, 500) })
      return new Response(JSON.stringify({ error: 'Failed to send email', details: resendBody.slice(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'sent',
      metadata: { provider: 'resend' },
    })

    console.log('Transactional email sent via Resend', { templateName, effectiveRecipient })

    return new Response(JSON.stringify({ success: true, provider: 'resend' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: msg.slice(0, 500),
    })
    console.error('Resend send exception', err)
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
