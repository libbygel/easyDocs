import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { fetchCurrentAdvisorProfile } from '@/lib/advisorProfile';
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
import { Loader2, Send, Search, Paperclip, X } from 'lucide-react';

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
  const [includePortal, setIncludePortal] = useState(false);
  const [sending, setSending] = useState(false);
  const [advisorName, setAdvisorName] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    setSelected(new Set());
    setSearch('');
    setFilterCategory(initialCategoryId || 'all');
    setSubject('');
    setMessage('');
    setAttachments([]);
    Promise.all([
      supabase.from('clients').select('id, full_name, email, category_id').eq('advisor_id', user.id).order('full_name'),
      supabase.from('client_categories' as any).select('id, name').eq('advisor_id', user.id).order('name'),
      fetchCurrentAdvisorProfile(user),
    ]).then(([cRes, catRes, profile]) => {
      setClients(((cRes.data as any) || []) as ClientRow[]);
      setCategories(((catRes.data as any) || []) as any);
      setAdvisorName(profile.displayName || '');
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

  // Total attachment size cap (Resend allows up to ~40MB per message; keep a
  // safe margin since base64 inflates payloads by ~33%).
  const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;
  const totalAttachmentBytes = attachments.reduce((sum, f) => sum + f.size, 0);

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const next = [...attachments];
    for (const file of incoming) {
      // Skip duplicates (same name + size).
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    const newTotal = next.reduce((sum, f) => sum + f.size, 0);
    if (newTotal > MAX_TOTAL_ATTACHMENT_BYTES) {
      toast({
        title: 'הקבצים גדולים מדי',
        description: `סך כל הקבצים חורג מ-${Math.round(MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024))}MB`,
        variant: 'destructive',
      });
      return;
    }
    setAttachments(next);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the "data:<mime>;base64," prefix — Resend expects raw base64.
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

      const encodedAttachments = await Promise.all(
        attachments.map(async (file) => ({
          filename: file.name,
          content: await fileToBase64(file),
        })),
      );

      const response: any = await invokeEdgeFunction('send-group-email', {
        recipients,
        subject,
        message,
        advisorName,
        advisorEmail: user.email || '',
        ...(encodedAttachments.length > 0 ? { attachments: encodedAttachments } : {}),
      });

      if (response?.error) throw new Error(response.error.message || response.error);

      const sentCount = Number(response?.sentCount ?? recipients.length);
      const failedCount = Number(response?.failedCount ?? 0);
      const suppressedCount = Number(response?.suppressedCount ?? 0);
      const version = typeof response?.version === 'string' ? response.version : '';
      const failedItems = Array.isArray(response?.failed) ? response.failed as Array<{ email?: string; error?: string }> : [];
      const failedPreview = failedItems
        .slice(0, 3)
        .map((f) => `${f.email || 'unknown'}: ${f.error || 'Unknown error'}`)
        .join(' | ');

      toast({
        title: failedCount > 0 ? 'השליחה הושלמה חלקית' : 'המיילים נשלחו',
        description: `${sentCount} נשלחו${suppressedCount ? `, ${suppressedCount} מדוכאים` : ''}${failedCount ? `, ${failedCount} נכשלו` : ''}${failedPreview ? `. ${failedPreview}` : ''}${version ? ` [${version}]` : ''}`,
        variant: failedCount > 0 ? 'destructive' : 'default',
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

          <div className="space-y-2">
            <Label>קבצים מצורפים</Label>
            <div>
              <input
                id="groupEmailFiles"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => document.getElementById('groupEmailFiles')?.click()}
              >
                <Paperclip className="h-4 w-4" />
                צרפי קבצים
              </Button>
              {attachments.length > 0 && (
                <span className="text-xs text-muted-foreground mr-2">
                  {attachments.length} קבצים · {formatBytes(totalAttachmentBytes)}
                </span>
              )}
            </div>
            {attachments.length > 0 && (
              <ul className="space-y-1">
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate" title={file.name}>{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0" dir="ltr">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label={`הסר ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
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