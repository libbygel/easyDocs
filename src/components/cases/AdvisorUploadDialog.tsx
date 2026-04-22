import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText } from 'lucide-react';
import { logCaseActivity } from '@/lib/activityLog';

interface AdvisorUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: { id: string; doc_name: string; case_id: string } | null;
  onSuccess: () => void;
}

export function AdvisorUploadDialog({ open, onOpenChange, document, onSuccess }: AdvisorUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !document) return;
    setUploading(true);

    try {
      // Sanitize filename
      const ext = selectedFile.name.split('.').pop() || 'pdf';
      const sanitizedName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const filePath = `${document.case_id}/${document.id}/${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create upload record
      const { error: insertError } = await supabase.from('uploads').insert({
        case_document_id: document.id,
        case_id: document.case_id,
        file_url: urlData.publicUrl,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        uploaded_by: 'יועץ' as const,
      });

      if (insertError) throw insertError;

      // Update document status to uploaded
      await supabase.from('case_documents')
        .update({ review_status: 'הועלה' as const })
        .eq('id', document.id);

      await logCaseActivity(document.case_id, 'העלאת מסמך', `היועץ העלה את "${document.doc_name}"`);

      toast({ title: 'הקובץ הועלה בהצלחה' });
      onOpenChange(false);
      setSelectedFile(null);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'שגיאה בהעלאה', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>העלאת קובץ עבור הלקוח</DialogTitle>
          <DialogDescription>
            העלה קובץ עבור המסמך "{document?.doc_name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          />
          
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">לחץ לבחירת קובץ</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="flex-1 gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              העלה קובץ
            </Button>
            <Button variant="outline" onClick={handleClose}>ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
