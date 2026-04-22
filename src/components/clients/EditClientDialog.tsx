import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function EditClientDialog({ open, onOpenChange, client, onSuccess }: EditClientDialogProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (client) {
      setFullName(client.full_name);
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setIdNumber(client.id_number || '');
      setNotes(client.notes || '');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setLoading(true);

    // Try with notes first, fallback without if column doesn't exist
    let error: any = null;
    const { error: err1 } = await supabase
      .from('clients')
      .update({
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        id_number: idNumber || null,
        notes: notes || null,
      })
      .eq('id', client.id);
    
    if (err1?.message?.includes('notes')) {
      const { error: err2 } = await supabase
        .from('clients')
        .update({
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          id_number: idNumber || null,
        })
        .eq('id', client.id);
      error = err2;
    } else {
      error = err1;
    }

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'הלקוח עודכן בהצלחה' });
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>עריכת לקוח</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">שם מלא</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idNumber">תעודת זהות</Label>
            <Input 
              id="idNumber" 
              value={idNumber} 
              onChange={(e) => setIdNumber(e.target.value)} 
              dir="ltr" 
              placeholder="מספר ת.ז."
              maxLength={9}
            />
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
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="הערות על הלקוח..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
              שמור שינויים
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
