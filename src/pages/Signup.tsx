import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FolderOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const createUiAttemptId = () => `signup-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const activeSubmitRef = useRef<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isSubmitting = loading || activeSubmitRef.current !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || activeSubmitRef.current) {
      return;
    }

    const attemptId = createUiAttemptId();
    activeSubmitRef.current = attemptId;
    setLoading(true);
    setSubmitError(null);
    setPendingMessage(null);

    const normalizedEmail = email.trim();

    try {
      const { error, pendingApproval, message } = await signUp(normalizedEmail, password, name);

      if (error) {
        const code = (error as unknown as { code?: string })?.code;
        const msg = error.message?.toLowerCase() ?? '';
        let friendlyMessage: string;

        if (msg.includes('שגיאת רשת') || msg.includes('failed to fetch')) {
          friendlyMessage = 'שגיאת רשת. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
        } else if (msg.includes('כבר נשלחת') || msg.includes('already in flight')) {
          friendlyMessage = 'בקשת הרשמה כבר נשלחת. אנא המתן לסיום הבקשה הנוכחית.';
        } else if (code === 'email_address_invalid') {
          friendlyMessage = 'האימייל נדחה ע"י שרת האימות. נסה אימייל אחר.';
        } else if (msg.includes('rate limit') || code === 'over_email_send_rate_limit' || String(code) === '429') {
          friendlyMessage = 'נשלחו יותר מדי בקשות הרשמה. אנא המתן כמה דקות ונסה שוב.';
        } else if (msg.includes('already registered') || msg.includes('already been registered')) {
          friendlyMessage = 'כתובת האימייל כבר רשומה במערכת. נסה להתחבר או השתמש באימייל אחר.';
        } else {
          friendlyMessage = 'אירעה שגיאה בהרשמה. אנא נסה שוב מאוחר יותר.';
        }

        setSubmitError(friendlyMessage);
        toast({ title: 'שגיאת הרשמה', description: friendlyMessage, variant: 'destructive' });
        return;
      }

      if (pendingApproval) {
        const msg = message ?? 'ההרשמה נקלטה. החשבון ממתין לאישור מנהל המערכת לפני כניסה למערכת.';
        setPendingMessage(msg);
        setPassword('');
        return;
      }

      toast({ title: 'נרשמת בהצלחה!', description: 'ברוך הבא למערכת' });
      navigate('/cases');
    } finally {
      activeSubmitRef.current = null;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Success/Pending Dialog */}
      <Dialog open={!!pendingMessage} onOpenChange={(open) => { if (!open) setPendingMessage(null); }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg mx-auto">
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent-foreground bg-clip-text">
              בקשת ההרשמה נקלטה בהצלחה! 🎉
            </DialogTitle>
            <DialogDescription className="text-base text-foreground leading-relaxed">
              {pendingMessage}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => { setPendingMessage(null); navigate('/login'); }} className="w-full mt-2">
            חזרה לדף ההתחברות
          </Button>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
              <FolderOpen className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">הרשמה למערכת</CardTitle>
            <CardDescription className="mt-2">צור חשבון חדש כדי להתחיל לנהל את התיקים שלך</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {submitError && (
            <div role="alert" className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
            <div className="space-y-2">
              <Label htmlFor="name">שם מלא</Label>
              <Input id="name" type="text" placeholder="ישראל ישראלי" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="text-left" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} dir="ltr" className="text-left" disabled={isSubmitting} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" />נרשם...</>) : 'הרשמה'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">כבר יש לך חשבון? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">התחבר</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
