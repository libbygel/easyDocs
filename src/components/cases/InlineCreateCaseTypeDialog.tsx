import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface InlineCreateCaseTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (caseTypeId: string) => void;
}

export function InlineCreateCaseTypeDialog({
  open,
  onOpenChange,
  onCreated,
}: InlineCreateCaseTypeDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_types')
        .insert({ advisor_id: user.id, name: name.trim() } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'התבנית נוצרה',
        description: 'ניתן להוסיף לה מסמכים מתוך עמוד התבניות',
      });
      onCreated(data.id);
      setName('');
    } catch (err: any) {
      toast({
        title: 'שגיאה ביצירת תבנית',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>תבנית תיק חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="typeName">שם התבנית</Label>
            <Input
              id="typeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: משכנתא חדשה"
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              לאחר היצירה, ניתן להוסיף לתבנית מסמכים נדרשים בעמוד "תבניות".
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
              {loading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="ml-2 h-4 w-4" />
              )}
              צור תבנית
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
