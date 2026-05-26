import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdvisorName } from '@/hooks/useAdvisorName';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { logCaseActivity } from '@/lib/activityLog';
import { absoluteAppUrl } from '@/lib/appUrl';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Send, CheckCircle, Copy, Upload, FileText, X, Pencil } from 'lucide-react';

interface AttachedFile {
  file: File;
  displayName: string;
  editing: boolean;
}

interface AddUploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  portalToken?: string;
  clientEmail?: string;
  clientName?: string;
  caseTitle?: string;
  onSuccess: () => void;
}

export function AddUploadDocumentDialog({
  open,
  onOpenChange,
  caseId,
  portalToken,
  clientEmail,
  clientName,
  caseTitle,
  onSuccess,
}: AddUploadDocumentDialogProps) {
  const [mode, setMode] = useState<'request' | 'upload'>('request');
  const [docName, setDocName] = useState('');
  const [required, setRequired] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const { user } = useAuth();
  const advisorName = useAdvisorName();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const effectiveDueDate = () => dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Mode 1: Add a document request (client needs to upload)
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: existing } = await supabase
      .from('case_documents')
      .select('id')
      .eq('case_id', caseId)
      .eq('doc_name', docName.trim())
      .maybeSingle();

    if (existing) {
      toast({ title: 'שגיאה', description: 'כבר קיים מסמך בשם זה בתיק', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('case_documents').insert({
      case_id: caseId,
      doc_name: docName.trim(),
      required,
      due_date: effectiveDueDate(),
      document_type: 'request',
      review_status: 'חסר' as const,
    });

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    onSuccess();
  };

  // Mode 2: Upload files — each file becomes a separate document
  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attachedFiles.length === 0) return;
    setLoading(true);

    let successCount = 0;
    for (const af of attachedFiles) {
      const fileDocName = af.displayName.replace(/\.[^/.]+$/, '');

      const { data: existing } = await supabase
        .from('case_documents')
        .select('id')
        .eq('case_id', caseId)
        .eq('doc_name', fileDocName)
        .maybeSingle();

      const finalDocName = existing ? `${fileDocName} (${Date.now()})` : fileDocName;

      const { data: insertedDoc, error } = await supabase.from('case_documents').insert({
        case_id: caseId,
        doc_name: finalDocName,
        required,
        due_date: effectiveDueDate(),
        document_type: 'request',
        review_status: 'הועלה' as const,
      }).select('id').single();

      if (error || !insertedDoc) continue;

      try {
        const ext = af.file.name.split('.').pop() || 'pdf';
        const sanitizedName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const filePath = `${caseId}/${insertedDoc.id}/${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, af.file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        await supabase.from('uploads').insert({
          case_document_id: insertedDoc.id,
          case_id: caseId,
          file_url: urlData.publicUrl,
          file_name: af.displayName,
          file_type: af.file.type,
          uploaded_by: 'יועץ' as const,
        });
        successCount++;
      } catch (uploadErr: any) {
        toast({ title: `שגיאה בהעלאת "${af.displayName}"`, description: uploadErr.message, variant: 'destructive' });
      }
    }

    if (successCount > 0) {
      await logCaseActivity(caseId, 'העלאת מסמך', `היועץ העלה ${successCount} מסמכים`);
    }

    setSuccess(true);
    setLoading(false);
    onSuccess();
  };

  const handleSendLink = async () => {
    if (!portalToken || !clientEmail) return;
    setSendingLink(true);
    try {
      const portalLink = absoluteAppUrl(`/portal/${portalToken}`);
      const response = await invokeEdgeFunction('send-portal-link', {
        clientName: clientName || 'לקוח',
        clientEmail,
        caseTitle: caseTitle || '',
        portalLink,
        advisorEmail: user?.email || '',
        advisorName,
        emailType: 'new_document',
      });
      if (response?.error) throw new Error(response.error.message);
      await supabase
        .from('cases')
        .update({ last_portal_link_sent_at: new Date().toISOString() } as any)
        .eq('id', caseId);
      toast({ title: 'הקישור נשלח ללקוח בהצלחה' });
      handleClose();
    } catch (error: any) {
      toast({ title: 'שגיאה בשליחת הקישור', description: error.message, variant: 'destructive' });
    }
    setSendingLink(false);
  };

  const handleCopyLink = () => {
    if (!portalToken) return;
    const link = absoluteAppUrl(`/portal/${portalToken}`);
    navigator.clipboard.writeText(link);
    toast({ title: 'הקישור הועתק', description: 'ניתן לשלוח ללקוח' });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setDocName('');
      setRequired(true);
      setDueDate('');
      setAttachedFiles([]);
      setSuccess(false);
      setMode('request');
    }, 200);
  };

  const handleAddAnother = () => {
    setSuccess(false);
    setDocName('');
    setAttachedFiles([]);
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: AttachedFile[] = Array.from(files).map(f => ({
      file: f,
      displayName: f.name,
      editing: false,
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleEdit = (index: number) => {
    setAttachedFiles(prev => prev.map((f, i) => i === index ? { ...f, editing: !f.editing } : f));
  };

  const handleRenameFile = (index: number, newName: string) => {
    setAttachedFiles(prev => prev.map((f, i) => i === index ? { ...f, displayName: newName } : f));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {!success ? (
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'request' | 'upload')}>
            <DialogHeader>
              <DialogTitle>הוספת מסמכים</DialogTitle>
              <DialogDescription>
                בחר האם לבקש מסמך מהלקוח או להעלות קבצים בעצמך.
              </DialogDescription>
            </DialogHeader>

            <TabsList className="grid w-full grid-cols-2 mt-2">
              <TabsTrigger value="request" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                בקשת מסמך מלקוח
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                העלאת קבצים
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Request document from client */}
            <TabsContent value="request">
              <form onSubmit={handleSubmitRequest} className="space-y-4">
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
                  <Switch id="required" checked={required} onCheckedChange={setRequired} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">תאריך יעד (אופציונלי)</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} dir="ltr" />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
                    הוסף בקשה
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClose}>ביטול</Button>
                </div>
              </form>
            </TabsContent>

            {/* Tab 2: Upload files (each becomes a separate document) */}
            <TabsContent value="upload">
              <form onSubmit={handleSubmitUpload} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  כל קובץ ייצור מסמך נפרד ברשימה. ניתן לשנות את שם המסמך לפני השמירה.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  multiple
                  onChange={handleAddFiles}
                />

                {attachedFiles.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {attachedFiles.map((af, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 border rounded-lg bg-accent/30 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          {af.editing ? (
                            <Input
                              value={af.displayName}
                              onChange={(e) => handleRenameFile(index, e.target.value)}
                              onBlur={() => handleToggleEdit(index)}
                              onKeyDown={(e) => e.key === 'Enter' && handleToggleEdit(index)}
                              className="h-7 text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium break-all line-clamp-2">{af.displayName}</span>
                          )}
                          <span className="text-xs text-muted-foreground">({(af.file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleToggleEdit(index)} title="שנה שם">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveFile(index)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {attachedFiles.length > 0 ? 'הוסף קבצים נוספים' : 'בחר קבצים'}
                </Button>

                <div className="flex items-center justify-between">
                  <Label htmlFor="required-upload">מסמך נדרש</Label>
                  <Switch id="required-upload" checked={required} onCheckedChange={setRequired} />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={loading || attachedFiles.length === 0} className="flex-1">
                    {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
                    העלה {attachedFiles.length > 0 ? `${attachedFiles.length} מסמכים` : ''}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClose}>ביטול</Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <p className="font-medium">
              {mode === 'upload' ? `${attachedFiles.length} מסמכים נוספו בהצלחה!` : 'המסמך נוסף בהצלחה!'}
            </p>
            
            <div className="space-y-3">
              <Button onClick={handleAddAnother} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                הוסף מסמך נוסף
              </Button>

              {portalToken && (
                <Button onClick={handleCopyLink} variant="outline" className="w-full gap-2">
                  <Copy className="h-4 w-4" />
                  העתק קישור לפורטל
                </Button>
              )}
              
              {clientEmail && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">האם לשלוח את קישור הפורטל ללקוח?</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleSendLink} disabled={sendingLink} className="gap-2">
                      {sendingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      שלח קישור ללקוח
                    </Button>
                    <Button variant="outline" onClick={handleClose}>סגור</Button>
                  </div>
                </div>
              )}
              
              {!clientEmail && (
                <Button variant="outline" onClick={handleClose}>סגור</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
