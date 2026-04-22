import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { logCaseActivity } from '@/lib/activityLog';
import { computeCaseStatus } from './CaseStatusBadge';
import type { CaseDocument } from '@/lib/supabase';

interface ReadyForSubmissionButtonProps {
  caseId: string;
  caseTitle: string;
  documents: CaseDocument[];
  onSuccess: () => void;
}

export function ReadyForSubmissionButton({ 
  caseId, 
  caseTitle,
  documents, 
  onSuccess 
}: ReadyForSubmissionButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  const { status } = computeCaseStatus(documents);
  const isReady = status === 'complete';

  const handleSubmit = async () => {
    if (!isReady) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: 'הושלם' })
        .eq('id', caseId);

      if (error) throw error;

      await logCaseActivity(
        caseId,
        'השלמת תיק',
        `התיק "${caseTitle}" סומן כמוכן להגשה`
      );

      toast({
        title: 'התיק מוכן להמשך תהליך',
        description: 'כל המסמכים הושלמו ואושרו',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      onClick={handleSubmit}
      disabled={!isReady || submitting}
      className="gap-2"
      variant={isReady ? 'default' : 'outline'}
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      כל המסמכים הושלמו – מוכן להגשה
    </Button>
  );
}
