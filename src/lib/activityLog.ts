import { supabase } from '@/lib/supabase';

export type ActivityType = 
  | 'העלאת מסמך'
  | 'אישור מסמך'
  | 'דחיית מסמך'
  | 'מחיקת מסמך'
  | 'שליחת תזכורת'
  | 'שליחת לינק'
  | 'השלמת תיק';

export async function logCaseActivity(
  caseId: string,
  actionType: ActivityType,
  description: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('case_activity_log')
      .insert({
        case_id: caseId,
        action_type: actionType,
        description,
      });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
