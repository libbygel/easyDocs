import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onSuccess }: CreateClientDialogProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Check for duplicate ID number
    if (idNumber) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('advisor_id', user.id)
        .eq('id_number', idNumber)
        .maybeSingle();

      if (existingClient) {
        toast({ title: 'שגיאה', description: 'לקוח עם תעודת זהות זו כבר קיים במערכת', variant: 'destructive' });
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.from('clients').insert({
      advisor_id: user.id,
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      id_number: idNumber || null,
    });

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'הלקוח נוצר בהצלחה' });
      onOpenChange(false);
      onSuccess();
      setFullName(''); setPhone(''); setEmail(''); setIdNumber('');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת לקוח חדש</DialogTitle>
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
              required
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
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
              הוסף לקוח
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
