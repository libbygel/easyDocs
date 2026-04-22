import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface DocumentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (note: string) => void;
  docName: string;
}

export function DocumentReviewDialog({
  open,
  onOpenChange,
  onReject,
  docName,
}: DocumentReviewDialogProps) {
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim()) {
      onReject(note);
      setNote('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            דחיית מסמך
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              מסמך: <span className="font-medium text-foreground">{docName}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="note">הערה ללקוח (חובה)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="הסבר ללקוח מדוע המסמך נדחה..."
                required
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" variant="destructive" disabled={!note.trim()}>
              דחה מסמך
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
