import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Tags, Loader2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface Category {
  id: string;
  name: string;
}

export function CategoriesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('client_categories' as any)
      .select('id, name')
      .eq('advisor_id', user.id)
      .order('name');
    setCategories(((data as any) || []) as Category[]);
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from('client_categories' as any)
      .insert({ advisor_id: user.id, name: newName.trim() } as any);
    setLoading(false);
    if (error) {
      toast({ title: 'שגיאה', description: error.message.includes('duplicate') ? 'סיווג כזה כבר קיים' : error.message, variant: 'destructive' });
      return;
    }
    setNewName('');
    toast({ title: 'הסיווג נוסף' });
    fetchCategories();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('client_categories' as any).delete().eq('id', deleteId);
    setDeleteId(null);
    toast({ title: 'הסיווג נמחק', description: 'לקוחות שהיו בסיווג זה לא נמחקו' });
    fetchCategories();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tags className="h-5 w-5" />
          סיווגי לקוחות
        </CardTitle>
        <CardDescription>
          נהלי סיווגים כמו "עוסק פטור" / "עוסק מורשה" / "VIP" — ותוכלי לשלוח להם מיילים קבוצתיים מעמוד הלקוחות.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="שם סיווג חדש..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          />
          <Button onClick={handleAdd} disabled={loading || !newName.trim()} className="gap-2 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            הוסף
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין סיווגים עדיין</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{cat.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(cat.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <DeleteConfirmationDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="מחיקת סיווג"
        description="האם למחוק את הסיווג? לקוחות שהיו משויכים אליו יישארו, אך ללא סיווג."
      />
    </Card>
  );
}