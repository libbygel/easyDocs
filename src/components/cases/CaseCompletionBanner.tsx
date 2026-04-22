import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, PartyPopper, Trophy } from 'lucide-react';
import { useCelebration, areAllDocumentsApproved } from '@/hooks/useCelebration';

interface Document {
  required: boolean;
  review_status: string;
}

interface CaseCompletionBannerProps {
  documents: Document[];
  onComplete?: () => void;
}

export function CaseCompletionBanner({ documents, onComplete }: CaseCompletionBannerProps) {
  const { triggerOnce, reset } = useCelebration();
  const isComplete = areAllDocumentsApproved(documents);

  useEffect(() => {
    if (isComplete) {
      triggerOnce();
      onComplete?.();
    } else {
      reset();
    }
  }, [isComplete, triggerOnce, reset, onComplete]);

  if (!isComplete) return null;

  return (
    <Card className="border-2 border-success bg-gradient-to-r from-success/10 via-success/5 to-primary/10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
      <CardContent className="py-6">
        <div className="flex items-center justify-center gap-4">
          <div className="hidden sm:flex">
            <PartyPopper className="h-10 w-10 text-success animate-bounce" />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-warning" />
              <h2 className="text-xl font-bold text-success">כל המסמכים אושרו! 🎉</h2>
              <Trophy className="h-6 w-6 text-warning" />
            </div>
            <p className="text-muted-foreground">
              התיק מוכן להמשך טיפול - כל המסמכים הנדרשים נבדקו ואושרו
            </p>
          </div>
          <div className="hidden sm:flex">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
