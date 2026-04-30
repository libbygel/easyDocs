/**
 * Hebrew text handling for jsPDF using the Assistant.ttf font.
 *
 * The Assistant TTF font handles Hebrew glyph rendering correctly when the
 * characters arrive in logical (typed) order. jsPDF still draws strings
 * left-to-right, so for RIGHT-aligned Hebrew text we need to:
 *  1. Keep Hebrew character order intact (do NOT reverse characters).
 *  2. Reverse only the order of "runs" so that mixed Hebrew + Latin/digits
 *     content appears correctly when read right-to-left.
 *
 * Example: "לקוח: דניאל 123"
 *   Runs (logical): ["לקוח", ": ", "דניאל ", "123"]
 *   Visual RTL order needs runs printed left-to-right as:
 *     "123" + " דניאל" + " :" + "לקוח"  →  but Hebrew runs stay intact.
 *
 * Reversing characters (the previous behavior) caused double-reversal because
 * the Assistant font already shapes Hebrew correctly — the result was words
 * like "שלום" appearing as "םולש".
 */

const HEBREW_CHAR = /[\u0590-\u05FF]/;
const DIGIT_OR_LATIN = /[A-Za-z0-9]/;

export function reverseHebrewRunsForPdf(input: string): string {
  if (!input) return input;
  if (!HEBREW_CHAR.test(input)) return input;

  // Classify each char: 'heb' | 'ltr' | 'neutral'
  type Kind = 'heb' | 'ltr' | 'neutral';
  const classify = (ch: string): Kind => {
    if (HEBREW_CHAR.test(ch)) return 'heb';
    if (DIGIT_OR_LATIN.test(ch)) return 'ltr';
    return 'neutral';
  };

  // Build runs of consecutive same-kind characters.
  const runs: { text: string; kind: Kind }[] = [];
  for (const ch of input) {
    const k = classify(ch);
    const last = runs[runs.length - 1];
    if (last && last.kind === k) last.text += ch;
    else runs.push({ text: ch, kind: k });
  }

  // Attach neutral runs to the surrounding strong-direction run so that
  // punctuation/spaces flow with their context.
  const merged: { text: string; kind: Kind }[] = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (r.kind !== 'neutral') {
      merged.push({ ...r });
      continue;
    }
    const prev = merged[merged.length - 1];
    const next = runs[i + 1];
    if (prev && prev.kind === 'heb' && (!next || next.kind !== 'ltr')) {
      prev.text += r.text;
    } else if (next && next.kind === 'heb' && (!prev || prev.kind !== 'ltr')) {
      // Prepend to next Hebrew run by buffering — handle by pushing a neutral
      // run that will merge with the next Hebrew run on next iteration.
      runs[i + 1] = { text: r.text + next.text, kind: 'heb' };
    } else if (prev) {
      prev.text += r.text;
    } else {
      merged.push({ ...r });
    }
  }

  // Reverse run order for RTL visual output, but keep characters within
  // each run in their original logical order (the font handles shaping).
  merged.reverse();
  return merged.map((r) => r.text).join('');
}
