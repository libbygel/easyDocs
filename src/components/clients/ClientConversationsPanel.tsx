import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, MessageSquare, Edit2, Trash2, Calendar } from 'lucide-react';

interface Conversation {
  id: string;
  conversation_date: string;
  summary: string;
  created_at: string;
}

interface Props {
  clientId: string;
}

export function ClientConversationsPanel({ clientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Conversation | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('client_conversations' as any)
      .select('id, conversation_date, summary, created_at')
      .eq('client_id', clientId)
      .eq('advisor_id', user.id)
      .order('conversation_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user]);

  const openCreate = () => {
    setEditing(null);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSummary('');
    setDialogOpen(true);
  };

  const openEdit = (c: Conversation) => {
    setEditing(c);
    setDate(c.conversation_date);
    setSummary(c.summary);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!summary.trim()) {
      toast({ title: 'יש להזין סיכום', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('client_conversations' as any)
          .update({ conversation_date: date, summary: summary.trim() })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'הסיכום עודכן' });
      } else {
        const { error } = await supabase.from('client_conversations' as any).insert({
          advisor_id: user.id,
          client_id: clientId,
          conversation_date: date,
          summary: summary.trim(),
        });
        if (error) throw error;
        toast({ title: 'הסיכום נוסף' });
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err: any) {
      toast({ title: 'שגיאה', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('client_conversations' as any).delete().eq('id', deleteId);
    toast({ title: 'הסיכום נמחק' });
    setDeleteId(null);
    fetchItems();
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          סיכומי שיחה ({items.length})
        </CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          סיכום חדש
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">טוען...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>אין סיכומי שיחה עדיין</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(c.conversation_date), 'dd/MM/yyyy')}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{c.summary}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right">{editing ? 'עריכת סיכום שיחה' : 'סיכום שיחה חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">תאריך השיחה</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">סיכום</label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={6}
                placeholder="פירוט מה דובר בשיחה..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="מחיקת סיכום שיחה"
        description="האם למחוק את סיכום השיחה? לא ניתן לשחזר פעולה זו."
      />
    </Card>
  );
}
