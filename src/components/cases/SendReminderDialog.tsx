import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { CaseDocument } from '@/lib/supabase';

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: CaseDocument[];
  clientName: string;
  clientEmail: string;
  onSend: (personalMessage: string) => Promise<void>;
  sending: boolean;
}

export function SendReminderDialog({
  open,
  onOpenChange,
  documents,
  clientName,
  clientEmail,
  onSend,
  sending,
}: SendReminderDialogProps) {
  const [personalMessage, setPersonalMessage] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'תקין':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'הועלה':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'לא תקין':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const missingDocs = documents.filter(d => d.review_status === 'חסר' || d.review_status === 'לא תקין');
  const uploadedDocs = documents.filter(d => d.review_status === 'הועלה');
  const approvedDocs = documents.filter(d => d.review_status === 'תקין');

  const handleSend = async () => {
    await onSend(personalMessage);
    setPersonalMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            שליחת תזכורת ללקוח
          </DialogTitle>
          <DialogDescription>
            תזכורת תישלח ל-<strong>{clientName}</strong> ({clientEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Status Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-destructive/10 p-3">
              <div className="text-2xl font-bold text-destructive">{missingDocs.length}</div>
              <div className="text-xs text-muted-foreground">חסר/נדחה</div>
            </div>
            <div className="rounded-lg bg-warning/10 p-3">
              <div className="text-2xl font-bold text-warning">{uploadedDocs.length}</div>
              <div className="text-xs text-muted-foreground">ממתין לבדיקה</div>
            </div>
            <div className="rounded-lg bg-success/10 p-3">
              <div className="text-2xl font-bold text-success">{approvedDocs.length}</div>
              <div className="text-xs text-muted-foreground">אושר</div>
            </div>
          </div>

          {/* Document List */}
          <div className="space-y-2">
            <Label>סטטוס מסמכים</Label>
            <ScrollArea className="h-48 rounded-md border p-3">
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.review_status)}
                      <span className="font-medium">{doc.doc_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={doc.review_status} />
                      {doc.due_date && (
                        <span className="text-xs text-muted-foreground">
                          עד {format(new Date(doc.due_date), 'dd/MM')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="personal-message">הודעה אישית (אופציונלי)</Label>
            <Textarea
              id="personal-message"
              placeholder="הוסף הודעה אישית שתופיע במייל ללקוח..."
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={3}
            />
          </div>

          {missingDocs.length === 0 && (
            <div className="rounded-md bg-success/10 p-3 text-center text-sm text-success">
              אין מסמכים חסרים - כל המסמכים הועלו או אושרו!
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            ביטול
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || missingDocs.length === 0}
            size="lg"
            className="gap-2 bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all text-primary-foreground"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            שלח תזכורת ({missingDocs.length} מסמכים)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
