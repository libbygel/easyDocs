import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, FolderOpen, ExternalLink, AlertCircle, Wallet, Clock, History, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatDuration, type CaseCharge, type CasePayment, type CaseTimeEntry } from '@/lib/billing';

interface ClientRow {
  id: string;
  full_name: string;
  id_number: string | null;
}

interface CaseRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  portal_token: string;
  case_types?: { name: string } | null;
}

interface DocRow {
  id: string;
  doc_name: string;
  review_status: string;
  required: boolean;
  document_type: string;
}

interface ActivityRow {
  id: string;
  case_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  'תקין': 'bg-success/10 text-success border-success/30',
  'הועלה': 'bg-info/10 text-info border-info/30',
  'לא תקין': 'bg-destructive/10 text-destructive border-destructive/30',
  'חסר': 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  'תקין': 'תקין',
  'הועלה': 'בטיפול היועץ',
  'לא תקין': 'נדרש תיקון',
  'חסר': 'ממתין להעלאה',
};

export default function ClientMasterPortal() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [docsByCase, setDocsByCase] = useState<Map<string, DocRow[]>>(new Map());
  const [chargesByCase, setChargesByCase] = useState<Map<string, CaseCharge[]>>(new Map());
  const [paymentsByCase, setPaymentsByCase] = useState<Map<string, CasePayment[]>>(new Map());
  const [timeByCase, setTimeByCase] = useState<Map<string, CaseTimeEntry[]>>(new Map());
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Public portal must not inherit an active advisor session from the same browser.
    // This prevents accidental access to advisor screens when navigating back.
    supabase.auth.signOut({ scope: 'local' }).catch((err) => {
      console.warn('ClientMasterPortal: failed to clear local auth session', err);
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    (async () => {
      try {
        const { data: caseRows, error } = await supabase
          .from('cases')
          .select(`
            id, title, status, created_at, portal_token,
            case_types!cases_case_type_id_fkey ( name ),
            clients!cases_client_id_fkey ( id, full_name, id_number )
          `)
          .eq('client_id', token)
          .eq('portal_enabled', true)
          .order('created_at', { ascending: false });

        if (error || !caseRows || caseRows.length === 0) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const c = (caseRows[0] as any).clients;
        setClient({ id: c.id, full_name: c.full_name, id_number: c.id_number });
        setCases(caseRows.map((row: any) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          created_at: row.created_at,
          portal_token: row.portal_token,
          case_types: row.case_types,
        })));
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const loadAll = async () => {
    if (cases.length === 0) return;
    const ids = cases.map((c) => c.id);
    const [docsRes, chargesRes, paymentsRes, timeRes, activityRes] = await Promise.all([
      supabase
        .from('case_documents')
        .select('id, doc_name, review_status, required, document_type, case_id, display_order')
        .in('case_id', ids)
        .order('display_order'),
      supabase.from('case_charges' as any).select('*').in('case_id', ids).order('charged_at', { ascending: false }),
      supabase.from('case_payments' as any).select('*').in('case_id', ids).order('paid_at', { ascending: false }),
      supabase.from('case_time_entries' as any).select('*').in('case_id', ids).not('ended_at', 'is', null).order('started_at', { ascending: false }),
      supabase.from('case_activity_log').select('*').in('case_id', ids).order('created_at', { ascending: false }).limit(100),
    ]);
    const docsMap = new Map<string, DocRow[]>();
    (docsRes.data || []).forEach((d: any) => {
      const arr = docsMap.get(d.case_id) || [];
      arr.push(d);
      docsMap.set(d.case_id, arr);
    });
    setDocsByCase(docsMap);
    const groupBy = <T extends { case_id: string }>(rows: T[]) => {
      const m = new Map<string, T[]>();
      rows.forEach((r) => {
        const arr = m.get(r.case_id) || [];
        arr.push(r);
        m.set(r.case_id, arr);
      });
      return m;
    };
    setChargesByCase(groupBy((chargesRes.data || []) as any));
    setPaymentsByCase(groupBy((paymentsRes.data || []) as any));
    setTimeByCase(groupBy((timeRes.data || []) as any));
    setActivity((activityRes.data || []) as any);
  };

  useEffect(() => {
    if (authenticated && cases.length > 0 && docsByCase.size === 0) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, cases]);

  const stats = useMemo(() => {
    let total = 0, ok = 0, pending = 0, missing = 0, rejected = 0;
    docsByCase.forEach((docs) => {
      docs.forEach((d) => {
        total++;
        if (d.review_status === 'תקין') ok++;
        else if (d.review_status === 'הועלה') pending++;
        else if (d.review_status === 'לא תקין') rejected++;
        else missing++;
      });
    });
    return { total, ok, pending, missing, rejected };
  }, [docsByCase]);

  const finance = useMemo(() => {
    let totalCharged = 0;
    let totalPaid = 0;
    chargesByCase.forEach((arr) => arr.forEach((c) => { totalCharged += Number(c.amount || 0); }));
    paymentsByCase.forEach((arr) => arr.forEach((p) => { totalPaid += Number(p.amount || 0); }));
    return { totalCharged, totalPaid, balance: totalCharged - totalPaid };
  }, [chargesByCase, paymentsByCase]);

  const totalSeconds = useMemo(() => {
    let s = 0;
    timeByCase.forEach((arr) => arr.forEach((e) => { s += e.duration_seconds || 0; }));
    return s;
  }, [timeByCase]);

  const caseTitleById = useMemo(() => {
    const m = new Map<string, string>();
    cases.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [cases]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-8 pb-8 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">הקישור אינו תקין</h1>
            <p className="text-muted-foreground text-sm">לא נמצאו תיקים פעילים עבור קישור זה.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password gate
  if (!authenticated) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const expected = (client.id_number || '').trim();
      if (!expected) {
        // No ID on file — allow access (no password set)
        setAuthenticated(true);
        return;
      }
      if (pwInput.trim() === expected) {
        setAuthenticated(true);
        setPwError(false);
      } else {
        setPwError(true);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <FolderOpen className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold mb-1">אזור אישי</h1>
              <p className="text-muted-foreground text-sm">הזן את מספר תעודת הזהות שלך לכניסה</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={pwInput}
                onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
                placeholder="מספר תעודת זהות"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center tracking-widest"
                dir="ltr"
                autoFocus
              />
              {pwError && <p className="text-destructive text-sm text-center">תעודת זהות שגויה, נסה שוב</p>}
              <Button type="submit" className="w-full">כניסה</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">שלום {client.full_name}</h1>
                <p className="text-sm text-muted-foreground">סקירה כללית של כל התיקים שלך</p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-xs bg-info/10 text-info border border-info/30 rounded-full px-3 py-1">
              👁️ מצב צפייה בלבד
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="סה״כ תיקים" value={cases.length} />
          <StatCard label="מסמכים אושרו" value={stats.ok} accent="success" />
          <StatCard label="בבדיקה" value={stats.pending} accent="info" />
          <StatCard label="ממתינים / נדחו" value={stats.missing + stats.rejected} accent={stats.rejected > 0 ? 'destructive' : 'muted'} />
        </div>

        <Tabs defaultValue="cases" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cases" className="gap-1.5"><FolderOpen className="h-4 w-4" /> תיקים</TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5"><Wallet className="h-4 w-4" /> סיכום פיננסי</TabsTrigger>
            <TabsTrigger value="time" className="gap-1.5"><Clock className="h-4 w-4" /> זמן עבודה</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><History className="h-4 w-4" /> פעילות</TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="mt-4 space-y-4">
          {cases.map((c) => {
            const docs = docsByCase.get(c.id) || [];
            const total = docs.length;
            const okCount = docs.filter((d) => d.review_status === 'תקין').length;
            const progressPct = total > 0 ? Math.round((okCount / total) * 100) : 0;

            return (
              <Card key={c.id} className="shadow-sm overflow-hidden">
                <CardContent className="pt-5 pb-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold truncate">{c.title}</h2>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.case_types?.name && <span>{c.case_types.name} • </span>}
                        נוצר {format(new Date(c.created_at), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">{c.status}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => window.open(`/portal/${c.portal_token}?view=1`, '_blank')}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        פתח תיק להעלאת מסמכים
                      </Button>
                    </div>
                  </div>

                  {/* Progress */}
                  {total > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{okCount} מתוך {total} מסמכים אושרו</span>
                        <span className="tabular-nums">{progressPct}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success transition-all" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Docs */}
                  {docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">אין מסמכים בתיק זה</p>
                  ) : (
                    <div className="space-y-1.5">
                      {docs.map((d) => (
                        <div
                          key={d.id}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${STATUS_STYLES[d.review_status] || STATUS_STYLES['חסר']}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{d.doc_name}</span>
                            {d.required && <span className="text-[10px] opacity-70">*נדרש</span>}
                          </div>
                          <span className="text-xs font-medium shrink-0">
                            {STATUS_LABELS[d.review_status] || d.review_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </TabsContent>

          <TabsContent value="finance" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="סה״כ חיובים" value={formatCurrency(finance.totalCharged) as any} accent="info" />
              <StatCard label="סה״כ תשלומים" value={formatCurrency(finance.totalPaid) as any} accent="success" />
              <StatCard label="יתרה לתשלום" value={formatCurrency(finance.balance) as any} accent={finance.balance > 0 ? 'destructive' : 'muted'} />
            </div>
            {cases.map((c) => {
              const charges = chargesByCase.get(c.id) || [];
              const payments = paymentsByCase.get(c.id) || [];
              const charged = charges.reduce((s, x) => s + Number(x.amount || 0), 0);
              const paid = payments.reduce((s, x) => s + Number(x.amount || 0), 0);
              if (charges.length === 0 && payments.length === 0) return null;
              return (
                <Card key={c.id} className="shadow-sm">
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{c.title}</h3>
                      <span className="text-sm tabular-nums">
                        יתרה: <span className={charged - paid > 0 ? 'text-destructive font-semibold' : 'text-success font-semibold'}>{formatCurrency(charged - paid)}</span>
                      </span>
                    </div>
                    {charges.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">חיובים</div>
                        <div className="space-y-1">
                          {charges.map((c2) => (
                            <div key={c2.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1">
                              <div>
                                <span>{c2.description || 'חיוב'}</span>
                                <span className="text-xs text-muted-foreground mr-2">{format(new Date(c2.charged_at), 'dd/MM/yyyy')}</span>
                              </div>
                              <span className="tabular-nums">{formatCurrency(Number(c2.amount))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {payments.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">תשלומים</div>
                        <div className="space-y-1">
                          {payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1">
                              <div>
                                <span>{p.description || p.payment_method || 'תשלום'}</span>
                                <span className="text-xs text-muted-foreground mr-2">{format(new Date(p.paid_at), 'dd/MM/yyyy')}</span>
                              </div>
                              <span className="tabular-nums text-success">{formatCurrency(Number(p.amount))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {finance.totalCharged === 0 && finance.totalPaid === 0 && (
              <Card className="shadow-sm"><CardContent className="py-6 text-center text-sm text-muted-foreground">אין נתוני חיובים או תשלומים</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="time" className="mt-4 space-y-4">
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-xs text-muted-foreground">סה״כ זמן עבודה</div>
                <div className="text-3xl font-semibold tabular-nums text-primary">{formatDuration(totalSeconds)}</div>
              </CardContent>
            </Card>
            {cases.map((c) => {
              const entries = timeByCase.get(c.id) || [];
              if (entries.length === 0) return null;
              const caseTotal = entries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
              return (
                <Card key={c.id} className="shadow-sm">
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{c.title}</h3>
                      <span className="text-sm tabular-nums text-primary font-medium">{formatDuration(caseTotal)}</span>
                    </div>
                    <div className="space-y-1">
                      {entries.slice(0, 10).map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1">
                          <div className="min-w-0">
                            <span className="text-xs text-muted-foreground">{format(new Date(e.started_at), 'dd/MM/yyyy')}</span>
                            {e.description && <span className="mr-2">{e.description}</span>}
                          </div>
                          <span className="tabular-nums">{formatDuration(e.duration_seconds || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {totalSeconds === 0 && (
              <Card className="shadow-sm"><CardContent className="py-6 text-center text-sm text-muted-foreground">אין רישומי זמן עבודה</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                {activity.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">אין פעילות להצגה</p>
                ) : (
                  <div className="space-y-2">
                    {activity.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 border-b border-border/50 pb-2 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm">{a.description}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {caseTitleById.get(a.case_id) || ''} • {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: 'success' | 'info' | 'destructive' | 'muted';
}) {
  const accentClass =
    accent === 'success'
      ? 'text-success'
      : accent === 'info'
      ? 'text-info'
      : accent === 'destructive'
      ? 'text-destructive'
      : 'text-foreground';
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 text-center space-y-0.5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl sm:text-2xl font-semibold tabular-nums ${accentClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}