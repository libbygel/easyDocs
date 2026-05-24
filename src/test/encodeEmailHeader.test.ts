/**
 * Unit tests for encodeEmailHeader — RFC 2047 Base64 encoded-word encoder.
 *
 * The implementation lives in supabase/functions/send-transactional-email/index.ts
 * and is inlined here so the test runs in Vitest (jsdom) without Deno.
 *
 * KEEP THIS IN SYNC with the implementation in index.ts.
 */

import { describe, it, expect } from 'vitest'

// ── inline implementation (mirrors index.ts exactly) ─────────────────────────
function encodeEmailHeader(value: string): string {
  if (!/[^\x20-\x7E]/.test(value)) return value
  const MAX_BYTES = 45
  const bytes = new TextEncoder().encode(value)
  const words: string[] = []
  let i = 0
  while (i < bytes.length) {
    let end = Math.min(i + MAX_BYTES, bytes.length)
    while (end < bytes.length && (bytes[end] & 0xC0) === 0x80) end++
    const chunk = bytes.slice(i, end)
    let bin = ''
    for (const b of chunk) bin += String.fromCharCode(b)
    words.push(`=?UTF-8?B?${btoa(bin)}?=`)
    i = end
  }
  return words.join(' ')
}

/** Decode one or more RFC 2047 =?UTF-8?B?...?= words back to a string. */
function decodeRFC2047(encoded: string): string {
  return encoded
    .split(' ')
    .map((word) => {
      const m = word.match(/^=\?UTF-8\?B\?([A-Za-z0-9+/]+=*)\?=$/i)
      if (!m) return word
      const bin = atob(m[1])
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return new TextDecoder('utf-8').decode(bytes)
    })
    .join('')
}
// ─────────────────────────────────────────────────────────────────────────────

describe('encodeEmailHeader — RFC 2047 compliance', () => {
  // ── 1. ASCII pass-through ──────────────────────────────────────────────────
  it('leaves pure-ASCII strings unchanged', () => {
    expect(encodeEmailHeader('EasyDocs')).toBe('EasyDocs')
    expect(encodeEmailHeader('Hello World')).toBe('Hello World')
    expect(encodeEmailHeader('noreply@easydocs.tech')).toBe('noreply@easydocs.tech')
  })

  // ── 2. Hebrew names ────────────────────────────────────────────────────────
  it('encodes Hebrew display name and decodes back without garble', () => {
    const names = [
      'גלבשטיין ליבא',   // the original garbled example from the bug report
      'דבורה גלנברד',
      'ישראל ישראלי',
      'שרה כהן',
    ]
    for (const name of names) {
      const encoded = encodeEmailHeader(name)
      // Must be an RFC 2047 encoded-word (or space-separated words)
      expect(encoded).toMatch(/^(=\?UTF-8\?B\?[A-Za-z0-9+/]+=*\?=)( =\?UTF-8\?B\?[A-Za-z0-9+/]+=*\?=)*$/)
      // Round-trip must produce the original
      expect(decodeRFC2047(encoded)).toBe(name)
    }
  })

  // ── 3. No non-ASCII bytes in the output (the "no gibberish" invariant) ────
  it('encoded output contains only printable ASCII (no gibberish possible)', () => {
    const inputs = [
      'גלבשטיין ליבא',
      'פתח/ה עבורך תיק חדש - test case',
      'שלום! מסמך חדש ממתין לאישורך',
    ]
    for (const input of inputs) {
      const encoded = encodeEmailHeader(input)
      expect(/^[\x20-\x7E ]+$/.test(encoded)).toBe(true)
    }
  })

  // ── 4. Mixed Hebrew + Latin subject lines ─────────────────────────────────
  it('round-trips mixed Hebrew/Latin subject lines', () => {
    const subject = 'דבורה גלנברד פתח/ה עבורך תיק חדש - test'
    expect(decodeRFC2047(encodeEmailHeader(subject))).toBe(subject)
  })

  // ── 5. RFC 2047 §4.2 — each encoded-word ≤ 75 chars ─────────────────────
  it('each encoded-word is at most 75 characters (RFC 2047 §4.2)', () => {
    const long =
      'שלום, זוהי הודעה ארוכה מאוד שמיועדת לבדוק שהמחרוזת מחולקת נכון לפי RFC 2047 כנדרש'
    const words = encodeEmailHeader(long).split(' ')
    for (const word of words) {
      expect(word.length).toBeLessThanOrEqual(75)
    }
    // And the full string round-trips correctly
    expect(decodeRFC2047(words.join(' '))).toBe(long)
  })

  // ── 6. Raw email header format ────────────────────────────────────────────
  it('produces a valid From-header display name (encoded-word <email>)', () => {
    const displayName = 'דבורה גלנברד'
    const fromHeader = `${encodeEmailHeader(displayName)} <noreply@easydocs.tech>`
    // Entire header must be ASCII
    expect(/^[\x20-\x7E]+$/.test(fromHeader)).toBe(true)
    // Must end with the literal email address
    expect(fromHeader.endsWith('<noreply@easydocs.tech>')).toBe(true)
  })
})
