import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { CaseType, DocTemplate } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText } from 'lucide-react';

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseTypes: CaseType[];
  template: DocTemplate | null;
  onSuccess: () => void;
}

export function EditTemplateDialog({
  open,
  onOpenChange,
  caseTypes,
  template,
  onSuccess,
}: EditTemplateDialogProps) {
  const [docName, setDocName] = useState('');
  const [caseTypeId, setCaseTypeId] = useState('');
  const [defaultRequired, setDefaultRequired] = useState(true);
  const [defaultDueDays, setDefaultDueDays] = useState('');
  const [documentType, setDocumentType] = useState<'request' | 'signature'>('request');
  const [file, setFile] = useState<File | null>(null);
  const [declarationStatement, setDeclarationStatement] = useState('');
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Populate form when template changes
  useEffect(() => {
    if (template) {
      setDocName(template.doc_name);
      setCaseTypeId(template.case_type_id);
      setDefaultRequired(template.default_required);
      setDefaultDueDays(template.default_due_days?.toString() || '');
      setDocumentType((template as any).document_type || 'request');
      setDeclarationStatement((template as any).declaration_statement || '');
      setCurrentFileUrl((template as any).template_file_url || null);
      setFile(null);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !user) return;
    setLoading(true);

    try {
      let templateFileUrl = currentFileUrl;

      // Upload new PDF if provided
      if (file) {
        const ext = file.name.split('.').pop() || 'pdf';
        const sanitizedFileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
        const storagePath = `templates/${user.id}/${caseTypeId}/${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath);

        templateFileUrl = urlData.publicUrl;
      }

      const baseData: any = {
        case_type_id: caseTypeId,
        doc_name: docName,
        default_required: defaultRequired,
        default_due_days: defaultDueDays ? parseInt(defaultDueDays) : null,
        document_type: documentType,
        template_file_url: documentType === 'signature' ? templateFileUrl : null,
        declaration_statement: documentType === 'signature' && declarationStatement.trim() ? declarationStatement.trim() : null,
      };

      const { error } = await supabase.from('doc_templates').update(baseData as any).eq('id', template.id);

      if (error) {
        toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'התבנית עודכנה בהצלחה' });
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>עריכת תבנית מסמך</DialogTitle>
          {documentType === 'signature' && (
            <DialogDescription>
              מסמך לחתימה דורש קובץ PDF שהלקוח יידרש לחתום עליו.
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caseType">סוג תיק</Label>
            <Select value={caseTypeId} onValueChange={setCaseTypeId} required>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג תיק" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {caseTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docName">שם המסמך</Label>
            <Input
              id="docName"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="לדוגמה: תעודת זהות + ספח"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>סוג מסמך</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as 'request' | 'signature')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="request">בקשה מהלקוח</SelectItem>
                <SelectItem value="signature">לחתימה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {documentType === 'signature' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="signatureFile">
                  {currentFileUrl ? 'החלף קובץ PDF' : 'קובץ PDF לחתימה'}
                </Label>
                {currentFileUrl && !file && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">קובץ קיים</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => window.open(currentFileUrl, '_blank')}>
                      צפייה
                    </Button>
                  </div>
                )}
                <Input
                  id="signatureFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                )}
              </div>

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
            </>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="required">נדרש כברירת מחדל</Label>
            <Switch
              id="required"
              checked={defaultRequired}
              onCheckedChange={setDefaultRequired}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDays">ימים לתאריך יעד (אופציונלי)</Label>
            <Input
              id="dueDays"
              type="number"
              min="1"
              value={defaultDueDays}
              onChange={(e) => setDefaultDueDays(e.target.value)}
              placeholder="לדוגמה: 7"
              dir="ltr"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || !caseTypeId} className="flex-1">
              {loading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="ml-2 h-4 w-4" />
              )}
              שמור שינויים
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
