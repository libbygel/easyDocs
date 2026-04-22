import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateContactDialog({ open, onOpenChange, onSuccess }: CreateContactDialogProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('בנקאי');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('contacts').insert({
      advisor_id: user.id,
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      role: role || null,
      notes: notes || null,
    } as any);

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'איש הקשר נוצר בהצלחה' });
      onOpenChange(false);
      onSuccess();
      setFullName(''); setPhone(''); setEmail(''); setRole('בנקאי'); setNotes('');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת איש קשר</DialogTitle>
          <DialogDescription>הוסף בנקאי או איש קשר מקצועי</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">שם מלא</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">תפקיד</Label>
            <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="בנקאי, שמאי..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">טלפון</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות..." rows={2} />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
              הוסף
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
