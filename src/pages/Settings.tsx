import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchCurrentAdvisorProfile, updateCurrentAdvisorProfile } from '@/lib/advisorProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Bell, Clock, Mail, Save, Loader2, Eye, DollarSign, Timer, Play } from 'lucide-react';
import { CategoriesManager } from '@/components/settings/CategoriesManager';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [timerMode, setTimerMode] = useState<'manual' | 'auto'>('manual');
  const [previewMode, setPreviewMode] = useState<string>('new_tab');
  const [enableDailyReminders, setEnableDailyReminders] = useState(true);
  const [enableUrgentAlerts, setEnableUrgentAlerts] = useState(true);
  const [notifyOnClientUpload, setNotifyOnClientUpload] = useState(true);
  const [reminderHour, setReminderHour] = useState('18');
  const [inactivityDays, setInactivityDays] = useState('2');

  useEffect(() => {
    if (user) {
      fetchCurrentAdvisorProfile(user)
        .then((profile) => {
          setProfileName(profile.name || '');
          setProfileEmail(profile.email || user.email || '');
          setSenderDisplayName(profile.senderDisplayName || '');
          setHourlyRate(profile.hourlyRate != null ? String(profile.hourlyRate) : '');
          setTimerMode(profile.timerMode);
          setNotifyOnClientUpload(profile.notifyOnClientUpload !== false);
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

      const parsedRate = hourlyRate.trim() === '' ? null : parseFloat(hourlyRate);
      await updateCurrentAdvisorProfile(user, {
        senderDisplayName,
        name: profileName,
        email: profileEmail,
        hourlyRate: parsedRate != null && !isNaN(parsedRate) ? parsedRate : null,
        timerMode,
        notifyOnClientUpload,
      });

      toast({ title: 'ההגדרות נשמרו בהצלחה' });
    } catch {
      toast({ title: 'שגיאה בשמירת ההגדרות', variant: 'destructive' });
    }

    setLoading(false);
  };

  const [runningCharges, setRunningCharges] = useState(false);

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
              <Label>שם השולח במיילים</Label>
              <Input
                value={senderDisplayName}
                onChange={(e) => setSenderDisplayName(e.target.value)}
                placeholder="לדוגמה: דניאל כהן - יועץ מס"
              />
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1">
                <p>📧 <strong>איך זה מוצג ללקוח?</strong></p>
                <p>השם הזה יופיע כשולח בכל המיילים שנשלחים מהמערכת:</p>
                <p>• תזכורות ללקוח על מסמכים חסרים</p>
                <p>• קישורי פורטל ללקוח</p>
                <p>• תזכורות יומיות על מסמכים שנדחו</p>
                <p>• שליחת מסמכים לרואה חשבון/בנקאי</p>
                <p className="pt-1">תשובות הלקוח יחזרו ישירות לכתובת המייל שלך. אם השדה ריק, יוצג "EasyDocs".</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Categories */}
        <CategoriesManager />

        {/* Billing & Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              חיובים וטיימר
            </CardTitle>
            <CardDescription>הגדרות לחישוב כדאיות וזמני עבודה על תיקים</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                תעריף שעה (₪)
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="לדוגמה: 250"
                dir="ltr"
                className="w-40"
              />
              <p className="text-xs text-muted-foreground">
                המערכת תחשב כדאיות לפי: סך חיובים − (שעות עבודה × תעריף שעה). השאר ריק כדי להציג רק נתונים יבשים ללא חישוב כדאיות.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                מצב טיימר ברירת מחדל
              </Label>
              <RadioGroup
                value={timerMode}
                onValueChange={(v) => setTimerMode(v === 'auto' ? 'auto' : 'manual')}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="manual" id="timer_manual" />
                  <Label htmlFor="timer_manual" className="cursor-pointer flex-1">
                    <div className="font-medium">ידני (Start/Stop)</div>
                    <p className="text-sm text-muted-foreground">תפעיל ותעצור את הטיימר באופן ידני בתוך התיק</p>
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="auto" id="timer_auto" />
                  <Label htmlFor="timer_auto" className="cursor-pointer flex-1">
                    <div className="font-medium">אוטומטי (לפי נוכחות בתיק)</div>
                    <p className="text-sm text-muted-foreground">הטיימר יתחיל אוטומטית בכניסה לתיק ויעצור ביציאה</p>
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">בכל תיק תוכלי גם להזין שעות באופן ידני בדיעבד.</p>
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
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>התראת מייל על העלאת מסמך מהלקוח</Label>
                <p className="text-sm text-muted-foreground">
                  קבלת מייל מיידי לכתובת שלך בכל פעם שלקוח מעלה או שולח מסמך מהפורטל
                </p>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1 mt-1">
                  <p>📨 <strong>מתי נשלח מייל?</strong></p>
                  <p>• בכל העלאת מסמך בודד מהלקוח דרך הפורטל</p>
                  <p>• כשהלקוח לוחץ על "שלח מסמכים ליועץ" ושולח את כל החדשים</p>
                  <p>• ההתראה במערכת (פעמון) תמשיך לעבוד גם אם תכבה את ההתראה במייל</p>
                </div>
              </div>
              <Switch checked={notifyOnClientUpload} onCheckedChange={setNotifyOnClientUpload} />
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

        {/* Recurring Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              חיובים חודשיים
            </CardTitle>
            <CardDescription>הרצה ידנית של חיובים חודשיים עבור כל הלקוחות הפעילים</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              המערכת מריצה חיובים חודשיים אוטומטית לפי יום החיוב שהוגדר לכל לקוח.
              לחץ כאן להרצה ידנית מיידית עבור כל הלקוחות שיום החיוב שלהם הגיע.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              disabled={runningCharges}
              onClick={async () => {
                setRunningCharges(true);
                try {
                  const { data, error } = await supabase.functions.invoke('run-recurring-charges', { body: {} });
                  if (error) throw error;
                  const created = (data as any)?.created ?? 0;
                  toast({ title: created > 0 ? `נוצרו ${created} חיובים חודשיים` : 'אין חיובים שדורשים יצירה כעת' });
                } catch (err: any) {
                  toast({ title: 'שגיאה בהרצת חיובים', description: err?.message, variant: 'destructive' });
                } finally {
                  setRunningCharges(false);
                }
              }}
            >
              {runningCharges ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              הרץ חיובים חודשיים עכשיו
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
