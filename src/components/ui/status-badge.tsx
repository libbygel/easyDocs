import { cn } from '@/lib/utils';
import { Check, X, Clock, AlertCircle, FileUp, PenTool } from 'lucide-react';
import type { ReviewStatus, CaseStatus, SentStatus } from '@/lib/supabase';

interface StatusBadgeProps {
  status: ReviewStatus | CaseStatus | SentStatus;
  className?: string;
}

const reviewStatusConfig: Record<ReviewStatus, { label: string; className: string; icon: typeof Check }> = {
  'חסר': { label: 'חסר', className: 'status-error', icon: AlertCircle },
  'הועלה': { label: 'הועלה', className: 'status-info', icon: FileUp },
  'תקין': { label: 'תקין', className: 'status-success', icon: Check },
  'לא תקין': { label: 'לא תקין', className: 'status-error', icon: X },
  'נחתם': { label: 'נחתם', className: 'status-info', icon: PenTool },
};

const caseStatusConfig: Record<CaseStatus, { label: string; className: string; icon: typeof Check }> = {
  'פתוח': { label: 'פתוח', className: 'status-info', icon: Clock },
  'ממתין למסמכים': { label: 'ממתין למסמכים', className: 'status-warning', icon: Clock },
  'בבדיקה': { label: 'ממתין לאישור היועץ', className: 'status-info', icon: Clock },
  'הושלם': { label: 'הושלם – כל המסמכים אושרו', className: 'status-success', icon: Check },
  'מוקפא': { label: 'מוקפא', className: 'status-pending', icon: AlertCircle },
};

const sentStatusConfig: Record<SentStatus, { label: string; className: string; icon: typeof Check }> = {
  'לא נשלח': { label: 'לא נשלח', className: 'status-pending', icon: Clock },
  'נשלח': { label: 'נשלח', className: 'status-success', icon: Check },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = 
    (reviewStatusConfig[status as ReviewStatus]) || 
    (caseStatusConfig[status as CaseStatus]) || 
    (sentStatusConfig[status as SentStatus]);

  if (!config) return null;

  const Icon = config.icon;

  return (
    <span className={cn('status-badge', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
