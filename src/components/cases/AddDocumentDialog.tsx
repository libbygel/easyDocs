import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, FileText, PenTool, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess: () => void;
  defaultTab?: 'upload' | 'signature';
}

export function AddDocumentDialog({
  open,
  onOpenChange,
  caseId,
  onSuccess,
  defaultTab = 'upload',
}: AddDocumentDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'signature'>(defaultTab);
  
  // Sync activeTab with defaultTab when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
    onOpenChange(isOpen);
  };
  
  // Regular document state
  const [docName, setDocName] = useState('');
  const [required, setRequired] = useState(true);
  const [dueDate, setDueDate] = useState('');
  
  // Signature document state
  const [signatureDocName, setSignatureDocName] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmitUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

    // Default due_date to one week from now if not specified
    const effectiveDueDate = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { error } = await supabase.from('case_documents').insert({
      case_id: caseId,
      doc_name: docName.trim(),
      required,
      due_date: effectiveDueDate,
    });

    if (error) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'המסמך נוסף בהצלחה' });
      onOpenChange(false);
      onSuccess();
      resetForm();
    }

    setLoading(false);
  };

  const handleSubmitSignatureDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureFile) {
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
        .eq('doc_name', signatureDocName.trim())
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

      // Create the case document first
      const { data: docData, error: docError } = await supabase
        .from('case_documents')
        .insert({
          case_id: caseId,
          doc_name: signatureDocName.trim(),
          required: true,
          review_status: 'חסר',
          sent_status: 'נשלח',
          document_type: 'signature',
          due_date: defaultDueDate,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Sanitize filename for storage - use UUID to avoid Hebrew char issues
      const ext = signatureFile.name.split('.').pop() || 'pdf';
      const sanitizedFileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const storagePath = `${caseId}/${docData.id}/${sanitizedFileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, signatureFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // Create upload record
      const { error: uploadRecordError } = await supabase.from('uploads').insert({
        case_id: caseId,
        case_document_id: docData.id,
        file_name: signatureFile.name,
        file_url: urlData.publicUrl,
        file_type: signatureFile.type,
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

      toast({ title: 'מסמך לחתימה נוסף בהצלחה' });
      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'שגיאה בהעלאת המסמך',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const resetForm = () => {
    setDocName('');
    setRequired(true);
    setDueDate('');
    setSignatureDocName('');
    setSignatureFile(null);
    setActiveTab('upload');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת מסמך חדש</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'signature')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              מסמך להעלאה
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2">
              <PenTool className="h-4 w-4" />
              מסמך לחתימה
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-4">
            <form onSubmit={handleSubmitUploadDoc} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="docName">שם המסמך</Label>
                <Input
                  id="docName"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="לדוגמה: אישור הכנסה"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="required">מסמך נדרש</Label>
                <Switch
                  id="required"
                  checked={required}
                  onCheckedChange={setRequired}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">תאריך יעד (אופציונלי)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  dir="ltr"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                מסמך זה יופיע בפורטל הלקוח והלקוח יידרש להעלות אותו.
              </p>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="ml-2 h-4 w-4" />
                  )}
                  הוסף מסמך
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  ביטול
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="signature" className="mt-4">
            <form onSubmit={handleSubmitSignatureDoc} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signatureDocName">שם המסמך</Label>
                <Input
                  id="signatureDocName"
                  value={signatureDocName}
                  onChange={(e) => setSignatureDocName(e.target.value)}
                  placeholder="לדוגמה: הסכם שירות"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatureFile">קובץ PDF לחתימה</Label>
                <Input
                  id="signatureFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              {signatureFile && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{signatureFile.name}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                מסמך זה יופיע בפורטל הלקוח והלקוח יידרש לחתום עליו.
              </p>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={loading || !signatureFile} className="flex-1">
                  {loading ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PenTool className="ml-2 h-4 w-4" />
                  )}
                  הוסף מסמך לחתימה
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  ביטול
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
