/**
 * jsPDF does not support RTL layout. This helper prepares strings for
 * rendering by reversing the entire string so that when jsPDF draws
 * glyphs left-to-right, the visual result reads correctly right-to-left.
 *
 * Mixed content (Hebrew + numbers/English) is handled by:
 * 1. Splitting into runs of Hebrew vs non-Hebrew characters
 * 2. Reversing the order of runs (so RTL overall order is correct)
 * 3. Non-Hebrew runs (numbers, dates, English) keep their internal LTR order
 * 4. Hebrew character runs get their characters reversed individually
 *
 * Example: "לקוח: לוי" → runs are ["לקוח", ": ", "לוי"]
 *   → reversed run order: ["לוי", ": ", "לקוח"]
 *   → each Hebrew run reversed: ["יול", ": ", "חוקל"] — wait, that's wrong.
 *
 * Actually for jsPDF right-aligned text, we need:
 *   The full string reversed so jsPDF draws it RTL.
 *   But numbers/English within must stay LTR.
 *
 * Correct approach: reverse the entire string, then un-reverse non-Hebrew runs.
 */

const HEBREW_CHAR = /[\u0590-\u05FF]/;

export function reverseHebrewRunsForPdf(input: string): string {
  if (!input) return input;
  if (!HEBREW_CHAR.test(input)) return input;

  // Split into runs of Hebrew vs non-Hebrew
  const runs: { text: string; isHebrew: boolean }[] = [];
  let currentRun = '';
  let currentIsHebrew = false;

  for (const ch of input) {
    const isHeb = HEBREW_CHAR.test(ch);
    if (currentRun.length === 0) {
      currentIsHebrew = isHeb;
      currentRun = ch;
      continue;
    }
    // Treat spaces adjacent to Hebrew as part of the flow
    if (ch === ' ' || isHeb === currentIsHebrew) {
      currentRun += ch;
    } else {
      runs.push({ text: currentRun, isHebrew: currentIsHebrew });
      currentIsHebrew = isHeb;
      currentRun = ch;
    }
  }
  if (currentRun) {
    runs.push({ text: currentRun, isHebrew: currentIsHebrew });
  }

  // Reverse the order of all runs (RTL visual order)
  runs.reverse();

  // Build the output: Hebrew runs need character reversal, non-Hebrew stay as-is
  return runs.map(r => {
    if (r.isHebrew) {
      return r.text.split('').reverse().join('');
    }
    return r.text;
  }).join('');
}
