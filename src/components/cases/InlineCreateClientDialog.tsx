import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  onClientCreated,
}: InlineCreateClientDialogProps) {
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [spouseFullName, setSpouseFullName] = useState('');
  const [spouseIdNumber, setSpouseIdNumber] = useState('');
  const [spousePhone, setSpousePhone] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from('client_categories' as any)
      .select('id, name')
      .eq('advisor_id', user.id)
      .order('name')
      .then(({ data }) => setCategories((data as any) || []));
  }, [open, user]);

  const resetForm = () => {
    setFullName(''); setIdNumber(''); setPhone(''); setEmail('');
    setCategoryId(''); setSpouseFullName(''); setSpouseIdNumber('');
    setSpousePhone(''); setSpouseEmail('');
    setBankName(''); setBankNumber(''); setBankBranch('');
    setBankAccountNumber(''); setBankAccountHolder('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateIsraeliId(idNumber)) {
      toast({ title: 'שגיאה', description: 'תעודת זהות לא תקינה', variant: 'destructive' });
      return;
    }

    setLoading(true);

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

    const insertPayload: any = {
      advisor_id: user.id,
      full_name: fullName,
      id_number: idNumber,
      phone: phone || null,
      email: email || null,
      category_id: categoryId || null,
      spouse_full_name: spouseFullName || null,
      spouse_id_number: spouseIdNumber || null,
      spouse_phone: spousePhone || null,
      spouse_email: spouseEmail || null,
      bank_name: bankName || null,
      bank_number: bankNumber || null,
      bank_branch: bankBranch || null,
      bank_account_number: bankAccountNumber || null,
      bank_account_holder: bankAccountHolder || null,
    };

    let { data, error } = await supabase
      .from('clients')
      .insert(insertPayload)
      .select()
      .single();

    if (error && (error.code === 'PGRST204' || /column .* does not exist/i.test(error.message) || /schema cache/i.test(error.message))) {
      const fallback = { ...insertPayload };
      delete fallback.category_id;
      delete fallback.spouse_full_name;
      delete fallback.spouse_id_number;
      delete fallback.spouse_phone;
      delete fallback.spouse_email;
      delete fallback.bank_name;
      delete fallback.bank_number;
      delete fallback.bank_branch;
      delete fallback.bank_account_number;
      delete fallback.bank_account_holder;
      const retry = await supabase.from('clients').insert(fallback).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'הלקוח נוצר בהצלחה' });
      onClientCreated(data.id);
      resetForm();
    }
    setLoading(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-right">הוספת לקוח חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="inline-fullName">שם מלא</Label>
            <Input id="inline-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inline-idNumber">תעודת זהות *</Label>
            <Input
              id="inline-idNumber"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
              dir="ltr"
              maxLength={9}
              placeholder="מספר ת.ז."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inline-phone">טלפון</Label>
              <Input id="inline-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-email">אימייל</Label>
              <Input id="inline-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inline-category">סיווג לקוח</Label>
            <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="ללא סיווג" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">ללא סיווג</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">לניהול הסיווגים: הגדרות → סיווגי לקוחות</p>
          </div>

          <Separator />
          <div className="space-y-3">
            <div>
              <Label className="text-base">פרטי בנק (אופציונלי)</Label>
              <p className="text-xs text-muted-foreground mt-1">לא מוצג במסך הלקוחות הראשי</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-bankAccountHolder" className="text-sm">שם בעל החשבון</Label>
              <Input id="inline-bankAccountHolder" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inline-bankName" className="text-sm">שם הבנק</Label>
                <Input id="inline-bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inline-bankNumber" className="text-sm">מספר בנק</Label>
                <Input id="inline-bankNumber" value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inline-bankBranch" className="text-sm">סניף</Label>
                <Input id="inline-bankBranch" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inline-bankAccountNumber" className="text-sm">מספר חשבון</Label>
                <Input id="inline-bankAccountNumber" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} dir="ltr" />
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-3">
            <div>
              <Label className="text-base">פרטי בן/בת זוג (אופציונלי)</Label>
              <p className="text-xs text-muted-foreground mt-1">השאירי ריק אם לא רלוונטי</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-spouseFullName" className="text-sm">שם מלא</Label>
              <Input id="inline-spouseFullName" value={spouseFullName} onChange={(e) => setSpouseFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-spouseId" className="text-sm">תעודת זהות</Label>
              <Input id="inline-spouseId" value={spouseIdNumber} onChange={(e) => setSpouseIdNumber(e.target.value)} dir="ltr" maxLength={9} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inline-spousePhone" className="text-sm">טלפון</Label>
                <Input id="inline-spousePhone" type="tel" value={spousePhone} onChange={(e) => setSpousePhone(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inline-spouseEmail" className="text-sm">אימייל</Label>
                <Input id="inline-spouseEmail" type="email" value={spouseEmail} onChange={(e) => setSpouseEmail(e.target.value)} dir="ltr" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UserPlus className="ml-2 h-4 w-4" />}
              הוסף והמשך
            </Button>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>ביטול</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
