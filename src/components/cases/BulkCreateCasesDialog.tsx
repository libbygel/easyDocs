import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FolderPlus, Search } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { useAdvisorName } from '@/hooks/useAdvisorName';
import { absoluteAppUrl } from '@/lib/appUrl';

interface BulkCreateCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ClientRow {
  id: string;
  full_name: string;
  id_number: string | null;
  category_id: string | null;
  email: string | null;
}

export function BulkCreateCasesDialog({ open, onOpenChange, onSuccess }: BulkCreateCasesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const advisorName = useAdvisorName();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [caseTypes, setCaseTypes] = useState<{ id: string; name: string }[]>([]);
  const [titleTemplate, setTitleTemplate] = useState('');
  const [caseTypeId, setCaseTypeId] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [autoSendPortal, setAutoSendPortal] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    setSelected(new Set());
    setSearch('');
    setFilterCategory('all');
    setTitleTemplate('{סוג} - {שם}');
    setCaseTypeId('');
    setAutoSendPortal(true);
    Promise.all([
      supabase.from('clients').select('id, full_name, id_number, category_id, email').eq('advisor_id', user.id).order('full_name'),
      supabase.from('client_categories' as any).select('id, name').eq('advisor_id', user.id).order('name'),
      supabase.from('case_types').select('id, name').eq('advisor_id', user.id).order('name'),
    ]).then(([cRes, catRes, ctRes]) => {
      setClients(((cRes.data as any) || []) as ClientRow[]);
      setCategories(((catRes.data as any) || []) as any);
      setCaseTypes((ctRes.data as any) || []);
    });
  }, [open, user]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch = !search.trim() || c.full_name.includes(search.trim()) || (c.id_number || '').includes(search.trim());
      const matchCat = filterCategory === 'all' || (filterCategory === 'none' ? !c.category_id : c.category_id === filterCategory);
      return matchSearch && matchCat;
    });
  }, [clients, search, filterCategory]);

  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((c) => selected.has(c.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allFilteredSelected) {
      filteredClients.forEach((c) => next.delete(c.id));
    } else {
      filteredClients.forEach((c) => next.add(c.id));
    }
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selected.size === 0 || !caseTypeId || !titleTemplate.trim()) return;
    setSubmitting(true);

    try {
      // Pre-fetch templates once
      const { data: templates } = await supabase
        .from('doc_templates')
        .select('*')
        .eq('case_type_id', caseTypeId);

      const selectedCaseType = caseTypes.find((t) => t.id === caseTypeId);
      const caseTypeName = selectedCaseType?.name || '';

      const selectedClients = clients.filter((c) => selected.has(c.id));
      let createdCount = 0;
      let failedCount = 0;
      const createdCases: { id: string; title: string; client: ClientRow }[] = [];

      for (const cli of selectedClients) {
        const finalTitle = titleTemplate
          .replace(/\{client\}|\{שם\}/g, cli.full_name)
          .replace(/\{type\}|\{סוג\}/g, caseTypeName);
        const { data: newCase, error: caseErr } = await supabase
          .from('cases')
          .insert({
            advisor_id: user.id,
            client_id: cli.id,
            case_type_id: caseTypeId,
            title: finalTitle,
            status: 'פתוח',
            portal_password: cli.id_number || null,
          } as any)
          .select()
          .single();

        if (caseErr || !newCase) {
          console.error('[BulkCreate] case insert failed for', cli.full_name, caseErr);
          failedCount++;
          continue;
        }

        if (templates && templates.length > 0) {
          const docs = templates.map((t: any) => ({
            case_id: newCase.id,
            doc_name: t.doc_name,
            required: t.default_required,
            due_date: t.default_due_days ? format(addDays(new Date(), t.default_due_days), 'yyyy-MM-dd') : null,
            document_type: t.document_type || 'request',
            declaration_statement: t.declaration_statement || null,
          }));
          await supabase.from('case_documents').insert(docs);
        }

        createdCount++;
        createdCases.push({ id: newCase.id, title: finalTitle, client: cli });
      }

      // Auto-send portal links if requested
      let sentCount = 0;
      let skippedNoEmail = 0;
      let sendFailed = 0;
      if (autoSendPortal && createdCases.length > 0) {
        for (const cc of createdCases) {
          if (!cc.client.email) {
            skippedNoEmail++;
            continue;
          }
          try {
            // Get portal token
            const { data: caseRow } = await supabase
              .from('cases')
              .select('portal_token')
              .eq('id', cc.id)
              .maybeSingle();
            const portalLink = absoluteAppUrl(`/portal/${(caseRow as any)?.portal_token}`);
            const response = await invokeEdgeFunction('send-portal-link', {
              clientName: cc.client.full_name,
              clientEmail: cc.client.email,
              caseTitle: cc.title,
              portalLink,
              advisorEmail: user.email || '',
              advisorName: advisorName || user.user_metadata?.name || user.email?.split('@')[0] || '',
              emailType: 'new_case',
            });
            if (response?.error) throw new Error(response.error);
            const now = new Date().toISOString();
            await supabase.from('case_documents').update({ sent_to_client_at: now } as any).eq('case_id', cc.id);
            sentCount++;
          } catch (err) {
            console.error('[BulkCreate] failed to send portal link to', cc.client.full_name, err);
            sendFailed++;
          }
        }
      }

      const parts: string[] = [];
      parts.push(`${createdCount} תיקים נוצרו`);
      if (failedCount > 0) parts.push(`${failedCount} נכשלו`);
      if (autoSendPortal) {
        if (sentCount > 0) parts.push(`${sentCount} מיילים נשלחו`);
        if (skippedNoEmail > 0) parts.push(`${skippedNoEmail} ללא מייל`);
        if (sendFailed > 0) parts.push(`${sendFailed} שליחות נכשלו`);
      }

      toast({
        title: 'התיקים נוצרו',
        description: parts.join(' • '),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'שגיאה', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            פתיחת תיקים מרובים
          </DialogTitle>
          <DialogDescription className="text-right">
            בחרי סוג תיק וכותרת, סננ/י לקוחות לפי סיווג, וסמני את מי לפתוח עבורם תיק.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>סוג תיק (תבנית)</Label>
              <Select value={caseTypeId} onValueChange={setCaseTypeId}>
                <SelectTrigger><SelectValue placeholder="בחרי סוג תיק" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {caseTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>כותרת התיק</Label>
              <Input
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                placeholder="לדוגמה: {סוג} - {שם}"
              />
              <p className="text-[11px] text-muted-foreground">
                <code>{'{שם}'}</code> = שם הלקוח, <code>{'{סוג}'}</code> = שם סוג התיק.
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <Label>בחירת לקוחות ({selected.size} נבחרו)</Label>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">כל הסיווגים</SelectItem>
                    <SelectItem value="none">ללא סיווג</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>

            <div className="border rounded-lg">
              <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                <span className="text-sm">בחרי הכל ({filteredClients.length})</span>
              </div>
              <ScrollArea className="h-64">
                {filteredClients.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">לא נמצאו לקוחות</p>
                ) : (
                  <div className="divide-y">
                    {filteredClients.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer">
                        <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                        <span className="font-medium">{c.full_name}</span>
                        {c.id_number && <span className="text-xs text-muted-foreground" dir="ltr">{c.id_number}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="flex items-start gap-2 border-t pt-3">
            <Checkbox
              id="auto-send-portal"
              checked={autoSendPortal}
              onCheckedChange={(v) => setAutoSendPortal(!!v)}
            />
            <div className="space-y-0.5">
              <label htmlFor="auto-send-portal" className="text-sm font-medium cursor-pointer">
                שלחי קישור פורטל במייל לכל לקוח שיש לו אימייל
              </label>
              <p className="text-[11px] text-muted-foreground">
                לקוחות ללא אימייל יידלגו - תוכלי לשלוח להם ידנית מתוך התיק.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              type="submit"
              disabled={submitting || selected.size === 0 || !caseTypeId || !titleTemplate.trim()}
              className="flex-1 gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              צור {selected.size} תיקים
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}