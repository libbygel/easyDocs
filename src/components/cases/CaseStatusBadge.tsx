import { cn } from '@/lib/utils';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import type { CaseDocument } from '@/lib/supabase';

interface CaseStatusBadgeProps {
  documents: CaseDocument[];
  className?: string;
}

type CaseStatusType = 'rejected' | 'pending' | 'complete';

interface StatusConfig {
  label: string;
  icon: typeof AlertCircle;
  className: string;
}

const statusConfig: Record<CaseStatusType, StatusConfig> = {
  rejected: {
    label: 'יש מסמכים שנדחו',
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  pending: {
    label: '', // Will be set dynamically
    icon: Clock,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  complete: {
    label: 'כל המסמכים תקינים – מוכן להמשך טיפול',
    icon: CheckCircle,
    className: 'bg-success/10 text-success border-success/20',
  },
};

export function computeCaseStatus(documents: CaseDocument[]): {
  status: CaseStatusType;
  pendingCount: number;
  rejectedCount: number;
  validCount: number;
} {
  const requiredDocs = documents.filter(d => d.required);
  
  const rejectedCount = requiredDocs.filter(d => d.review_status === 'לא תקין').length;
  const pendingCount = requiredDocs.filter(d => 
    d.review_status === 'חסר' || d.review_status === 'הועלה'
  ).length;
  const validCount = requiredDocs.filter(d => d.review_status === 'תקין').length;

  let status: CaseStatusType;
  
  if (rejectedCount > 0) {
    status = 'rejected';
  } else if (pendingCount > 0 || requiredDocs.length === 0) {
    status = 'pending';
  } else {
    status = 'complete';
  }

  return { status, pendingCount, rejectedCount, validCount };
}

export function CaseStatusBadge({ documents, className }: CaseStatusBadgeProps) {
  const { status, pendingCount } = computeCaseStatus(documents);
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const label = status === 'pending' 
    ? (documents.filter(d => d.required).length === 0 ? 'טרם הוספו מסמכים' : `ממתין ל-${pendingCount} מסמכים`)
    : config.label;

  return (
    <div 
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border text-base font-medium',
        config.className,
        className
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
