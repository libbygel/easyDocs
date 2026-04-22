import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { validateIsraeliId } from '@/lib/israeliIdValidation';
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
import { Loader2, UserPlus } from 'lucide-react';

interface InlineCreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (clientId: string) => void;
}

export function InlineCreateClientDialog({ 
  open, 
  onOpenChange, 
  onClientCreated 
}: InlineCreateClientDialogProps) {
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateIsraeliId(idNumber)) {
      toast({ title: 'שגיאה', description: 'תעודת זהות לא תקינה', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Check for duplicate ID
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('advisor_id', user.id)
      .eq('id_number', idNumber)
      .maybeSingle();

    if (existing) {
      toast({ title: 'שגיאה', description: 'לקוח עם תעודת זהות זו כבר קיים במערכת', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        advisor_id: user.id,
        full_name: fullName,
        id_number: idNumber,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'הלקוח נוצר בהצלחה' });
      onClientCreated(data.id);
      resetForm();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFullName('');
    setIdNumber('');
    setPhone('');
    setEmail('');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">הוספת לקוח חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inline-fullName" className="text-sm">שם מלא</Label>
            <Input 
              id="inline-fullName" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              required 
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inline-idNumber" className="text-sm">תעודת זהות *</Label>
            <Input 
              id="inline-idNumber" 
              value={idNumber} 
              onChange={(e) => setIdNumber(e.target.value)} 
              required 
              dir="ltr" 
              className="h-9"
              placeholder="מספר ת.ז."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inline-phone" className="text-sm">טלפון</Label>
            <Input 
              id="inline-phone" 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              dir="ltr" 
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inline-email" className="text-sm">אימייל</Label>
            <Input 
              id="inline-email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              dir="ltr" 
              className="h-9"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1" size="sm">
              {loading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="ml-2 h-4 w-4" />
              )}
              הוסף והמשך
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => handleClose(false)}
            >
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
