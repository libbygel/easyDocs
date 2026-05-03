import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ListChecks, CheckCircle2, Briefcase, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  priority: string;
  completed_at: string | null;
  created_at: string;
  case_id: string | null;
  client_id: string | null;
}

interface CaseOption { id: string; title: string; client_id: string; clients?: { full_name: string } | null; }
interface ClientOption { id: string; full_name: string; }

const priorityConfig: Record<string, { label: string; className: string }> = {
  high: { label: 'גבוהה', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  normal: { label: 'רגילה', className: 'bg-primary/10 text-primary border-primary/20' },
  low: { label: 'נמוכה', className: 'bg-muted text-muted-foreground border-muted' },
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'completed' | 'all'>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('none');
  const [selectedClientId, setSelectedClientId] = useState<string>('none');
  const [filterCaseId, setFilterCaseId] = useState<string>('all');

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('personal_tasks' as any)
      .select('*')
      .eq('advisor_id', user.id)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('שגיאה בטעינת המשימות');
    } else {
      setTasks((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    if (user) {
      supabase.from('cases').select('id, title, client_id, clients!cases_client_id_fkey(full_name)')
        .eq('advisor_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => setCases((data as any) || []));
      supabase.from('clients').select('id, full_name')
        .eq('advisor_id', user.id).order('full_name')
        .then(({ data }) => setClients((data as any) || []));
    }
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSubmitting(true);
    const caseId = selectedCaseId !== 'none' ? selectedCaseId : null;
    const clientId = caseId
      ? cases.find((c) => c.id === caseId)?.client_id ?? null
      : (selectedClientId !== 'none' ? selectedClientId : null);
    const { error } = await supabase.from('personal_tasks' as any).insert({
      advisor_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      priority,
      case_id: caseId,
      client_id: clientId,
    });
    if (error) {
      toast.error('שגיאה בהוספת המשימה');
    } else {
      toast.success('המשימה נוספה');
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('normal');
      setSelectedCaseId('none');
      setSelectedClientId('none');
      fetchTasks();
    }
    setSubmitting(false);
  };

  const toggleComplete = async (task: Task) => {
    const newVal = !task.is_completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_completed: newVal } : t)));
    const { error } = await supabase
      .from('personal_tasks' as any)
      .update({
        is_completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
    if (error) {
      toast.error('שגיאה בעדכון');
      fetchTasks();
    } else if (newVal) {
      toast.success('כל הכבוד! המשימה הושלמה ✓');
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('למחוק את המשימה?')) return;
    const { error } = await supabase.from('personal_tasks' as any).delete().eq('id', id);
    if (error) {
      toast.error('שגיאה במחיקה');
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('המשימה נמחקה');
    }
  };

  const deleteCompleted = async () => {
    if (!user) return;
    const completedIds = tasks.filter((t) => t.is_completed).map((t) => t.id);
    if (completedIds.length === 0) return;
    if (!confirm(`למחוק ${completedIds.length} משימות שהושלמו?`)) return;
    const { error } = await supabase
      .from('personal_tasks' as any)
      .delete()
      .eq('advisor_id', user.id)
      .eq('is_completed', true);
    if (error) {
      toast.error('שגיאה במחיקה');
    } else {
      setTasks((prev) => prev.filter((t) => !t.is_completed));
      toast.success('המשימות שהושלמו נמחקו');
    }
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'open') return !t.is_completed;
    if (filter === 'completed') return t.is_completed;
    return true;
  }).filter((t) => {
    if (filterCaseId === 'general') return !t.case_id;
    if (filterCaseId !== 'all') return t.case_id === filterCaseId;
    return true;
  });

  const openCount = tasks.filter((t) => !t.is_completed).length;
  const doneCount = tasks.filter((t) => t.is_completed).length;

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().toDateString());
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <ListChecks className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">משימות אישיות</h1>
            <p className="text-sm text-muted-foreground">
              {openCount} פתוחות · {doneCount} הושלמו
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              הוספת משימה חדשה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <Input
                placeholder="כותרת המשימה *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Textarea
                placeholder="תיאור (אופציונלי)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="max-w-[180px]"
                />
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="max-w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">עדיפות גבוהה</SelectItem>
                    <SelectItem value="normal">עדיפות רגילה</SelectItem>
                    <SelectItem value="low">עדיפות נמוכה</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger className="max-w-[200px]">
                    <SelectValue placeholder="קשר לתיק..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא תיק</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} {c.clients?.full_name ? `· ${c.clients.full_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCaseId === 'none' && (
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="max-w-[200px]">
                      <SelectValue placeholder="קשר ללקוח..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא לקוח</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button type="submit" disabled={submitting || !title.trim()} className="mr-auto">
                  <Plus className="h-4 w-4 ml-1" />
                  הוסף משימה
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap items-center">
          {(['open', 'completed', 'all'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'open' ? `פתוחות (${openCount})` : f === 'completed' ? `הושלמו (${doneCount})` : `הכל (${tasks.length})`}
            </Button>
          ))}
          <Select value={filterCaseId} onValueChange={setFilterCaseId}>
            <SelectTrigger className="max-w-[220px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המשימות</SelectItem>
              <SelectItem value="general">כלליות (ללא תיק)</SelectItem>
              {cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {doneCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteCompleted}
              className="mr-auto text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 ml-1" />
              מחק משימות שהושלמו ({doneCount})
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">טוען...</div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                {filter === 'completed' ? 'אין משימות שהושלמו' : 'אין משימות פתוחות'}
              </CardContent>
            </Card>
          ) : (
            filtered.map((task) => (
              <Card
                key={task.id}
                className={cn(
                  'transition-all',
                  task.is_completed && 'opacity-60 bg-muted/30'
                )}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={() => toggleComplete(task)}
                    className="mt-1 h-5 w-5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={cn(
                          'font-medium break-words',
                          task.is_completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {task.title}
                      </h3>
                      <Badge variant="outline" className={priorityConfig[task.priority]?.className}>
                        {priorityConfig[task.priority]?.label || task.priority}
                      </Badge>
                      {task.due_date && (
                        <Badge
                          variant="outline"
                          className={cn(
                            !task.is_completed && isOverdue(task.due_date) && 'bg-destructive/10 text-destructive border-destructive/20'
                          )}
                        >
                          {new Date(task.due_date).toLocaleDateString('he-IL')}
                        </Badge>
                      )}
                      {task.case_id && (
                        <Link to={`/cases/${task.case_id}`}>
                          <Badge variant="outline" className="gap-1 hover:bg-accent">
                            <Briefcase className="h-3 w-3" />
                            {cases.find((c) => c.id === task.case_id)?.title || 'תיק'}
                          </Badge>
                        </Link>
                      )}
                      {!task.case_id && task.client_id && (
                        <Link to={`/clients/${task.client_id}`}>
                          <Badge variant="outline" className="gap-1 hover:bg-accent">
                            <User className="h-3 w-3" />
                            {clients.find((c) => c.id === task.client_id)?.full_name || 'לקוח'}
                          </Badge>
                        </Link>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 break-words whitespace-pre-wrap">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}