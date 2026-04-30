import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdvisorName } from '@/hooks/useAdvisorName';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PenTool, FileText, Send, CheckCircle, Copy } from 'lucide-react';

interface AddSignatureDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  portalToken?: string;
  clientEmail?: string;
  clientName?: string;
  caseTitle?: string;
  onSuccess: () => void;
}

export function AddSignatureDocumentDialog({
  open,
  onOpenChange,
  caseId,
  portalToken,
  clientEmail,
  clientName,
  caseTitle,
  onSuccess,
}: AddSignatureDocumentDialogProps) {
  const [docName, setDocName] = useState('');
  const [declarationStatement, setDeclarationStatement] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const advisorName = useAdvisorName();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור קובץ PDF',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate name
      const { data: existing } = await supabase
        .from('case_documents')
        .select('id')
        .eq('case_id', caseId)
        .eq('doc_name', docName.trim())
        .maybeSingle();

      if (existing) {
        toast({
          title: 'שגיאה',
          description: 'כבר קיים מסמך בשם זה בתיק',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Default due_date to one week from now
      const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create the case document first (with declaration_statement and sent_status)
      const { data: docData, error: docError } = await supabase
        .from('case_documents')
        .insert({
          case_id: caseId,
          doc_name: docName.trim(),
          required: true,
          review_status: 'חסר',
          sent_status: 'נשלח',
          declaration_statement: declarationStatement.trim() || null,
          document_type: 'signature',
          due_date: defaultDueDate,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Sanitize filename for storage - use UUID to avoid Hebrew char issues
      const ext = file.name.split('.').pop() || 'pdf';
      const sanitizedFileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const storagePath = `${caseId}/${docData.id}/${sanitizedFileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // Create upload record
      const { error: uploadRecordError } = await supabase.from('uploads').insert({
        case_id: caseId,
        case_document_id: docData.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        uploaded_by: 'יועץ',
      });

      if (uploadRecordError) throw uploadRecordError;

      // Update document with last_upload_id
      const { data: uploadData } = await supabase
        .from('uploads')
        .select('id')
        .eq('case_document_id', docData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (uploadData) {
        await supabase
          .from('case_documents')
          .update({ last_upload_id: uploadData.id })
          .eq('id', docData.id);
      }

      setSuccess(true);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'שגיאה בהעלאת המסמך',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const handleSendLink = async () => {
    if (!portalToken || !clientEmail) return;
    setSendingLink(true);
    try {
      const portalLink = `${window.location.origin}/portal/${portalToken}`;
      const response = await invokeEdgeFunction('send-portal-link', {
        clientName: clientName || 'לקוח',
        clientEmail,
        caseTitle: caseTitle || '',
        portalLink,
        advisorEmail: user?.email || '',
        advisorName,
        emailType: 'new_document',
      });
      if (response?.error) throw new Error(response.error);

      toast({ title: 'הקישור נשלח ללקוח בהצלחה' });
      handleClose();
    } catch (error: any) {
      toast({
        title: 'שגיאה בשליחת הקישור',
        description: error.message,
        variant: 'destructive',
      });
    }
    setSendingLink(false);
  };

  const handleCopyLink = () => {
    if (!portalToken) return;
    const link = `${window.location.origin}/portal/${portalToken}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'הקישור הועתק',
      description: 'ניתן לשלוח ללקוח',
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setDocName('');
      setDeclarationStatement('');
      setFile(null);
      setSuccess(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת מסמך לחתימה</DialogTitle>
          <DialogDescription>
            מסמך זה יופיע בפורטל הלקוח והלקוח יידרש לחתום עליו.
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docName">שם המסמך</Label>
              <Input
                id="docName"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="לדוגמה: הסכם שירות"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="declarationStatement">הצהרה (אופציונלי)</Label>
              <Textarea
                id="declarationStatement"
                value={declarationStatement}
                onChange={(e) => setDeclarationStatement(e.target.value)}
                placeholder="הזן טקסט הצהרה שיופיע בדף החתימה (לדוגמה: אני מאשר/ת שקראתי והבנתי את תוכן המסמך...)"
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                טקסט זה יופיע בדף החתימה יחד עם פרטי החותם
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signatureFile">קובץ PDF לחתימה</Label>
              <Input
                id="signatureFile"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading || !file} className="flex-1">
                {loading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <PenTool className="ml-2 h-4 w-4" />
                )}
                הוסף מסמך לחתימה
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                ביטול
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium">המסמך נוסף בהצלחה!</p>
            
            <div className="space-y-3">
              {portalToken && (
                <Button 
                  onClick={handleCopyLink} 
                  variant="outline" 
                  className="w-full gap-2"
                >
                  <Copy className="h-4 w-4" />
                  העתק קישור לפורטל
                </Button>
              )}
              
              {clientEmail && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    האם לשלוח את קישור הפורטל ללקוח?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleSendLink} disabled={sendingLink} className="gap-2">
                      {sendingLink ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      שלח קישור ללקוח
                    </Button>
                    <Button variant="outline" onClick={handleClose}>
                      סגור
                    </Button>
                  </div>
                </div>
              )}
              
              {!clientEmail && (
                <Button variant="outline" onClick={handleClose}>
                  סגור
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
