import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import type { CaseType, DocTemplate, Client } from '@/lib/supabase';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Check, Copy, ExternalLink, CheckCircle, Mail } from 'lucide-react';
import { addDays, format } from 'date-fns';

type TemplateWithType = DocTemplate & {
  case_types: CaseType | null;
};

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseTypes: CaseType[];
  templates: TemplateWithType[];
}

export function CreateFormDialog({
  open,
  onOpenChange,
  caseTypes,
  templates,
}: CreateFormDialogProps) {
  const [step, setStep] = useState(1);
  const [caseTypeId, setCaseTypeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [portalLink, setPortalLink] = useState('');
  const [createdCaseTitle, setCreatedCaseTitle] = useState('');
  const [selectedClientEmail, setSelectedClientEmail] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      supabase.from('clients').select('*').eq('advisor_id', user.id).order('full_name').then(({ data }) => {
        if (data) setClients(data);
      });
    }
  }, [open, user]);

  // Filter templates by selected case type
  const typeTemplates = templates.filter(t => t.case_type_id === caseTypeId);

  // When case type changes, auto-select required documents
  useEffect(() => {
    if (caseTypeId) {
      const filteredTemplates = templates.filter(t => t.case_type_id === caseTypeId);
      const requiredIds = filteredTemplates
        .filter(t => t.default_required)
        .map(t => t.id);
      setSelectedDocs(new Set(requiredIds));
    } else {
      setSelectedDocs(new Set());
    }
  }, [caseTypeId, templates]);

  const toggleDoc = (id: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDocs(newSet);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Create the case
      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert({
          advisor_id: user.id,
          client_id: clientId,
          case_type_id: caseTypeId,
          title,
          status: 'פתוח',
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Create case documents from selected templates
      const selectedTemplatesList = typeTemplates.filter(t => selectedDocs.has(t.id));
      
      if (selectedTemplatesList.length > 0) {
        const caseDocuments = selectedTemplatesList.map((template) => ({
          case_id: newCase.id,
          doc_name: template.doc_name,
          required: template.default_required,
          due_date: template.default_due_days
            ? format(addDays(new Date(), template.default_due_days), 'yyyy-MM-dd')
            : null,
          document_type: (template as any).document_type || 'request',
          declaration_statement: (template as any).declaration_statement || null,
        }));

        const { data: insertedDocs } = await supabase.from('case_documents').insert(caseDocuments).select();

        // For signature templates with a file, create upload records
        if (insertedDocs) {
          for (const template of selectedTemplatesList) {
            if ((template as any).template_file_url && (template as any).document_type === 'signature') {
              const matchingDoc = insertedDocs.find((d: any) => d.doc_name === template.doc_name);
              if (matchingDoc) {
                const fileName = (template as any).template_file_url.split('/').pop() || 'document.pdf';
                const { data: uploadRecord } = await supabase.from('uploads').insert({
                  case_id: newCase.id,
                  case_document_id: matchingDoc.id,
                  file_name: fileName,
                  file_url: (template as any).template_file_url,
                  file_type: 'application/pdf',
                  uploaded_by: 'יועץ',
                }).select().single();

                if (uploadRecord) {
                  await supabase
                    .from('case_documents')
                    .update({ last_upload_id: uploadRecord.id, sent_status: 'נשלח' } as any)
                    .eq('id', matchingDoc.id);
                }
              }
            }
          }
        }
      }

      // Store client details for email
      const selectedClient = clients.find(c => c.id === clientId);
      setSelectedClientEmail(selectedClient?.email || '');
      setSelectedClientName(selectedClient?.full_name || '');

      // Generate portal link and show success screen
      const link = `${window.location.origin}/portal/${newCase.portal_token}`;
      setPortalLink(link);
      setCreatedCaseTitle(title);
      setStep(3); // Go to success step
    } catch (error: any) {
      toast({
        title: 'שגיאה ביצירת הטופס',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink);
    toast({
      title: 'הקישור הועתק!',
      description: 'ניתן לשלוח ללקוח',
    });
  };

  const resetForm = () => {
    setStep(1);
    setCaseTypeId('');
    setClientId('');
    setTitle('');
    setSelectedDocs(new Set());
    setPortalLink('');
    setCreatedCaseTitle('');
    setSelectedClientEmail('');
    setSelectedClientName('');
  };

  const sendEmailToClient = async () => {
    if (!selectedClientEmail) {
      toast({
        title: 'אין כתובת מייל',
        description: 'ללקוח זה לא הוגדרה כתובת מייל',
        variant: 'destructive',
      });
      return;
    }

    setSendingEmail(true);
    try {
      const response = await invokeEdgeFunction('send-portal-link', {
        clientName: selectedClientName,
        clientEmail: selectedClientEmail,
        caseTitle: createdCaseTitle,
        portalLink,
        advisorEmail: user?.email || '',
        emailType: 'new_case',
      });
      const error = response?.error;

      if (error) {
        throw error;
      }

      toast({
        title: 'המייל נשלח בהצלחה!',
        description: `הקישור נשלח ל-${selectedClientEmail}`,
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה בשליחת המייל',
        description: error?.message || 'שגיאה בלתי צפויה',
        variant: 'destructive',
      });
    }
    setSendingEmail(false);
  };

  const selectedTypeName = caseTypes.find(t => t.id === caseTypeId)?.name;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 3 ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                הטופס נוצר בהצלחה!
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-primary" />
                צור טופס להעלאת מסמכים
              </>
            )}
          </DialogTitle>
          {step !== 3 && (
            <DialogDescription>
              {step === 1 && 'בחר סוג תיק ולקוח'}
              {step === 2 && 'בחר אילו מסמכים לכלול בטופס'}
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="caseType">סוג תיק</Label>
              <Select value={caseTypeId} onValueChange={setCaseTypeId}>
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
              <Label htmlFor="client">לקוח</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">אין לקוחות. צור לקוח חדש קודם.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">כותרת התיק</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="לדוגמה: מיחזור משכנתא - כהן"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setStep(2)}
                disabled={!caseTypeId || !clientId || !title}
                className="flex-1"
              >
                המשך לבחירת מסמכים
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>סוג תיק:</strong> {selectedTypeName}</p>
              <p><strong>לקוח:</strong> {clients.find(c => c.id === clientId)?.full_name}</p>
            </div>

            {typeTemplates.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>אין תבניות מסמכים לסוג תיק זה</p>
                <p className="text-sm mt-1">צור תבניות קודם בדף תבניות מסמכים</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <p className="text-sm text-muted-foreground mb-3">
                  בחר את המסמכים שיופיעו בטופס:
                </p>
                {typeTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDocs.has(template.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleDoc(template.id)}
                  >
                    <Checkbox
                      checked={selectedDocs.has(template.id)}
                      onCheckedChange={() => toggleDoc(template.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{template.doc_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.default_required && 'נדרש'}
                        {template.default_required && template.default_due_days && ' • '}
                        {template.default_due_days && `${template.default_due_days} ימים`}
                      </p>
                    </div>
                    {selectedDocs.has(template.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={loading || selectedDocs.size === 0}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="ml-2 h-4 w-4" />
                )}
                צור טופס ({selectedDocs.size} מסמכים)
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                חזרה
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="font-semibold text-lg">הטופס נוצר בהצלחה!</h3>
              <p className="text-muted-foreground mt-1">
                תיק: {createdCaseTitle}
              </p>
            </div>

            <div className="space-y-3">
              <Label>קישור לטופס ללקוח:</Label>
              <div className="flex gap-2">
                <Input
                  value={portalLink}
                  readOnly
                  dir="ltr"
                  className="text-left text-sm"
                />
                <Button onClick={copyPortalLink} variant="outline" className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={sendEmailToClient}
                disabled={sendingEmail || !selectedClientEmail}
                className="gap-2"
              >
                {sendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                שלח למייל של הלקוח
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(portalLink, '_blank')}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  צפה בטופס
                </Button>
                <Button
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  סיום
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
