import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Lock, Plus, Eye, EyeOff, Copy, Trash2, Edit2, KeyRound, ShieldCheck, LogOut } from 'lucide-react';
import {
  randomSalt, makeVerifier, verifyPassword, openVault, encryptText, decryptText,
  type VaultSession,
} from '@/lib/vaultCrypto';

interface Props { clientId: string }

interface PwRow {
  id: string;
  service_name: string;
  username_ciphertext: string | null;
  username_iv: string | null;
  password_ciphertext: string;
  password_iv: string;
  notes_ciphertext: string | null;
  notes_iv: string | null;
  decrypted?: { username: string; password: string; notes: string };
  show?: boolean;
}

export function ClientPasswordsPanel({ clientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [vaultExists, setVaultExists] = useState(false);
  const [salt, setSalt] = useState<string>('');
  const [verifier, setVerifier] = useState<string>('');
  const [session, setSession] = useState<VaultSession | null>(null);

  // setup form
  const [setupPw, setSetupPw] = useState('');
  const [setupPw2, setSetupPw2] = useState('');
  // unlock form
  const [unlockPw, setUnlockPw] = useState('');

  const [rows, setRows] = useState<PwRow[]>([]);
  const [editing, setEditing] = useState<PwRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ service_name: '', username: '', password: '', notes: '' });

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('vault_settings' as any).select('salt, verifier').eq('advisor_id', user.id).maybeSingle();
      if (data) {
        setVaultExists(true);
        setSalt((data as any).salt);
        setVerifier((data as any).verifier);
      }
      setLoading(false);
    })();
  }, [user]);

  const loadRows = async (s: VaultSession) => {
    const { data } = await supabase
      .from('client_passwords' as any).select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setRows(((data as any) || []) as PwRow[]);
  };

  const handleCreateVault = async () => {
    if (!user) return;
    if (setupPw.length < 6) return toast({ title: 'סיסמה קצרה מדי (לפחות 6 תווים)', variant: 'destructive' });
    if (setupPw !== setupPw2) return toast({ title: 'הסיסמאות אינן תואמות', variant: 'destructive' });
    const s = randomSalt();
    const v = await makeVerifier(setupPw, s);
    const { error } = await supabase.from('vault_settings' as any).insert({ advisor_id: user.id, salt: s, verifier: v });
    if (error) return toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    setSalt(s); setVerifier(v); setVaultExists(true);
    const sess = await openVault(setupPw, s);
    setSession(sess);
    setSetupPw(''); setSetupPw2('');
    await loadRows(sess);
    toast({ title: 'הכספת נוצרה בהצלחה' });
  };

  const handleUnlock = async () => {
    const ok = await verifyPassword(unlockPw, salt, verifier);
    if (!ok) return toast({ title: 'סיסמה שגויה', variant: 'destructive' });
    const sess = await openVault(unlockPw, salt);
    setSession(sess);
    setUnlockPw('');
    await loadRows(sess);
  };

  const handleLock = () => {
    setSession(null);
    setRows([]);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ service_name: '', username: '', password: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = async (row: PwRow) => {
    if (!session) return;
    const username = row.username_ciphertext && row.username_iv ? await decryptText(session, row.username_ciphertext, row.username_iv) : '';
    const password = await decryptText(session, row.password_ciphertext, row.password_iv);
    const notes = row.notes_ciphertext && row.notes_iv ? await decryptText(session, row.notes_ciphertext, row.notes_iv) : '';
    setEditing(row);
    setForm({ service_name: row.service_name, username, password, notes });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !session) return;
    if (!form.service_name.trim() || !form.password) {
      return toast({ title: 'שם השירות וסיסמה הם שדות חובה', variant: 'destructive' });
    }
    const pw = await encryptText(session, form.password);
    const un = form.username ? await encryptText(session, form.username) : { ct: null, iv: null };
    const nt = form.notes ? await encryptText(session, form.notes) : { ct: null, iv: null };
    const payload = {
      service_name: form.service_name.trim(),
      username_ciphertext: un.ct, username_iv: un.iv,
      password_ciphertext: pw.ct, password_iv: pw.iv,
      notes_ciphertext: nt.ct, notes_iv: nt.iv,
    };
    if (editing) {
      const { error } = await supabase.from('client_passwords' as any).update(payload).eq('id', editing.id);
      if (error) return toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      const { error } = await supabase.from('client_passwords' as any).insert({
        ...payload, advisor_id: user.id, client_id: clientId,
      });
      if (error) return toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    }
    setDialogOpen(false);
    await loadRows(session);
    toast({ title: 'נשמר' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את הסיסמה?')) return;
    await supabase.from('client_passwords' as any).delete().eq('id', id);
    if (session) await loadRows(session);
  };

  const toggleShow = async (row: PwRow) => {
    if (!session) return;
    if (row.show) {
      setRows((rs) => rs.map((r) => r.id === row.id ? { ...r, show: false } : r));
      return;
    }
    const username = row.username_ciphertext && row.username_iv ? await decryptText(session, row.username_ciphertext, row.username_iv) : '';
    const password = await decryptText(session, row.password_ciphertext, row.password_iv);
    const notes = row.notes_ciphertext && row.notes_iv ? await decryptText(session, row.notes_ciphertext, row.notes_iv) : '';
    setRows((rs) => rs.map((r) => r.id === row.id ? { ...r, show: true, decrypted: { username, password, notes } } : r));
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'הועתק ללוח' });
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">טוען...</div>;

  // First-time setup
  if (!vaultExists) {
    return (
      <Card className="shadow-sm max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />הגדרת כספת סיסמאות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            צרי סיסמת אב חד-פעמית. כל הסיסמאות שתשמרי יוצפנו עם סיסמה זו לפני השליחה לשרת.
            <br />
            <strong className="text-destructive">חשוב:</strong> שמרי את סיסמת האב במקום בטוח. אם תאבדי אותה — לא ניתן יהיה לשחזר את הסיסמאות.
          </p>
          <div className="space-y-2">
            <Label>סיסמת אב חדשה</Label>
            <Input type="password" value={setupPw} onChange={(e) => setSetupPw(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>אימות סיסמה</Label>
            <Input type="password" value={setupPw2} onChange={(e) => setSetupPw2(e.target.value)} dir="ltr" />
          </div>
          <Button onClick={handleCreateVault} className="gap-2"><KeyRound className="h-4 w-4" />צור כספת</Button>
        </CardContent>
      </Card>
    );
  }

  // Locked
  if (!session) {
    return (
      <Card className="shadow-sm max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />כספת סיסמאות נעולה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>סיסמת אב</Label>
            <Input
              type="password" value={unlockPw} dir="ltr"
              onChange={(e) => setUnlockPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
            />
          </div>
          <Button onClick={handleUnlock} className="gap-2"><KeyRound className="h-4 w-4" />פתחי כספת</Button>
        </CardContent>
      </Card>
    );
  }

  // Unlocked
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />סיסמאות הלקוח ({rows.length})</CardTitle>
        <div className="flex gap-2">
          <Button onClick={openAdd} size="sm" className="gap-1"><Plus className="h-4 w-4" />הוספת סיסמה</Button>
          <Button onClick={handleLock} variant="outline" size="sm" className="gap-1"><LogOut className="h-4 w-4" />נעל</Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Lock className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>אין סיסמאות שמורות. הוסיפי סיסמה ראשונה.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="border rounded-lg p-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{row.service_name}</div>
                    {row.show && row.decrypted ? (
                      <div className="mt-2 space-y-1 text-sm" dir="ltr">
                        {row.decrypted.username && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-20 shrink-0">משתמש:</span>
                            <code className="bg-muted px-2 py-0.5 rounded flex-1 break-all">{row.decrypted.username}</code>
                            <Button variant="ghost" size="sm" onClick={() => copy(row.decrypted!.username)}><Copy className="h-3 w-3" /></Button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-20 shrink-0">סיסמה:</span>
                          <code className="bg-muted px-2 py-0.5 rounded flex-1 break-all">{row.decrypted.password}</code>
                          <Button variant="ghost" size="sm" onClick={() => copy(row.decrypted!.password)}><Copy className="h-3 w-3" /></Button>
                        </div>
                        {row.decrypted.notes && (
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground text-xs w-20 shrink-0">הערות:</span>
                            <div className="bg-muted px-2 py-0.5 rounded flex-1 whitespace-pre-wrap text-right" dir="rtl">{row.decrypted.notes}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mt-1">••••••••••</div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => toggleShow(row)} title={row.show ? 'הסתר' : 'הצג'}>
                      {row.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">{editing ? 'עריכת סיסמה' : 'הוספת סיסמה'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>שם השירות *</Label>
              <Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="לדוגמה: בנק הפועלים" />
            </div>
            <div className="space-y-1.5">
              <Label>שם משתמש</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>סיסמה *</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>הערות</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
