import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client, CaseType } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, UserPlus } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { InlineCreateClientDialog } from './InlineCreateClientDialog';

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCaseDialog({ open, onOpenChange, onSuccess }: CreateCaseDialogProps) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [caseTypeId, setCaseTypeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const handleClientCreated = async (newClientId: string) => {
    await fetchData();
    setClientId(newClientId);
    setShowCreateClient(false);
  };

  const fetchData = async () => {
    const [clientsRes, typesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('advisor_id', user!.id).order('full_name'),
      supabase.from('case_types').select('*').eq('advisor_id', user!.id).order('name'),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (typesRes.data) setCaseTypes(typesRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Get client's ID number for auto-password
      const selectedClient = clients.find(c => c.id === clientId);
      const portalPassword = selectedClient?.id_number || null;

      // Create the case with auto portal password
      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert({
          advisor_id: user.id,
          client_id: clientId,
          case_type_id: caseTypeId,
          title,
          status: 'פתוח',
          portal_password: portalPassword,
        } as any)
        .select()
        .single();

      if (caseError) throw caseError;

      // Auto-fetch ALL templates for selected case type and create documents
      if (caseTypeId) {
        const { data: templates } = await supabase
          .from('doc_templates')
          .select('*')
          .eq('case_type_id', caseTypeId);

        if (templates && templates.length > 0) {
          const caseDocuments = templates.map((template: any) => ({
            case_id: newCase.id,
            doc_name: template.doc_name,
            required: template.default_required,
            due_date: template.default_due_days
              ? format(addDays(new Date(), template.default_due_days), 'yyyy-MM-dd')
              : null,
            document_type: template.document_type || 'request',
            declaration_statement: template.declaration_statement || null,
          }));

          const { data: insertedDocs } = await supabase.from('case_documents').insert(caseDocuments).select();

          // For signature templates with a file, create upload records
          if (insertedDocs) {
            for (const template of templates) {
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
      }

      toast({
        title: 'התיק נוצר בהצלחה',
        description: `התיק "${title}" נוצר. ניתן להוסיף/להסיר מסמכים מתוך דף התיק.`,
      });

      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'שגיאה ביצירת תיק',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setClientId('');
    setCaseTypeId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>יצירת תיק חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">כותרת התיק</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: מיחזור משכנתא - כהן"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="client">לקוח</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs gap-1"
                onClick={() => setShowCreateClient(true)}
              >
                <UserPlus className="h-3 w-3" />
                לקוח חדש
              </Button>
            </div>
            <Select value={clientId} onValueChange={setClientId} required>
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
              <p className="text-sm text-muted-foreground">
                אין לקוחות. לחץ על "לקוח חדש" להוספה.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="caseType">סוג תיק (תבנית)</Label>
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
            <p className="text-xs text-muted-foreground">
              כל המסמכים מהתבנית ייווצרו אוטומטית. ניתן לערוך מתוך דף התיק.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || !clientId} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  <Plus className="ml-2 h-4 w-4" />
                  צור תיק
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
          </div>
        </form>

        <InlineCreateClientDialog
          open={showCreateClient}
          onOpenChange={setShowCreateClient}
          onClientCreated={handleClientCreated}
        />
      </DialogContent>
    </Dialog>
  );
}
