import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ISRAELI_BANKS, getBankNameByCode } from '@/lib/israeliBanks';
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
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [spouseFullName, setSpouseFullName] = useState('');
  const [spouseIdNumber, setSpouseIdNumber] = useState('');
  const [spousePhone, setSpousePhone] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');
  const [childrenBirthYearsInput, setChildrenBirthYearsInput] = useState('');
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

    const childrenBirthYears = Array.from(
      new Set(
        childrenBirthYearsInput
          .split(/[\s,;\n]+/)
          .map((part) => part.trim())
          .filter(Boolean)
      )
    );

    const invalidYear = childrenBirthYears.find((year) => !/^\d{4}$/.test(year));
    if (invalidYear) {
      toast({ title: 'שגיאה', description: 'שנות לידה חייבות להיות ב-4 ספרות, לדוגמה 2014', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const insertPayload: any = {
      advisor_id: user.id,
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      id_number: idNumber || null,
      category_id: categoryId || null,
      spouse_full_name: spouseFullName || null,
      spouse_id_number: spouseIdNumber || null,
      spouse_phone: spousePhone || null,
      spouse_email: spouseEmail || null,
      children_birth_years: childrenBirthYears.length > 0 ? childrenBirthYears : null,
      bank_name: bankName || null,
      bank_number: bankNumber || null,
      bank_branch: bankBranch || null,
      bank_account_number: bankAccountNumber || null,
      bank_account_holder: bankAccountHolder || null,
    };
    let { error } = await supabase.from('clients').insert(insertPayload);
    // Resilience: if newer columns don't exist on a remote/external DB
    if (error && /column .* does not exist/i.test(error.message)) {
      const fallback = { ...insertPayload };
      delete fallback.category_id;
      delete fallback.spouse_full_name;
      delete fallback.spouse_id_number;
      delete fallback.spouse_phone;
      delete fallback.spouse_email;
      delete fallback.children_birth_years;
      delete fallback.bank_name;
      delete fallback.bank_number;
      delete fallback.bank_branch;
      delete fallback.bank_account_number;
      delete fallback.bank_account_holder;
      const retry = await supabase.from('clients').insert(fallback);
      error = retry.error;
    }

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'הלקוח נוצר בהצלחה' });
      onOpenChange(false);
      onSuccess();
      setFullName(''); setPhone(''); setEmail(''); setIdNumber('');
      setCategoryId(''); setSpouseFullName(''); setSpouseIdNumber(''); setSpousePhone(''); setSpouseEmail(''); setChildrenBirthYearsInput('');
      setBankName(''); setBankNumber(''); setBankBranch(''); setBankAccountNumber(''); setBankAccountHolder('');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-right">הוספת לקוח חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">סיווג לקוח</Label>
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
          <div className="space-y-2">
            <Label htmlFor="childrenBirthYears">שנות לידה של ילדים</Label>
            <Input
              id="childrenBirthYears"
              value={childrenBirthYearsInput}
              onChange={(e) => setChildrenBirthYearsInput(e.target.value)}
              placeholder="למשל: 2012, 2015"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">אפשר להפריד עם פסיק, רווח או שורה חדשה</p>
          </div>

          <Separator />
          <div className="space-y-3">
            <div>
              <Label className="text-base">פרטי בנק (אופציונלי)</Label>
              <p className="text-xs text-muted-foreground mt-1">לא מוצג במסך הלקוחות הראשי</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountHolder" className="text-sm">שם בעל החשבון</Label>
              <Input id="bankAccountHolder" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-sm">שם הבנק</Label>
              <Select
                value={bankNumber || undefined}
                onValueChange={(value) => {
                  setBankNumber(value);
                  setBankName(getBankNameByCode(value));
                }}
              >
                <SelectTrigger id="bankName">
                  <SelectValue placeholder="בחר בנק" />
                </SelectTrigger>
                <SelectContent>
                  {ISRAELI_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={String(bank.code)}>
                      {bank.name} ({bank.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bankBranch" className="text-sm">סניף</Label>
                <Input id="bankBranch" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber" className="text-sm">מספר חשבון</Label>
                <Input id="bankAccountNumber" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} dir="ltr" />
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
              <Label htmlFor="spouseFullName" className="text-sm">שם מלא</Label>
              <Input id="spouseFullName" value={spouseFullName} onChange={(e) => setSpouseFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouseId" className="text-sm">תעודת זהות</Label>
              <Input id="spouseId" value={spouseIdNumber} onChange={(e) => setSpouseIdNumber(e.target.value)} dir="ltr" maxLength={9} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="spousePhone" className="text-sm">טלפון</Label>
                <Input id="spousePhone" type="tel" value={spousePhone} onChange={(e) => setSpousePhone(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spouseEmail" className="text-sm">אימייל</Label>
                <Input id="spouseEmail" type="email" value={spouseEmail} onChange={(e) => setSpouseEmail(e.target.value)} dir="ltr" />
              </div>
            </div>
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
