import { supabase } from '@/lib/supabase';
import type { CaseDocument } from '@/lib/supabase';
import { logCaseActivity } from '@/lib/activityLog';

type CaseStatus = 'פתוח' | 'ממתין למסמכים' | 'בבדיקה' | 'הושלם' | 'מוקפא' | 'הוגש';

/**
 * Derive the appropriate case status from the current document states.
 * Rules (only required documents are considered):
 *  - any document is rejected (לא תקין) → "בבדיקה" (advisor review needed)
 *  - any document is missing (חסר)      → "ממתין למסמכים"
 *  - any document is uploaded (הועלה)   → "בבדיקה" (waiting for advisor)
 *  - all required docs approved (תקין)  → "הושלם"
 *  - no required docs                   → keep current status (no change)
 */
export function deriveCaseStatus(
  documents: Pick<CaseDocument, 'required' | 'review_status'>[],
  current: CaseStatus | undefined,
): CaseStatus | null {
  // Never override frozen or submitted cases automatically.
  if (current === 'מוקפא' || current === 'הוגש') return null;

  const required = documents.filter((d) => d.required);
  if (required.length === 0) return null;

  const hasRejected = required.some((d) => d.review_status === 'לא תקין');
  const hasMissing = required.some((d) => d.review_status === 'חסר');
  const hasUploaded = required.some(
    (d) => d.review_status === 'הועלה' || d.review_status === 'נחתם',
  );
  const allApproved = required.every((d) => d.review_status === 'תקין');

  if (allApproved) return 'הושלם';
  if (hasRejected) return 'בבדיקה';
  if (hasUploaded) return 'בבדיקה';
  if (hasMissing) return 'ממתין למסמכים';
  return null;
}

/**
 * Update cases.status in the DB if it has changed based on document states.
 * Logs an activity entry on transition. Safe to call even when no change is needed.
 */
export async function syncCaseStatus(
  caseId: string | undefined,
  documents: Pick<CaseDocument, 'required' | 'review_status'>[],
  currentStatus: CaseStatus | undefined,
): Promise<void> {
  if (!caseId) return;
  const next = deriveCaseStatus(documents, currentStatus);
  if (!next || next === currentStatus) return;

  const { error } = await supabase
    .from('cases')
    .update({ status: next })
    .eq('id', caseId);

  if (error) {
    console.error('Failed to sync case status', error);
    return;
  }

  // Only log when the case is fully completed — other transitions are noisy.
  if (next === 'הושלם') {
    try {
      await logCaseActivity(
        caseId,
        'השלמת תיק',
        `כל המסמכים הנדרשים אושרו — התיק עבר אוטומטית לסטטוס "הושלם"`,
      );
    } catch (_) {
      // Activity log failures should not break status updates.
    }
  }
}