import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
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
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Send, Search } from 'lucide-react';

interface SendGroupEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategoryId?: string;
}

interface ClientRow {
  id: string;
  full_name: string;
  email: string | null;
  category_id: string | null;
}

export function SendGroupEmailDialog({ open, onOpenChange, initialCategoryId }: SendGroupEmailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includePortal, setIncludePortal] = useState(true);
  const [sending, setSending] = useState(false);
  const [advisorName, setAdvisorName] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    setSelected(new Set());
    setSearch('');
    setFilterCategory(initialCategoryId || 'all');
    setSubject('');
    setMessage('');
    Promise.all([
      supabase.from('clients').select('id, full_name, email, category_id').eq('advisor_id', user.id).order('full_name'),
      supabase.from('client_categories' as any).select('id, name').eq('advisor_id', user.id).order('name'),
      supabase.from('profiles').select('name, sender_display_name').eq('user_id', user.id).maybeSingle(),
    ]).then(([cRes, catRes, pRes]) => {
      setClients(((cRes.data as any) || []) as ClientRow[]);
      setCategories(((catRes.data as any) || []) as any);
      setAdvisorName(((pRes.data as any)?.sender_display_name || (pRes.data as any)?.name || '') as string);
    });
  }, [open, user, initialCategoryId]);

  // Auto-select all clients in category when category changes (other than 'all')
  useEffect(() => {
    if (!open) return;
    if (filterCategory === 'all') return;
    const matching = clients.filter((c) => {
      if (!c.email) return false;
      return filterCategory === 'none' ? !c.category_id : c.category_id === filterCategory;
    });
    setSelected(new Set(matching.map((c) => c.id)));
  }, [filterCategory, clients, open]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (!c.email) return false;
      const matchSearch = !search.trim() || c.full_name.includes(search.trim());
      const matchCat = filterCategory === 'all' || (filterCategory === 'none' ? !c.category_id : c.category_id === filterCategory);
      return matchSearch && matchCat;
    });
  }, [clients, search, filterCategory]);

  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((c) => selected.has(c.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allFilteredSelected) filteredClients.forEach((c) => next.delete(c.id));
    else filteredClients.forEach((c) => next.add(c.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleSend = async () => {
    if (selected.size === 0 || !subject.trim() || !message.trim() || !user) return;
    setSending(true);

    try {
      const selectedClients = clients.filter((c) => selected.has(c.id) && c.email);

      // If includePortal, fetch latest case token for each client
      let portalByClient = new Map<string, string>();
      if (includePortal) {
        const { data: cases } = await supabase
          .from('cases')
          .select('client_id, portal_token, created_at')
          .eq('advisor_id', user.id)
          .in('client_id', selectedClients.map((c) => c.id))
          .eq('portal_enabled', true)
          .order('created_at', { ascending: false });
        // Take the most recent case per client
        (cases || []).forEach((c: any) => {
          if (!portalByClient.has(c.client_id)) {
            portalByClient.set(c.client_id, c.portal_token);
          }
        });
      }

      const recipients = selectedClients.map((c) => {
        const token = portalByClient.get(c.id);
        return {
          email: c.email!,
          name: c.full_name,
          portalLink: token ? `${window.location.origin}/portal/${token}` : undefined,
        };
      });

      const response: any = await invokeEdgeFunction('send-group-email', {
        recipients,
        subject,
        message,
        advisorName,
        advisorEmail: user.email || '',
      });

      if (response?.error) throw new Error(response.error.message || response.error);

      toast({
        title: 'המיילים נשלחו',
        description: `${response?.sentCount || recipients.length} נשלחו${response?.failedCount ? `, ${response.failedCount} נכשלו` : ''}`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'שגיאה בשליחה', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const noEmailCount = clients.filter((c) => !c.email).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Send className="h-5 w-5" />
            שליחת מייל קבוצתי ללקוחות
          </DialogTitle>
          <DialogDescription className="text-right">
            סננ/י לפי סיווג, בחרי לקוחות וכתבי הודעה. ניתן לכלול קישור לפורטל האישי של כל לקוח.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          <div className="space-y-2">
            <Label>נושא</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="לדוגמה: עדכון חשוב לעוסקים מורשים" />
          </div>
          <div className="space-y-2">
            <Label>תוכן ההודעה</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="כתבי כאן את ההודעה ללקוחות..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="incPortal" checked={includePortal} onCheckedChange={(v) => setIncludePortal(!!v)} />
            <Label htmlFor="incPortal" className="cursor-pointer text-sm">כלול קישור לפורטל האישי של כל לקוח (התיק האחרון שנפתח)</Label>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <Label>בחירת נמענים ({selected.size} נבחרו)</Label>
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
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>
            <div className="border rounded-lg">
              <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                <span className="text-sm">בחרי הכל ({filteredClients.length})</span>
              </div>
              <ScrollArea className="h-56">
                {filteredClients.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">אין לקוחות מתאימים (חייבים מייל)</p>
                ) : (
                  <div className="divide-y">
                    {filteredClients.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer">
                        <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                        <span className="font-medium flex-1">{c.full_name}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">{c.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            {noEmailCount > 0 && (
              <p className="text-xs text-muted-foreground">{noEmailCount} לקוחות בלי כתובת מייל לא מוצגים.</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Button
            onClick={handleSend}
            disabled={sending || selected.size === 0 || !subject.trim() || !message.trim()}
            className="flex-1 gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            שלח ל-{selected.size} נמענים
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>ביטול</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}