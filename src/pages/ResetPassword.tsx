import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Handle recovery token from URL hash (Supabase default flow)
    const hash = window.location.hash;
    if (hash.includes('error')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      setError(params.get('error_description') || 'הקישור לא תקין או פג תוקפו');
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // Also check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // Fallback: if no event after 2s and we have a hash with tokens, mark ready
    const t = setTimeout(() => {
      if (hash.includes('access_token') || hash.includes('type=recovery')) {
        setReady(true);
      }
    }, 1500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'סיסמה קצרה', description: 'יש להזין לפחות 6 תווים', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'הסיסמאות אינן תואמות', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'הסיסמה עודכנה', description: 'מעביר אותך למערכת...' });
    setTimeout(() => navigate('/dashboard'), 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
              <FolderOpen className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">איפוס סיסמה</CardTitle>
            <CardDescription className="mt-2">בחר סיסמה חדשה לחשבון שלך</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="space-y-4 text-center">
              <p className="text-destructive text-sm">{error}</p>
              <Button onClick={() => navigate('/login')} className="w-full">חזרה להתחברות</Button>
            </div>
          ) : !ready ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה חדשה</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">אימות סיסמה</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required dir="ltr" className="text-left" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />שומר...</> : 'עדכן סיסמה'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
