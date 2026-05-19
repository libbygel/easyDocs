import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Banknote, Receipt, TrendingUp, Link2, CheckCircle2, Circle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { MonthlyTimeReport } from '@/components/cases/MonthlyTimeReport';
import { MonthlyBillingLedger } from '@/components/cases/MonthlyBillingLedger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createCharge,
  createPayment,
  deleteCharge,
  deletePayment,
  formatCurrency,
  formatDuration,
  listCaseCharges,
  listCasePayments,
  listCaseTimeEntries,
  deleteTimeEntry,
  updateTimeEntry,
  effectiveHourlyRate,
  summarizeChargeSettlement,
  updatePaymentChargeLink,
  updatePayment,
  setChargePaidManually,
  type CaseCharge,
  type CasePayment,
  type CaseTimeEntry,
} from '@/lib/billing';
import { supabase } from '@/lib/supabase';

interface Props {
  caseId: string;
  clientId: string;
  hourlyRate: number | null;
  refreshKey?: number;
  onClientRateChanged?: (newRate: number | null) => void;
}

export function CaseFinancePanel({ caseId, clientId, hourlyRate, refreshKey, onClientRateChanged }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [charges, setCharges] = useState<CaseCharge[]>([]);
  const [payments, setPayments] = useState<CasePayment[]>([]);
  const [timeEntries, setTimeEntries] = useState<CaseTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentChargeId, setPaymentChargeId] = useState<string>('none');

  const [editPayment, setEditPayment] = useState<CasePayment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editChargeId, setEditChargeId] = useState<string>('none');

  // Edit time entry
  const [editTime, setEditTime] = useState<CaseTimeEntry | null>(null);
  const [editTimeHours, setEditTimeHours] = useState('');
  const [editTimeMinutes, setEditTimeMinutes] = useState('');
  const [editTimeDesc, setEditTimeDesc] = useState('');
  const [editTimeRate, setEditTimeRate] = useState('');

  // Edit client hourly rate (quick edit)
  const [editClientRateOpen, setEditClientRateOpen] = useState(false);
  const [editClientRateValue, setEditClientRateValue] = useState('');

  const openEditPayment = (p: CasePayment) => {
    setEditPayment(p);
    setEditAmount(String(p.amount));
    setEditMethod(p.payment_method || '');
    setEditDesc(p.description || '');
    setEditDate(format(new Date(p.paid_at), 'yyyy-MM-dd'));
    setEditChargeId(p.charge_id ?? 'none');
  };

  const handleSaveEditPayment = async () => {
    if (!editPayment) return;
    const amt = parseFloat(editAmount);
    if (!amt || amt <= 0) {
      toast({ title: 'נא להזין סכום תקין', variant: 'destructive' });
      return;
    }
    try {
      await updatePayment(editPayment.id, {
        amount: amt,
        payment_method: editMethod || null,
        description: editDesc || null,
        paid_at: editDate ? new Date(editDate).toISOString() : undefined,
        charge_id: editChargeId === 'none' ? null : editChargeId,
      });
      setEditPayment(null);
      toast({ title: 'התשלום עודכן' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון תשלום', description: err?.message, variant: 'destructive' });
    }
  };

  const openEditTime = (t: CaseTimeEntry) => {
    setEditTime(t);
    const total = t.duration_seconds || 0;
    setEditTimeHours(String(Math.floor(total / 3600)));
    setEditTimeMinutes(String(Math.floor((total % 3600) / 60)));
    setEditTimeDesc(t.description || '');
    setEditTimeRate(t.hourly_rate != null ? String(t.hourly_rate) : '');
  };

  const handleSaveEditTime = async () => {
    if (!editTime) return;
    const h = parseInt(editTimeHours || '0', 10) || 0;
    const m = parseInt(editTimeMinutes || '0', 10) || 0;
    const seconds = h * 3600 + m * 60;
    if (seconds <= 0) {
      toast({ title: 'נא להזין משך זמן תקין', variant: 'destructive' });
      return;
    }
    try {
      await updateTimeEntry(editTime.id, {
        duration_seconds: seconds,
        description: editTimeDesc || null,
        hourly_rate: editTimeRate.trim() === '' ? null : parseFloat(editTimeRate),
      });
      setEditTime(null);
      toast({ title: 'הרישום עודכן' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון רישום', description: err?.message, variant: 'destructive' });
    }
  };

  const openEditClientRate = () => {
    setEditClientRateValue(hourlyRate != null ? String(hourlyRate) : '');
    setEditClientRateOpen(true);
  };

  const handleSaveClientRate = async () => {
    const newRate = editClientRateValue.trim() === '' ? null : parseFloat(editClientRateValue);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ hourly_rate: newRate } as any)
        .eq('id', clientId);
      if (error) throw error;
      setEditClientRateOpen(false);
      toast({ title: 'תעריף הלקוח עודכן' });
      onClientRateChanged?.(newRate);
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון תעריף', description: err?.message, variant: 'destructive' });
    }
  };

  const fetchAll = async () => {
    try {
      const [c, p, t] = await Promise.all([
        listCaseCharges(caseId),
        listCasePayments(caseId),
        listCaseTimeEntries(caseId),
      ]);
      setCharges(c);
      setPayments(p);
      setTimeEntries(t);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, refreshKey]);

  const extraCharged = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const summary = useMemo(() => {
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalSeconds = timeEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
    return {
      totalCharged: extraCharged,
      totalPaid,
      balance: extraCharged - totalPaid,
      totalSeconds,
    };
  }, [extraCharged, payments, timeEntries]);
  const hours = summary.totalSeconds / 3600;
  // Accurate per-row computation (uses each entry's override when set).
  const timeCharged = useMemo(
    () =>
      timeEntries.reduce((sum, e) => {
        const rate = effectiveHourlyRate(e, hourlyRate);
        return sum + ((e.duration_seconds || 0) / 3600) * rate;
      }, 0),
    [timeEntries, hourlyRate],
  );
  const handleAddCharge = async () => {
    if (!user) return;
    const amt = parseFloat(chargeAmount);
    if (!amt || amt <= 0) {
      toast({ title: 'נא להזין סכום תקין', variant: 'destructive' });
      return;
    }
    try {
      await createCharge({
        advisor_id: user.id,
        client_id: clientId,
        case_id: caseId,
        amount: amt,
        description: chargeDesc || null,
      });
      setChargeAmount('');
      setChargeDesc('');
      toast({ title: 'החיוב נוסף' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בהוספת חיוב', description: err?.message, variant: 'destructive' });
    }
  };

  const handleAddPayment = async () => {
    if (!user) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      toast({ title: 'נא להזין סכום תקין', variant: 'destructive' });
      return;
    }
    try {
      await createPayment({
        advisor_id: user.id,
        client_id: clientId,
        case_id: caseId,
        amount: amt,
        description: paymentDesc || null,
        payment_method: paymentMethod || null,
        charge_id: paymentChargeId === 'none' ? null : paymentChargeId,
      });
      setPaymentAmount('');
      setPaymentDesc('');
      setPaymentMethod('');
      setPaymentChargeId('none');
      toast({ title: 'התשלום נוסף' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בהוספת תשלום', description: err?.message, variant: 'destructive' });
    }
  };

  const handleDeleteCharge = async (id: string) => {
    await deleteCharge(id);
    fetchAll();
  };
  const handleToggleChargePaid = async (charge: CaseCharge) => {
    try {
      await setChargePaidManually(charge.id, !charge.paid_manually);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון סטטוס', description: err?.message, variant: 'destructive' });
    }
  };
  const handleDeletePayment = async (id: string) => {
    await deletePayment(id);
    fetchAll();
  };
  const handleDeleteTime = async (id: string) => {
    await deleteTimeEntry(id);
    fetchAll();
  };

  const handleChangePaymentLink = async (paymentId: string, chargeId: string) => {
    try {
      await updatePaymentChargeLink(paymentId, chargeId === 'none' ? null : chargeId);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון קישור', description: err?.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">טוען...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="סך לחיוב"
          value={formatCurrency(summary.totalCharged)}
          icon={<Receipt className="h-5 w-5" />}
          subtext={
            hourlyRate && hourlyRate > 0
              ? `זמן: ${formatCurrency(timeCharged)} • נוספים: ${formatCurrency(extraCharged)}`
              : `חיובים נוספים: ${formatCurrency(extraCharged)}`
          }
        />
        <SummaryCard label="סך תשלומים" value={formatCurrency(summary.totalPaid)} icon={<Banknote className="h-5 w-5" />} />
        <SummaryCard
          label="יתרה לתשלום"
          value={formatCurrency(summary.balance)}
          icon={<Receipt className="h-5 w-5" />}
          accent={summary.balance > 0 ? 'warning' : 'success'}
        />
        <SummaryCard
          label="זמן עבודה"
          value={formatDuration(summary.totalSeconds)}
          icon={<TrendingUp className="h-5 w-5" />}
          subtext={
            hourlyRate && hourlyRate > 0
              ? `תעריף: ${formatCurrency(hourlyRate)} / שעה`
              : 'הגדר תעריף שעה כדי לראות סכום לחיוב'
          }
        />
      </div>

      {/* Time entries (moved up) */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              רישומי זמן
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8"
              onClick={openEditClientRate}
              title="ערוך תעריף שעה ללקוח"
            >
              <Pencil className="h-3.5 w-3.5" />
              תעריף לקוח: {hourlyRate && hourlyRate > 0 ? formatCurrency(hourlyRate) + ' / שעה' : 'לא הוגדר'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">לא נרשמו שעות</div>
          ) : (
            <>
              <div className="divide-y">
                {timeEntries.map((t) => {
                  const secs = t.duration_seconds || 0;
                  const rate = effectiveHourlyRate(t, hourlyRate);
                  const lineCharge = (secs / 3600) * rate;
                  const hasOverride = t.hourly_rate != null && t.hourly_rate > 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="text-muted-foreground tabular-nums shrink-0">
                        {format(new Date(t.started_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                      <div className="flex-1 truncate">
                        {t.description || '—'}
                        {hasOverride && (
                          <span className="ms-2 text-xs text-accent">
                            (תעריף: {formatCurrency(t.hourly_rate as number)})
                          </span>
                        )}
                      </div>
                      <div className="font-mono tabular-nums shrink-0 w-20 text-end">
                        {t.duration_seconds != null ? formatDuration(t.duration_seconds) : 'פועל...'}
                      </div>
                      <div className="font-semibold tabular-nums shrink-0 w-24 text-end">
                        {rate > 0 ? formatCurrency(lineCharge) : '—'}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openEditTime(t)} title="ערוך רישום">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTime(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t text-sm font-semibold">
                <div className="flex-1">סה״כ זמן עבודה</div>
                <div className="font-mono tabular-nums shrink-0 w-20 text-end">
                  {formatDuration(summary.totalSeconds)}
                </div>
                <div className="tabular-nums shrink-0 w-24 text-end">
                  {timeCharged > 0 ? formatCurrency(timeCharged) : '—'}
                </div>
                <div className="w-[72px]" />
              </div>
              {timeCharged === 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  הגדר תעריף לקוח (למעלה) או תעריף ספציפי לשורה כדי לחשב סכום לחיוב.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Unified monthly billing ledger (all categories color-coded) */}
      <MonthlyBillingLedger
        charges={charges}
        payments={payments}
        timeEntries={timeEntries}
        hourlyRate={hourlyRate}
      />

      {/* Monthly breakdown of time entries */}
      <MonthlyTimeReport entries={timeEntries} hourlyRate={hourlyRate} />

      {/* Charges */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            חיובים נוספים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2">
            <div className="space-y-1">
              <Label className="text-xs">סכום (₪)</Label>
              <Input type="number" min={0} value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תיאור</Label>
              <Input value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} placeholder="עבור..." />
            </div>
            <div className="self-end">
              <Button onClick={handleAddCharge} className="gap-2">
                <Plus className="h-4 w-4" />
                הוסף
              </Button>
            </div>
          </div>
          {charges.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">לא נרשמו חיובים</div>
          ) : (
            <div className="divide-y">
              {charges.map((c) => {
                const s = summarizeChargeSettlement(c, payments);
                const variant =
                  s.status === 'paid' ? 'default' : s.status === 'partial' ? 'secondary' : 'outline';
                const label =
                  s.status === 'paid' ? 'שולם' : s.status === 'partial' ? `חלקי (${formatCurrency(s.paid)})` : 'פתוח';
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="text-muted-foreground tabular-nums shrink-0">
                      {format(new Date(c.charged_at), 'dd/MM/yyyy')}
                    </div>
                    <div className="flex-1 truncate">{c.description || '—'}</div>
                    <Badge variant={variant as any} className="shrink-0">{label}</Badge>
                    <div className="font-semibold tabular-nums shrink-0">{formatCurrency(c.amount)}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleChargePaid(c)}
                      title={c.paid_manually ? 'בטל סימון שולם' : 'סמן כשולם'}
                    >
                      {c.paid_manually ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCharge(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {/* Grand total summary row */}
          <div className="mt-4 pt-3 border-t-2 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">שווי זמן עבודה (מידע בלבד)</span>
              <span className="tabular-nums">{formatCurrency(timeCharged)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">חיובים נוספים</span>
              <span className="tabular-nums">{formatCurrency(extraCharged)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">שולם עד כה</span>
              <span className="tabular-nums">−{formatCurrency(summary.totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 mt-1 border-t">
              <span className="font-semibold">סך הכל חוב הלקוח (חיובים בלבד)</span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  summary.balance > 0 ? 'text-warning' : 'text-success'
                }`}
              >
                {formatCurrency(summary.balance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            תשלומים שהתקבלו
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[120px_120px_1fr_180px_auto] gap-2">
            <div className="space-y-1">
              <Label className="text-xs">סכום (₪)</Label>
              <Input type="number" min={0} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">אמצעי</Label>
              <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="העברה / מזומן..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תיאור</Label>
              <Input value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" title="קישור התשלום לחיוב מסוים יסמן אותו כשולם (קיזוז)">
                משויך לחיוב (קיזוז)
              </Label>
              <Select value={paymentChargeId} onValueChange={setPaymentChargeId}>
                <SelectTrigger><SelectValue placeholder="תשלום כללי" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">תשלום כללי (ללא קישור)</SelectItem>
                  {charges.map((c) => {
                    const s = summarizeChargeSettlement(c, payments);
                    const desc = c.description ? c.description.replace(/\s*\[recurring:[^\]]+\]\s*/g, '').slice(0, 30) : 'חיוב';
                    return (
                      <SelectItem key={c.id} value={c.id} disabled={s.status === 'paid'}>
                        {desc} • {formatCurrency(c.amount)} {s.status === 'paid' ? '(שולם)' : s.status === 'partial' ? `(נותר ${formatCurrency(s.remaining)})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="self-end">
              <Button onClick={handleAddPayment} className="gap-2">
                <Plus className="h-4 w-4" />
                הוסף
              </Button>
            </div>
          </div>
          {payments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">לא נרשמו תשלומים</div>
          ) : (
            <div className="divide-y">
              {payments.map((p) => {
                const desc = [p.payment_method, p.description].filter(Boolean).join(' • ') || '—';
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="text-muted-foreground tabular-nums shrink-0">
                      {format(new Date(p.paid_at), 'dd/MM/yyyy')}
                    </div>
                    <div className="flex-1 truncate">{desc}</div>
                    <div className="shrink-0 w-44">
                      <Select
                        value={p.charge_id ?? 'none'}
                        onValueChange={(v) => handleChangePaymentLink(p.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <Link2 className="h-3 w-3 ms-1 inline" />
                          <SelectValue placeholder="ללא" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">ללא קישור</SelectItem>
                          {charges.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {(c.description || 'חיוב').slice(0, 28)} • {formatCurrency(c.amount)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="font-semibold tabular-nums shrink-0">{formatCurrency(p.amount)}</div>
                    <Button variant="ghost" size="sm" onClick={() => openEditPayment(p)} title="ערוך תשלום">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePayment(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time entries */}

      {/* Edit Payment Dialog */}
      <Dialog open={!!editPayment} onOpenChange={(o) => !o && setEditPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת תשלום</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">סכום (₪)</Label>
              <Input type="number" min={0} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תאריך</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">אמצעי תשלום</Label>
              <Input value={editMethod} onChange={(e) => setEditMethod(e.target.value)} placeholder="העברה / מזומן..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תיאור</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">משויך לחיוב (קיזוז)</Label>
              <Select value={editChargeId} onValueChange={setEditChargeId}>
                <SelectTrigger><SelectValue placeholder="תשלום כללי" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">תשלום כללי (ללא קישור)</SelectItem>
                  {charges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.description || 'חיוב').replace(/\s*\[recurring:[^\]]+\]\s*/g, '').slice(0, 28)} • {formatCurrency(c.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditPayment(null)}>ביטול</Button>
            <Button onClick={handleSaveEditPayment}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Time Entry Dialog */}
      <Dialog open={!!editTime} onOpenChange={(o) => !o && setEditTime(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת רישום זמן</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">שעות</Label>
                <Input
                  type="number"
                  min={0}
                  value={editTimeHours}
                  onChange={(e) => setEditTimeHours(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">דקות</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={editTimeMinutes}
                  onChange={(e) => setEditTimeMinutes(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תיאור</Label>
              <Textarea
                value={editTimeDesc}
                onChange={(e) => setEditTimeDesc(e.target.value)}
                rows={2}
                placeholder="על מה עבדת..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תעריף לשעה לרישום זה (₪)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={editTimeRate}
                onChange={(e) => setEditTimeRate(e.target.value)}
                placeholder={
                  hourlyRate && hourlyRate > 0
                    ? `ברירת מחדל: ${hourlyRate} ₪`
                    : 'השאר ריק כדי להשתמש בתעריף הלקוח'
                }
                dir="ltr"
              />
              <div className="text-xs text-muted-foreground">
                גובר על תעריף הלקוח עבור שורה זו בלבד.
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTime(null)}>ביטול</Button>
            <Button onClick={handleSaveEditTime}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Hourly Rate Dialog */}
      <Dialog open={editClientRateOpen} onOpenChange={setEditClientRateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת תעריף שעה ללקוח</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">תעריף לשעה (₪)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={editClientRateValue}
                onChange={(e) => setEditClientRateValue(e.target.value)}
                placeholder="השאר ריק כדי להשתמש בתעריף ברירת המחדל"
                dir="ltr"
              />
              <div className="text-xs text-muted-foreground">
                התעריף יחול על כל התיקים של הלקוח. ניתן עדיין לדרוס לכל רישום זמן בנפרד.
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditClientRateOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveClientRate}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const SummaryCard = forwardRef<HTMLDivElement, {
  label: string;
  value: string;
  icon?: React.ReactNode;
  subtext?: string;
  accent?: 'warning' | 'success';
}>(function SummaryCard({ label, value, icon, subtext, accent }, ref) {
  const accentClass =
    accent === 'warning' ? 'text-warning' : accent === 'success' ? 'text-success' : 'text-foreground';
  return (
    <Card ref={ref} className="shadow-sm">
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`text-2xl font-semibold tabular-nums ${accentClass}`}>{value}</div>
        {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
      </CardContent>
    </Card>
  );
});

const ItemList = forwardRef<HTMLDivElement, {
  items: { id: string; date: string; amount: number; description: string | null }[];
  onDelete: (id: string) => void;
  emptyText: string;
}>(function ItemList({ items, onDelete, emptyText }, ref) {
  if (items.length === 0) {
    return <div ref={ref} className="text-sm text-muted-foreground text-center py-4">{emptyText}</div>;
  }
  return (
    <div ref={ref} className="divide-y">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div className="text-muted-foreground tabular-nums shrink-0">
            {format(new Date(it.date), 'dd/MM/yyyy')}
          </div>
          <div className="flex-1 truncate">{it.description || '—'}</div>
          <div className="font-semibold tabular-nums shrink-0">{formatCurrency(it.amount)}</div>
          <Button variant="ghost" size="sm" onClick={() => onDelete(it.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
});