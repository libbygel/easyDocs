import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CaseDocument, Upload } from '@/lib/supabase';
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
import { Loader2, Upload as UploadIcon, FileText } from 'lucide-react';

type DocumentWithUpload = CaseDocument & { uploads: Upload[] };

interface UploadSignaturePdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentWithUpload | null;
  onSuccess: () => void;
}

export function UploadSignaturePdfDialog({
  open,
  onOpenChange,
  document,
  onSuccess,
}: UploadSignaturePdfDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [declarationStatement, setDeclarationStatement] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !document) return;

    setLoading(true);

    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const sanitizedFileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const storagePath = `${document.case_id}/${document.id}/${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      const { error: uploadRecordError } = await supabase.from('uploads').insert({
        case_id: document.case_id,
        case_document_id: document.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        uploaded_by: 'יועץ',
      });

      if (uploadRecordError) throw uploadRecordError;

      // Update document with declaration and sent_status
      const updateData: any = { sent_status: 'נשלח' };
      if (declarationStatement.trim()) {
        updateData.declaration_statement = declarationStatement.trim();
      }

      // Get the upload ID for last_upload_id
      const { data: uploadData } = await supabase
        .from('uploads')
        .select('id')
        .eq('case_document_id', document.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (uploadData) {
        updateData.last_upload_id = uploadData.id;
      }

      await supabase
        .from('case_documents')
        .update(updateData)
        .eq('id', document.id);

      toast({ title: 'הקובץ הועלה בהצלחה', description: `PDF לחתימה הועלה למסמך "${document.doc_name}"` });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'שגיאה בהעלאת הקובץ',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFile(null);
      setDeclarationStatement('');
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>העלאת PDF לחתימה — {document?.doc_name}</DialogTitle>
          <DialogDescription>
            העלה את קובץ ה-PDF שהלקוח יידרש לחתום עליו בפורטל.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signaturePdf">קובץ PDF</Label>
            <Input
              id="signaturePdf"
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

          {!document?.declaration_statement && (
            <div className="space-y-2">
              <Label htmlFor="declaration">הצהרה (אופציונלי)</Label>
              <Textarea
                id="declaration"
                value={declarationStatement}
                onChange={(e) => setDeclarationStatement(e.target.value)}
                placeholder="טקסט הצהרה שיופיע בדף החתימה..."
                className="min-h-[80px]"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading || !file} className="flex-1 gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
              העלה PDF
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
