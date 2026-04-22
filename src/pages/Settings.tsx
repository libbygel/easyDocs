import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Bell, Clock, Mail, Save, Loader2, Eye } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [previewMode, setPreviewMode] = useState<string>('new_tab');
  const [enableDailyReminders, setEnableDailyReminders] = useState(true);
  const [enableUrgentAlerts, setEnableUrgentAlerts] = useState(true);
  const [reminderHour, setReminderHour] = useState('18');
  const [inactivityDays, setInactivityDays] = useState('2');

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('name, email, sender_display_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfileName((data as any).name || '');
            setProfileEmail((data as any).email || '');
            setSenderDisplayName((data as any).sender_display_name || '');
          }
        });

      // Load settings from localStorage
      const saved = localStorage.getItem(`settings_${user.id}`);
      if (saved) {
        try {
          const s = JSON.parse(saved);
          setPreviewMode(s.previewMode || 'new_tab');
          setEnableDailyReminders(s.enableDailyReminders ?? true);
          setEnableUrgentAlerts(s.enableUrgentAlerts ?? true);
          setReminderHour(String(s.reminderHour ?? 18));
          setInactivityDays(String(s.inactivityDays ?? 2));
        } catch {}
      }
    }
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setLoading(true);

    try {
      localStorage.setItem(`settings_${user.id}`, JSON.stringify({
        previewMode,
        enableDailyReminders,
        enableUrgentAlerts,
        reminderHour: parseInt(reminderHour) || 18,
        inactivityDays: parseInt(inactivityDays) || 2,
      }));

      // Save profile fields to DB
      await supabase
        .from('profiles')
        .update({ sender_display_name: senderDisplayName, name: profileName, email: profileEmail } as any)
        .eq('user_id', user.id);

      toast({ title: 'ההגדרות נשמרו בהצלחה' });
    } catch {
      toast({ title: 'שגיאה בשמירת ההגדרות', variant: 'destructive' });
    }

    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">הגדרות</h1>
            <p className="text-sm text-muted-foreground">ניהול הגדרות המערכת</p>
          </div>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">פרופיל</CardTitle>
            <CardDescription>פרטי החשבון שלך</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם</Label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>אימייל</Label>
                <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} dir="ltr" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>שם השולח (מוצג במיילים)</Label>
              <Input
                value={senderDisplayName}
                onChange={(e) => setSenderDisplayName(e.target.value)}
                placeholder="לדוגמה: דניאל כהן - משכנתאות"
              />
              <p className="text-xs text-muted-foreground">
                השם הזה יופיע כשולח המייל בשליחה לבנקאי ובמיילים אחרים. אם ריק, יוצג "EasyDocs".
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Document Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5" />
              תצוגת מסמכים
            </CardTitle>
            <CardDescription>בחר כיצד להציג מסמכים בלחיצה על "צפייה"</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={previewMode} onValueChange={setPreviewMode} className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <RadioGroupItem value="new_tab" id="new_tab" />
                <Label htmlFor="new_tab" className="cursor-pointer flex-1">
                  <div className="font-medium">פתיחה בטאב חדש</div>
                  <p className="text-sm text-muted-foreground">המסמך ייפתח בלשונית חדשה בדפדפן</p>
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <RadioGroupItem value="modal" id="modal" />
                <Label htmlFor="modal" className="cursor-pointer flex-1">
                  <div className="font-medium">תצוגה בתוך העמוד</div>
                  <p className="text-sm text-muted-foreground">המסמך יוצג בחלון קטן בתוך העמוד הנוכחי</p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              הגדרות התראות
            </CardTitle>
            <CardDescription>שליטה בתזכורות ובהתראות אוטומטיות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>תזכורות יומיות אוטומטיות</Label>
                <p className="text-sm text-muted-foreground">
                  שליחת מייל אוטומטי ללקוחות עם מסמכים חסרים או שנדחו
                </p>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1 mt-1">
                  <p>📩 <strong>מתי נשלחת תזכורת?</strong></p>
                  <p>• כשיש מסמך עם <strong>תאריך יעד</strong> שמגיע <strong>בתוך יומיים</strong> (כולל היום)</p>
                  <p>• כשהלקוח <strong>לא היה פעיל</strong> בפורטל במשך מספר הימים שהגדרת למטה</p>
                  <p>• המייל כולל רשימת המסמכים החסרים/שנדחו + קישור ישיר לפורטל</p>
                </div>
              </div>
              <Switch checked={enableDailyReminders} onCheckedChange={setEnableDailyReminders} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>התראות דחופות ליועץ</Label>
                <p className="text-sm text-muted-foreground">
                  קבלת התראה במערכת כשמסמך מתקרב לתאריך היעד שלו
                </p>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1 mt-1">
                  <p>🔔 <strong>מתי מופיעה התראה?</strong></p>
                  <p>• כשמסמך חסר/נדחה עם תאריך יעד <strong>בעוד יומיים או פחות</strong></p>
                  <p>• ההתראה מופיעה בפעמון בתפריט העליון עם אפשרות לשלוח תזכורת ללקוח</p>
                </div>
              </div>
              <Switch checked={enableUrgentAlerts} onCheckedChange={setEnableUrgentAlerts} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  שעת שליחת תזכורות
                </Label>
                <Input type="number" min="0" max="23" value={reminderHour} onChange={(e) => setReminderHour(e.target.value)} dir="ltr" className="w-24" />
                <p className="text-xs text-muted-foreground">התזכורות היומיות נשלחות בשעה שתבחר (0-23)</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  ימי חוסר פעילות
                </Label>
                <Input type="number" min="1" max="14" value={inactivityDays} onChange={(e) => setInactivityDays(e.target.value)} dir="ltr" className="w-24" />
                <p className="text-xs text-muted-foreground">אם הלקוח לא נכנס לפורטל X ימים - תישלח תזכורת</p>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור הגדרות
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
