import { forwardRef, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowRight, FolderOpen, Receipt, Banknote, TrendingUp, Activity, Mail, Phone, IdCard, Link2, Copy, Eye, Send, Loader2, Upload, FileText, MessageSquare } from 'lucide-react';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  listClientCharges,
  listClientPayments,
  listClientTimeEntries,
  formatCurrency,
  formatDuration,
  type CaseCharge,
  type CasePayment,
  type CaseTimeEntry,
} from '@/lib/billing';
import { fetchCurrentAdvisorProfile } from '@/lib/advisorProfile';
import { ClientDocumentsPanel } from '@/components/clients/ClientDocumentsPanel';
import { ClientConversationsPanel } from '@/components/clients/ClientConversationsPanel';

const isMissingColumnError = (error: any, column: string) =>
  error?.code === '42703' || String(error?.message || '').includes(column);

interface ClientRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  notes: string | null;
  created_at: string;
}

interface CaseRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  portal_token?: string;
}

interface ActivityRow {
  id: string;
  case_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [advisorName, setAdvisorName] = useState('');
  const [sendingViewLink, setSendingViewLink] = useState(false);
  const [sendingUploadLink, setSendingUploadLink] = useState(false);
  const [uploadCasePickerOpen, setUploadCasePickerOpen] = useState(false);

  const [client, setClient] = useState<ClientRow | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [charges, setCharges] = useState<CaseCharge[]>([]);
  const [payments, setPayments] = useState<CasePayment[]>([]);
  const [timeEntries, setTimeEntries] = useState<CaseTimeEntry[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      try {
        const [clientRes, casesRes, ch, pa, te, profile] = await Promise.all([
          supabase.from('clients').select('*').eq('id', id).eq('advisor_id', user.id).maybeSingle(),
          supabase.from('cases').select('id,title,status,created_at,portal_token').eq('client_id', id).eq('advisor_id', user.id).order('created_at', { ascending: false }),
          listClientCharges(id),
          listClientPayments(id),
          listClientTimeEntries(id),
          fetchCurrentAdvisorProfile(user),
        ]);

        setClient((clientRes.data as any) || null);
        const caseList = (casesRes.data as any[]) || [];
        setCases(caseList);
        setCharges(ch);
        setPayments(pa);
        setTimeEntries(te);
        setHourlyRate(profile.hourlyRate);
        setAdvisorName(profile.displayName || '');

        if (caseList.length > 0) {
          const ids = caseList.map((c) => c.id);
          const { data: actData } = await supabase
            .from('case_activity_log')
            .select('id,case_id,action_type,description,created_at')
            .in('case_id', ids)
            .order('created_at', { ascending: false })
            .limit(50);
          setActivity(((actData as any[]) || []) as ActivityRow[]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const totals = useMemo(() => {
    const totalCharged = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalSeconds = timeEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
    return { totalCharged, totalPaid, balance: totalCharged - totalPaid, totalSeconds };
  }, [charges, payments, timeEntries]);

  const perCase = useMemo(() => {
    const map = new Map<string, { charged: number; paid: number; seconds: number }>();
    const ensure = (cid: string) => {
      if (!map.has(cid)) map.set(cid, { charged: 0, paid: 0, seconds: 0 });
      return map.get(cid)!;
    };
    charges.forEach((c) => (ensure(c.case_id).charged += Number(c.amount || 0)));
    payments.forEach((p) => (ensure(p.case_id).paid += Number(p.amount || 0)));
    timeEntries.forEach((t) => (ensure(t.case_id).seconds += t.duration_seconds || 0));
    return map;
  }, [charges, payments, timeEntries]);

  const profitability = hourlyRate != null
    ? totals.totalCharged - (totals.totalSeconds / 3600) * hourlyRate
    : null;

  const masterPortalLink = client ? `${window.location.origin}/client-portal/${client.id}` : '';

  const sendViewOnlyPortalLink = async () => {
    if (!client) return;
    if (!client.email) {
      toast({ title: 'אין כתובת מייל ללקוח', variant: 'destructive' });
      return;
    }
    setSendingViewLink(true);
    try {
      const response = await invokeEdgeFunction('send-portal-link', {
        clientName: client.full_name,
        clientEmail: client.email,
        caseTitle: 'אזור אישי - צפייה בכל התיקים',
        portalLink: masterPortalLink,
        advisorEmail: user?.email || '',
        advisorName: advisorName || user?.email?.split('@')[0] || '',
        emailType: 'master_portal',
      });
      if ((response as any)?.error) throw new Error((response as any).error);
      toast({ title: 'הקישור נשלח', description: `קישור צפייה נשלח ל-${client.email}` });
    } catch (err: any) {
      toast({ title: 'שגיאה בשליחת המייל', description: err?.message, variant: 'destructive' });
    } finally {
      setSendingViewLink(false);
    }
  };

  const sendUploadPortalLink = async (caseRow: CaseRow) => {
    if (!client?.email) {
      toast({ title: 'אין כתובת מייל ללקוח', variant: 'destructive' });
      return;
    }
    if (!caseRow.portal_token) {
      toast({ title: 'לתיק זה אין קישור פורטל', variant: 'destructive' });
      return;
    }
    setSendingUploadLink(true);
    try {
      const portalLink = `${window.location.origin}/portal/${caseRow.portal_token}`;
      const response = await invokeEdgeFunction('send-portal-link', {
        clientName: client.full_name,
        clientEmail: client.email,
        caseTitle: caseRow.title,
        portalLink,
        advisorEmail: user?.email || '',
        advisorName: advisorName || user?.email?.split('@')[0] || '',
        emailType: 'reminder',
      });
      if ((response as any)?.error) throw new Error((response as any).error);
      const now = new Date().toISOString();
      const sentAtUpdate = await supabase.from('cases').update({ last_portal_link_sent_at: now }).eq('id', caseRow.id);
      if (sentAtUpdate.error && !isMissingColumnError(sentAtUpdate.error, 'last_portal_link_sent_at')) throw sentAtUpdate.error;
      toast({ title: 'הקישור נשלח', description: `קישור להעלאת מסמכים נשלח ל-${client.email}` });
      setUploadCasePickerOpen(false);
    } catch (err: any) {
      toast({ title: 'שגיאה בשליחת המייל', description: err?.message, variant: 'destructive' });
    } finally {
      setSendingUploadLink(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-16 text-muted-foreground">טוען...</div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">לקוח לא נמצא</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/clients')}>
            חזרה ללקוחות
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="gap-1 -ms-2">
              <ArrowRight className="h-4 w-4" />
              חזרה ללקוחות
            </Button>
            <h1 className="text-2xl font-bold">{client.full_name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {client.id_number && (
                <span className="flex items-center gap-1"><IdCard className="h-4 w-4" />{client.id_number}</span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1" dir="ltr"><Phone className="h-4 w-4" />{client.phone}</span>
              )}
              {client.email && (
                <span className="flex items-center gap-1" dir="ltr"><Mail className="h-4 w-4" />{client.email}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto md:min-w-[520px]">
            {/* Upload portal link (per case) */}
            <Card className="shadow-sm border-primary/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Upload className="h-4 w-4 text-primary" />
                  קישור להעלאת מסמכים
                </div>
                <p className="text-xs text-muted-foreground">
                  שולח ללקוח קישור לפורטל של תיק ספציפי שבו הוא יכול להעלות מסמכים
                </p>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setUploadCasePickerOpen(true)}
                  disabled={cases.length === 0}
                >
                  <Send className="h-4 w-4" />
                  שלח קישור העלאה
                </Button>
              </CardContent>
            </Card>

            {/* View-only master portal */}
            <Card className="shadow-sm border-info/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Eye className="h-4 w-4 text-info" />
                  קישור לצפייה בלבד
                </div>
                <p className="text-xs text-muted-foreground">
                  שולח ללקוח קישור לאזור אישי שבו הוא רואה את כל התיקים שלו — ללא אפשרות לערוך
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={sendViewOnlyPortalLink}
                    disabled={sendingViewLink || !client.email}
                  >
                    {sendingViewLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    שלח במייל
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="העתק קישור"
                    onClick={() => {
                      navigator.clipboard.writeText(masterPortalLink);
                      toast({ title: 'הקישור הועתק' });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="פתח"
                    onClick={() => window.open(masterPortalLink, '_blank')}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="תיקים" value={String(cases.length)} icon={<FolderOpen className="h-4 w-4" />} />
          <SummaryCard label="סך חיובים" value={formatCurrency(totals.totalCharged)} icon={<Receipt className="h-4 w-4" />} />
          <SummaryCard
            label="יתרה לתשלום"
            value={formatCurrency(totals.balance)}
            icon={<Banknote className="h-4 w-4" />}
            accent={totals.balance > 0 ? 'warning' : 'success'}
          />
          <SummaryCard
            label="זמן עבודה"
            value={formatDuration(totals.totalSeconds)}
            icon={<TrendingUp className="h-4 w-4" />}
            subtext={profitability != null ? `כדאיות: ${formatCurrency(profitability)}` : 'הגדר תעריף שעה בהגדרות'}
          />
        </div>

        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents" className="gap-1">
              <FileText className="h-4 w-4" />
              מסמכי לקוח
            </TabsTrigger>
            <TabsTrigger value="cases">תיקים</TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              סיכומי שיחה
            </TabsTrigger>
            <TabsTrigger value="finance">סיכום פיננסי</TabsTrigger>
            <TabsTrigger value="time">זמן עבודה</TabsTrigger>
            <TabsTrigger value="activity">היסטוריית פעילות</TabsTrigger>
          </TabsList>

          {/* Client documents */}
          <TabsContent value="documents">
            <ClientDocumentsPanel clientId={client.id} />
          </TabsContent>

          {/* Conversation summaries */}
          <TabsContent value="conversations">
            <ClientConversationsPanel clientId={client.id} />
          </TabsContent>

          {/* Cases */}
          <TabsContent value="cases">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">רשימת תיקים</CardTitle>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">אין תיקים ללקוח זה</div>
                ) : (
                  <div className="divide-y">
                    {cases.map((c) => {
                      const stats = perCase.get(c.id) || { charged: 0, paid: 0, seconds: 0 };
                      return (
                        <Link
                          key={c.id}
                          to={`/cases/${c.id}`}
                          className="flex items-center justify-between gap-3 py-3 hover:bg-accent/40 rounded px-2 -mx-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{c.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(c.created_at), 'dd/MM/yyyy')} • {c.status}
                            </div>
                          </div>
                          <div className="text-sm tabular-nums text-right">
                            <div>חיובים: <span className="font-semibold">{formatCurrency(stats.charged)}</span></div>
                            <div className="text-xs text-muted-foreground">
                              יתרה: {formatCurrency(stats.charged - stats.paid)} • {formatDuration(stats.seconds)}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance */}
          <TabsContent value="finance" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">חיובים</CardTitle></CardHeader>
              <CardContent>
                {charges.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">אין חיובים</div>
                ) : (
                  <div className="divide-y">
                    {charges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="text-muted-foreground tabular-nums shrink-0">{format(new Date(c.charged_at), 'dd/MM/yyyy')}</div>
                        <div className="flex-1 truncate">{c.description || '—'}</div>
                        <div className="font-semibold tabular-nums">{formatCurrency(Number(c.amount))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">תשלומים</CardTitle></CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">אין תשלומים</div>
                ) : (
                  <div className="divide-y">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="text-muted-foreground tabular-nums shrink-0">{format(new Date(p.paid_at), 'dd/MM/yyyy')}</div>
                        <div className="flex-1 truncate">{[p.payment_method, p.description].filter(Boolean).join(' • ') || '—'}</div>
                        <div className="font-semibold tabular-nums">{formatCurrency(Number(p.amount))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time */}
          <TabsContent value="time">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">רישומי זמן</CardTitle></CardHeader>
              <CardContent>
                {timeEntries.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">לא נרשמו שעות</div>
                ) : (
                  <div className="divide-y">
                    {timeEntries.map((t) => {
                      const c = cases.find((cs) => cs.id === t.case_id);
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <div className="text-muted-foreground tabular-nums shrink-0">{format(new Date(t.started_at), 'dd/MM/yyyy HH:mm')}</div>
                          <div className="flex-1 truncate">{c?.title || '—'} {t.description ? `• ${t.description}` : ''}</div>
                          <div className="font-mono tabular-nums">{t.duration_seconds != null ? formatDuration(t.duration_seconds) : 'פועל...'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  פעילות אחרונה
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">אין פעילות</div>
                ) : (
                  <div className="space-y-3">
                    {activity.map((a) => {
                      const c = cases.find((cs) => cs.id === a.case_id);
                      return (
                        <div key={a.id} className="flex gap-3 text-sm border-r-2 border-primary/40 pr-3">
                          <div className="text-muted-foreground tabular-nums shrink-0 w-32">
                            {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                          <div className="flex-1">
                            <div>{a.description}</div>
                            {c && <div className="text-xs text-muted-foreground">{c.title}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload-link case picker dialog */}
      <Dialog open={uploadCasePickerOpen} onOpenChange={setUploadCasePickerOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">בחר תיק לשליחת קישור העלאה</DialogTitle>
            <DialogDescription className="text-right">
              הקישור יישלח ל-{client.email || 'הלקוח'} ויאפשר לו להעלות מסמכים לתיק שתבחר
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין תיקים</p>
            ) : (
              cases.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  className="w-full justify-between gap-2 h-auto py-3"
                  disabled={sendingUploadLink}
                  onClick={() => sendUploadPortalLink(c)}
                >
                  <div className="flex flex-col items-start text-right min-w-0">
                    <span className="font-medium truncate w-full">{c.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), 'dd/MM/yyyy')} • {c.status}
                    </span>
                  </div>
                  {sendingUploadLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
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