import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  priority: string;
  case_id: string | null;
  client_id: string | null;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  high: { label: 'גבוהה', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  normal: { label: 'רגילה', className: 'bg-primary/10 text-primary border-primary/20' },
  low: { label: 'נמוכה', className: 'bg-muted text-muted-foreground border-muted' },
};

const isMissingLinkColumnsError = (error: unknown) => {
  const message = String((error as { message?: string; code?: string } | null)?.message || '');
  const code = String((error as { code?: string } | null)?.code || '');
  return code === 'PGRST204' || message.includes("'case_id'") || message.includes("'client_id'");
};

interface Props {
  caseId: string;
  clientId: string | null;
}

export function CaseTasksPanel({ caseId, clientId }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    let { data, error } = await supabase
      .from('personal_tasks' as any)
      .select('*')
      .eq('advisor_id', user.id)
      .eq('case_id', caseId)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false });

    if (error && isMissingLinkColumnsError(error)) {
      data = [];
      error = null;
    }

    if (error) toast.error('שגיאה בטעינת המשימות');
    else setTasks((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [user, caseId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('personal_tasks' as any).insert({
      advisor_id: user.id,
      title: title.trim(),
      due_date: dueDate || null,
      priority,
      case_id: caseId,
      client_id: clientId,
    });
    if (error && isMissingLinkColumnsError(error)) toast.error('קישור משימות לתיק עדיין לא הופעל בבסיס הנתונים');
    else if (error) toast.error('שגיאה בהוספת המשימה');
    else {
      toast.success('המשימה נוספה');
      setTitle('');
      setDueDate('');
      setPriority('normal');
      fetchTasks();
    }
    setSubmitting(false);
  };

  const toggleComplete = async (task: Task) => {
    const newVal = !task.is_completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_completed: newVal } : t)));
    const { error } = await supabase
      .from('personal_tasks' as any)
      .update({ is_completed: newVal, completed_at: newVal ? new Date().toISOString() : null })
      .eq('id', task.id);
    if (error) {
      toast.error('שגיאה בעדכון');
      fetchTasks();
    } else if (newVal) toast.success('כל הכבוד! המשימה הושלמה ✓');
  };

  const deleteTask = async (id: string) => {
    if (!confirm('למחוק את המשימה?')) return;
    const { error } = await supabase.from('personal_tasks' as any).delete().eq('id', id);
    if (error) toast.error('שגיאה במחיקה');
    else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('המשימה נמחקה');
    }
  };

  const openCount = tasks.filter((t) => !t.is_completed).length;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">משימות בתיק זה</h3>
        <Badge variant="outline">{openCount} פתוחות</Badge>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="משימה חדשה..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="max-w-[160px]"
        />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="max-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">גבוהה</SelectItem>
            <SelectItem value="normal">רגילה</SelectItem>
            <SelectItem value="low">נמוכה</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={submitting || !title.trim()}>
          <Plus className="h-4 w-4 ml-1" />
          הוסף
        </Button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">טוען...</div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              אין משימות בתיק זה. הוסף את הראשונה למעלה!
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={cn('transition-all', task.is_completed && 'opacity-60 bg-muted/30')}>
              <CardContent className="p-3 flex items-center gap-3">
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={() => toggleComplete(task)}
                  className="h-5 w-5"
                />
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className={cn('font-medium break-words', task.is_completed && 'line-through text-muted-foreground')}>
                    {task.title}
                  </span>
                  <Badge variant="outline" className={priorityConfig[task.priority]?.className}>
                    {priorityConfig[task.priority]?.label}
                  </Badge>
                  {task.due_date && (
                    <Badge variant="outline">{new Date(task.due_date).toLocaleDateString('he-IL')}</Badge>
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
  );
}