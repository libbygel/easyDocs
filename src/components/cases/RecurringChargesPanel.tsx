import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Repeat, Plus, Trash2, PlayCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  type RecurringCharge,
  listRecurringChargesForClient,
  createRecurringCharge,
  updateRecurringCharge,
  deleteRecurringCharge,
  formatCurrency,
} from '@/lib/billing';

interface ClientCase {
  id: string;
  title: string;
}

interface Props {
  clientId: string;
  defaultCaseId: string;
  onChargesGenerated?: () => void;
}

export function RecurringChargesPanel({ clientId, defaultCaseId, onChargesGenerated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<RecurringCharge[]>([]);
  const [cases, setCases] = useState<ClientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Form
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [day, setDay] = useState('1');
  const [targetCaseId, setTargetCaseId] = useState(defaultCaseId);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [recs, casesRes] = await Promise.all([
        listRecurringChargesForClient(clientId),
        supabase
          .from('cases')
          .select('id, title')
          .eq('client_id', clientId)
          .eq('advisor_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setItems(recs);
      setCases((casesRes.data as ClientCase[]) || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user?.id]);

  useEffect(() => {
    setTargetCaseId(defaultCaseId);
  }, [defaultCaseId]);

  const handleAdd = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: 'נא להזין סכום תקין', variant: 'destructive' });
      return;
    }
    const dayNum = Math.min(28, Math.max(1, parseInt(day || '1', 10) || 1));
    try {
      await createRecurringCharge({
        advisor_id: user.id,
        client_id: clientId,
        case_id: targetCaseId,
        amount: amt,
        description: description || null,
        day_of_month: dayNum,
      });
      setAmount('');
      setDescription('');
      setDay('1');
      toast({ title: 'נוסף חיוב חוזר' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה ביצירת חיוב חוזר', description: err?.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (rc: RecurringCharge) => {
    try {
      await updateRecurringCharge(rc.id, { is_active: !rc.is_active });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון', description: err?.message, variant: 'destructive' });
    }
  };

  const handleChangeCase = async (rc: RecurringCharge, caseId: string) => {
    try {
      await updateRecurringCharge(rc.id, { case_id: caseId });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון תיק יעד', description: err?.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את החיוב החוזר?')) return;
    try {
      await deleteRecurringCharge(id);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה במחיקה', description: err?.message, variant: 'destructive' });
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-recurring-charges', {
        body: { client_id: clientId },
      });
      if (error) throw error;
      const created = (data as any)?.created ?? 0;
      toast({
        title: created > 0 ? `נוצרו ${created} חיובים חודשיים` : 'אין חיובים שדורשים יצירה כעת',
      });
      fetchAll();
      onChargesGenerated?.();
    } catch (err: any) {
      toast({ title: 'שגיאה בהרצה', description: err?.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            חיובים חוזרים חודשיים
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-2 h-8" onClick={handleRunNow} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            הפק חיובי החודש עכשיו
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr_100px_auto] gap-2">
          <div className="space-y-1">
            <Label className="text-xs">סכום (₪)</Label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">תיאור</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder='למשל: מע"מ חודשי' />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">תיק יעד</Label>
            <Select value={targetCaseId} onValueChange={setTargetCaseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">יום בחודש</Label>
            <Input type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div className="self-end">
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-4">טוען...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">לא הוגדרו חיובים חוזרים</div>
        ) : (
          <div className="divide-y">
            {items.map((rc) => {
              const caseTitle = cases.find((c) => c.id === rc.case_id)?.title || 'תיק';
              return (
                <div key={rc.id} className="flex items-center justify-between gap-3 py-2 text-sm flex-wrap">
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rc.is_active} onCheckedChange={() => handleToggle(rc)} />
                    <Badge variant={rc.is_active ? 'default' : 'outline'} className="shrink-0">
                      ה-{rc.day_of_month} בחודש
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-[150px] truncate">{rc.description || '—'}</div>
                  <div className="shrink-0 w-44">
                    <Select value={rc.case_id} onValueChange={(v) => handleChangeCase(rc, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue>{caseTitle}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="font-semibold tabular-nums shrink-0 w-20 text-end">
                    {formatCurrency(rc.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums shrink-0 w-28 text-end">
                    {rc.last_run_at ? `אחרון: ${format(new Date(rc.last_run_at), 'dd/MM/yy')}` : 'לא הופעל'}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rc.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          חיובים פעילים נוצרים אוטומטית כל יום (אם הגיע יום-החודש שהוגדר).
          התיאור יכלול את שם החודש (למשל "מע״מ — אפריל 2026").
        </div>
      </CardContent>
    </Card>
  );
}