import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  FolderOpen, 
  FileText, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Upload,
  ArrowLeft,
  TrendingUp
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface DashboardStats {
  totalCases: number;
  openCases: number;
  completedCases: number;
  totalClients: number;
  totalDocuments: number;
  pendingDocuments: number;
  approvedDocuments: number;
  missingDocuments: number;
  rejectedDocuments: number;
  urgentDeadlines: { doc_name: string; due_date: string; case_title: string; case_id: string; days_left: number }[];
  recentActivity: { type: string; message: string; time: string; case_id?: string }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Parallel optimized queries for better performance
        const [casesResult, clientsResult, notificationsResult] = await Promise.all([
          supabase
            .from('cases')
            .select(`
              id, title, status, created_at,
              clients!cases_client_id_fkey ( full_name ),
              case_documents (id, doc_name, due_date, review_status)
            `)
            .eq('advisor_id', user.id),
          supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('advisor_id', user.id),
          supabase
            .from('notifications')
            .select('id, title, message, created_at, case_id, type')
            .eq('advisor_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        const cases = casesResult.data || [];
        const totalCases = cases.length;
        const openCases = cases.filter(c => c.status !== 'הושלם' && c.status !== 'מוקפא').length;
        const completedCases = cases.filter(c => c.status === 'הושלם').length;

        const allDocs = cases.flatMap(c => 
          (c.case_documents || []).map((d: any) => ({
            ...d,
            case_id: c.id,
            case_title: c.title,
            client_name: (c as any).clients?.full_name || 'לקוח'
          }))
        );

        const totalDocuments = allDocs.length;
        const pendingDocuments = allDocs.filter(d => d.review_status === 'הועלה' || d.review_status === 'נחתם').length;
        const approvedDocuments = allDocs.filter(d => d.review_status === 'תקין').length;
        const missingDocuments = allDocs.filter(d => d.review_status === 'חסר').length;
        const rejectedDocuments = allDocs.filter(d => d.review_status === 'לא תקין').length;

        const now = new Date();
        const weekFromNow = addDays(now, 7);
        
        const urgentDeadlines = allDocs
          .filter(d => {
            if (!d.due_date) return false;
            if (d.review_status !== 'חסר' && d.review_status !== 'לא תקין') return false;
            const dueDate = new Date(d.due_date);
            return dueDate >= now && dueDate <= weekFromNow;
          })
          .map(d => ({
            doc_name: d.doc_name,
            due_date: d.due_date!,
            case_title: d.case_title,
            case_id: d.case_id,
            days_left: differenceInDays(new Date(d.due_date!), now)
          }))
          .sort((a, b) => a.days_left - b.days_left)
          .slice(0, 5);

        const recentActivity = (notificationsResult.data || []).map(n => ({
          type: n.type,
          message: n.title,
          time: n.created_at,
          case_id: n.case_id || undefined
        }));

        setStats({
          totalCases,
          openCases,
          completedCases,
          totalClients: clientsResult.count || 0,
          totalDocuments,
          pendingDocuments,
          approvedDocuments,
          missingDocuments,
          rejectedDocuments,
          urgentDeadlines,
          recentActivity
        });
        setLoading(false);

        // Non-blocking: create urgent notifications in background
        const twoDaysFromNow = addDays(now, 2);
        const urgentDocs = allDocs.filter(d => {
          if (!d.due_date) return false;
          if (d.review_status !== 'חסר' && d.review_status !== 'לא תקין') return false;
          return new Date(d.due_date) <= twoDaysFromNow;
        });

        if (urgentDocs.length > 0) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { data: existingUrgent } = await supabase
            .from('notifications')
            .select('title, case_id')
            .eq('advisor_id', user.id)
            .eq('type', 'מסמך_דחוף')
            .gte('created_at', todayStart.toISOString());

          const existingKeys = new Set(
            (existingUrgent || []).map(n => `${n.case_id}_${n.title}`)
          );

          const newNotifications = urgentDocs
            .filter(d => !existingKeys.has(`${d.case_id}_מסמך דחוף: ${d.doc_name} - ${d.client_name}`))
            .map(d => ({
              advisor_id: user.id,
              case_id: d.case_id,
              type: 'מסמך_דחוף',
              title: `מסמך דחוף: ${d.doc_name} - ${d.client_name}`,
              message: `לקוח: ${d.client_name}\nתיק: ${d.case_title}\nתאריך יעד: ${format(new Date(d.due_date), 'dd/MM/yyyy')}`,
              is_read: false,
            }));

          if (newNotifications.length > 0) {
            await supabase.from('notifications').insert(newNotifications);
            window.dispatchEvent(new Event('notifications-changed'));
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-48 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!stats) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">שגיאה בטעינת הנתונים</div>
      </AppLayout>
    );
  }

  const documentPieData = [
    { name: 'תקין', value: stats.approvedDocuments, color: '#16A34A' },
    { name: 'ממתין', value: stats.pendingDocuments, color: '#EAB308' },
    { name: 'חסר', value: stats.missingDocuments, color: '#9CA3AF' },
    { name: 'נדחה', value: stats.rejectedDocuments, color: '#DC2626' },
  ].filter(d => d.value > 0);

  const casePieData = [
    { name: 'פתוח', value: stats.openCases, color: '#2563EB' },
    { name: 'הושלם', value: stats.completedCases, color: '#16A34A' },
  ].filter(d => d.value > 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">דשבורד</h1>
          <p className="text-muted-foreground">סקירה כללית של כל התיקים והמסמכים</p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cases')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">תיקים פתוחים</CardTitle>
              <FolderOpen className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.openCases}</div>
              <p className="text-xs text-muted-foreground">מתוך {stats.totalCases} תיקים</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/clients')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">לקוחות</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">סה"כ לקוחות</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/pending-documents?view=pending')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ממתינים לבדיקה</CardTitle>
              <Clock className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.pendingDocuments}</div>
              <p className="text-xs text-muted-foreground">לחצי כדי לראות את רשימת המסמכים הממתינים</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/pending-documents?view=missing')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">מסמכים חסרים</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.missingDocuments + stats.rejectedDocuments}</div>
              <p className="text-xs text-muted-foreground">לחצי כדי לעבור לרשימת המסמכים החסרים</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Lists */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Document Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                סטטוס מסמכים
              </CardTitle>
              <CardDescription>התפלגות מסמכים לפי סטטוס</CardDescription>
            </CardHeader>
            <CardContent>
              {documentPieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="h-48 w-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={documentPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {documentPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {documentPieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between font-medium">
                        <span>סה"כ</span>
                        <span>{stats.totalDocuments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  אין מסמכים להצגה
                </div>
              )}
            </CardContent>
          </Card>

          {/* Urgent Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                מסמכים דחופים
              </CardTitle>
              <CardDescription>תאריכי יעד ב-7 הימים הקרובים</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.urgentDeadlines.length > 0 ? (
                <div className="space-y-3">
                  {stats.urgentDeadlines.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => navigate(`/cases/${item.case_id}`)}
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{item.doc_name}</p>
                        <p className="text-xs text-muted-foreground">{item.case_title}</p>
                      </div>
                      <div className="text-left">
                        <div className={`text-sm font-medium ${item.days_left <= 1 ? 'text-destructive' : item.days_left <= 3 ? 'text-warning' : ''}`}>
                          {item.days_left === 0 ? 'היום!' : item.days_left === 1 ? 'מחר' : `עוד ${item.days_left} ימים`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(item.due_date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                  <p>אין מסמכים דחופים השבוע</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              פעילות אחרונה
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${activity.case_id ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => activity.case_id && navigate(`/cases/${activity.case_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        activity.type === 'מסמך_דחוף' ? 'bg-destructive' :
                        activity.type === 'מסמך_התקבל' ? 'bg-success' :
                        'bg-primary'
                      }`} />
                      <span>{activity.message}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(activity.time), 'dd/MM HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                אין פעילות אחרונה
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
