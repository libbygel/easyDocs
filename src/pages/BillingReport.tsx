import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { formatCurrency, type CaseCharge, type CasePayment } from '@/lib/billing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, ReceiptText, TrendingUp, Wallet, ArrowDownLeft, Play } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

type ChargeRow = CaseCharge & { clientName: string; caseTitle: string };
type PaymentRow = CasePayment & { clientName: string; caseTitle: string };

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function BillingReport() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [fetched, setFetched] = useState(false);
  const [runningCharges, setRunningCharges] = useState(false);

  const handleRunRecurringCharges = async () => {
    setRunningCharges(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-recurring-charges', { body: {} });
      if (error) throw error;
      const created = (data as any)?.created ?? 0;
      toast({ title: created > 0 ? `נוצרו ${created} חיובים חודשיים` : 'אין חיובים שדורשים יצירה כעת' });
      if (created > 0) fetchReport();
    } catch (err: any) {
      toast({ title: 'שגיאה בהרצת חיובים', description: err?.message, variant: 'destructive' });
    } finally {
      setRunningCharges(false);
    }
  };

  const fetchReport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fromTs = `${from}T00:00:00`;
      const toTs = `${to}T23:59:59`;

      const [chargesRes, paymentsRes, clientsRes, casesRes] = await Promise.all([
        supabase
          .from('case_charges' as any)
          .select('*')
          .eq('advisor_id', user.id)
          .gte('charged_at', fromTs)
          .lte('charged_at', toTs)
          .order('charged_at', { ascending: false }),
        supabase
          .from('case_payments' as any)
          .select('*')
          .eq('advisor_id', user.id)
          .gte('paid_at', fromTs)
          .lte('paid_at', toTs)
          .order('paid_at', { ascending: false }),
        supabase.from('clients').select('id,full_name').eq('advisor_id', user.id),
        supabase.from('cases').select('id,title').eq('advisor_id', user.id),
      ]);

      const clientMap = new Map<string, string>(
        ((clientsRes.data || []) as any[]).map((c: any) => [c.id, c.full_name])
      );
      const caseMap = new Map<string, string>(
        ((casesRes.data || []) as any[]).map((c: any) => [c.id, c.title])
      );

      const enrichCharge = (r: any): ChargeRow => ({
        ...(r as CaseCharge),
        clientName: clientMap.get(r.client_id) || '-',
        caseTitle: caseMap.get(r.case_id) || '-',
      });
      const enrichPayment = (r: any): PaymentRow => ({
        ...(r as CasePayment),
        clientName: clientMap.get(r.client_id) || '-',
        caseTitle: caseMap.get(r.case_id) || '-',
      });

      setCharges(((chargesRes.data || []) as any[]).map(enrichCharge));
      setPayments(((paymentsRes.data || []) as any[]).map(enrichPayment));
      setFetched(true);
    } catch (err: any) {
      toast({ title: 'שגיאה בטעינת דוח', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalCharged = useMemo(() => charges.reduce((s, c) => s + Number(c.amount), 0), [charges]);
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const balance = totalCharged - totalPaid;

  const clientSummary = useMemo(() => {
    const map = new Map<string, { clientName: string; charged: number; paid: number }>();
    for (const c of charges) {
      const prev = map.get(c.client_id) || { clientName: c.clientName, charged: 0, paid: 0 };
      map.set(c.client_id, { ...prev, charged: prev.charged + Number(c.amount) });
    }
    for (const p of payments) {
      const prev = map.get(p.client_id) || { clientName: p.clientName, charged: 0, paid: 0 };
      map.set(p.client_id, { ...prev, paid: prev.paid + Number(p.amount) });
    }
    return Array.from(map.values()).sort((a, b) => b.charged - a.charged);
  }, [charges, payments]);

  const exportExcel = () => {
    const chargesSheet = charges.map((c) => ({
      תאריך: format(new Date(c.charged_at), 'dd/MM/yyyy'),
      לקוח: c.clientName,
      תיק: c.caseTitle,
      תיאור: c.description || '',
      סכום: c.amount,
      'שולם ידנית': c.paid_manually ? 'כן' : 'לא',
    }));
    const paymentsSheet = payments.map((p) => ({
      תאריך: format(new Date(p.paid_at), 'dd/MM/yyyy'),
      לקוח: p.clientName,
      תיק: p.caseTitle,
      תיאור: p.description || '',
      סכום: p.amount,
      'אמצעי תשלום': p.payment_method || '',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chargesSheet), 'חיובים');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsSheet), 'תשלומים');
    const label = `${from}_${to}`;
    XLSX.writeFile(wb, `דוח_חיובים_${label}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ReceiptText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">דוח חיובים ותשלומים</h1>
              <p className="text-sm text-muted-foreground">סקירה כללית של כל הפעילות הפיננסית</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={runningCharges}
              onClick={handleRunRecurringCharges}
            >
              {runningCharges ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              הרץ חיובים חודשיים
            </Button>
            {fetched && (
              <Button variant="outline" className="gap-2" onClick={exportExcel}>
                <Download className="h-4 w-4" />
                ייצוא Excel
              </Button>
            )}
          </div>
        </div>

        {/* Date filter */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label>מתאריך</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>עד תאריך</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" dir="ltr" />
              </div>
              <Button onClick={fetchReport} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                הפק דוח
              </Button>
            </div>
          </CardContent>
        </Card>

        {fetched && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-sm">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">סה״כ חיובים</p>
                      <p className="text-xl font-bold tabular-nums">{formatCurrency(totalCharged)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">סה״כ תשלומים</p>
                      <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(totalPaid)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${balance > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <ArrowDownLeft className={`h-4 w-4 ${balance > 0 ? 'text-red-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">יתרה לגבייה</p>
                      <p className={`text-xl font-bold tabular-nums ${balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{formatCurrency(balance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <Card className="shadow-sm">
              <Tabs defaultValue="charges">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">פירוט</CardTitle>
                    <TabsList>
                      <TabsTrigger value="charges">חיובים ({charges.length})</TabsTrigger>
                      <TabsTrigger value="payments">תשלומים ({payments.length})</TabsTrigger>
                      <TabsTrigger value="by-client">לפי לקוח ({clientSummary.length})</TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <TabsContent value="charges" className="mt-0">
                    {charges.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">אין חיובים בתקופה זו</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>תאריך</TableHead>
                            <TableHead>לקוח</TableHead>
                            <TableHead>תיק</TableHead>
                            <TableHead>תיאור</TableHead>
                            <TableHead className="text-start">סכום</TableHead>
                            <TableHead>שולם</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {charges.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="tabular-nums text-sm">{format(new Date(c.charged_at), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-medium">{c.clientName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{c.caseTitle}</TableCell>
                              <TableCell className="text-sm">{c.description || '-'}</TableCell>
                              <TableCell className="tabular-nums font-semibold">{formatCurrency(Number(c.amount))}</TableCell>
                              <TableCell>
                                {c.paid_manually
                                  ? <span className="text-xs text-green-600 font-medium">✓ שולם</span>
                                  : <span className="text-xs text-muted-foreground">ממתין</span>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                  <TabsContent value="by-client" className="mt-0">
                    {clientSummary.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">אין נתונים בתקופה זו</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>לקוח</TableHead>
                            <TableHead className="text-start">סה״כ חיובים</TableHead>
                            <TableHead className="text-start">סה״כ תשלומים</TableHead>
                            <TableHead className="text-start">יתרה לגבייה</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientSummary.map((row) => {
                            const bal = row.charged - row.paid;
                            return (
                              <TableRow key={row.clientName}>
                                <TableCell className="font-medium">{row.clientName}</TableCell>
                                <TableCell className="tabular-nums">{formatCurrency(row.charged)}</TableCell>
                                <TableCell className="tabular-nums text-green-600">{formatCurrency(row.paid)}</TableCell>
                                <TableCell className={`tabular-nums font-semibold ${bal > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{formatCurrency(bal)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="payments" className="mt-0">
                    {payments.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">אין תשלומים בתקופה זו</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>תאריך</TableHead>
                            <TableHead>לקוח</TableHead>
                            <TableHead>תיק</TableHead>
                            <TableHead>תיאור</TableHead>
                            <TableHead>אמצעי תשלום</TableHead>
                            <TableHead className="text-start">סכום</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="tabular-nums text-sm">{format(new Date(p.paid_at), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-medium">{p.clientName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{p.caseTitle}</TableCell>
                              <TableCell className="text-sm">{p.description || '-'}</TableCell>
                              <TableCell className="text-sm">{p.payment_method || '-'}</TableCell>
                              <TableCell className="tabular-nums font-semibold text-green-600">{formatCurrency(Number(p.amount))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
