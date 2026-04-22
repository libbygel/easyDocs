import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SupabaseStatus } from '@/components/SupabaseStatus';

const AUTH_URL = "https://aegwmpkihkeaemcdgyqq.supabase.co/auth/v1";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZ3dtcGtpaGtlYWVtY2RneXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg0NzUsImV4cCI6MjA4NTA4NDQ3NX0.5sfLvSwcmzUJShwPg8NpMD3t7VrEBYrfwdNBGlFjWdM";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'שגיאת התחברות',
        description: 'אימייל או סיסמה שגויים',
        variant: 'destructive',
      });
    } else {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'הזן אימייל', description: 'יש להזין כתובת אימייל לאיפוס', variant: 'destructive' });
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
        },
        body: JSON.stringify({
          email: email.trim(),
          redirect_to: `${window.location.origin}/login`,
        }),
      });

      if (!res.ok) {
        throw new Error('Reset failed');
      }

      toast({ title: 'נשלח בהצלחה', description: 'קישור לאיפוס סיסמה נשלח לאימייל שלך' });
      setResetMode(false);
    } catch (err) {
      toast({ title: 'שגיאה', description: 'לא ניתן לשלוח אימייל איפוס. נסה שוב.', variant: 'destructive' });
    } finally {
      setResetLoading(false);
    }
  };

  if (resetMode) {
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
              <CardDescription className="mt-2">
                הזן את האימייל שלך ונשלח לך קישור לאיפוס
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">אימייל</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    שולח...
                  </>
                ) : (
                  'שלח קישור איפוס'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setResetMode(false)}
                className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <ArrowRight className="h-3 w-3" />
                חזרה להתחברות
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <CardTitle className="text-2xl font-bold">EasyDocs</CardTitle>
            <CardDescription className="mt-2">
              היכנס לחשבון שלך כדי לנהל את התיקים
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="text-left">
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                שכחת סיסמה?
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מתחבר...
                </>
              ) : (
                'התחברות'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">אין לך חשבון? </span>
            <Link to="/signup" className="text-primary hover:underline font-medium">
              הירשם עכשיו
            </Link>
          </div>
          <div className="mt-4 flex justify-center">
            <SupabaseStatus />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
