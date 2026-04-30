import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  FolderOpen,
  Users,
  Send,
  CheckCircle2,
  Upload,
  Eye,
  ArrowDown,
  Sparkles,
  Shield,
  PenTool,
  Wallet,
  Clock,
  LayoutDashboard,
} from 'lucide-react';

const steps = [
  {
    num: '1',
    icon: Users,
    title: 'הוספת לקוחות',
    desc: 'הוסיפו את פרטי הלקוחות שלכם — שם, טלפון, אימייל ותעודת זהות. כל לקוח נשמר במערכת ומקושר לתיקים שלו.',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    num: '2',
    icon: FileText,
     title: 'יצירת תבניות',
     desc: 'הגדירו סוגי תיק (כמו "שכיר", "עצמאי", "החזר מס"). לכל סוג תיק הגדירו רשימת מסמכים נדרשים — טופס 106, אישורי הכנסות, קבלות הוצאות, צילום ת.ז וכו׳.',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    tip: 'תבנית = סוג תיק + רשימת מסמכים. כשתפתחו תיק חדש מסוג מסוים — כל המסמכים ייווצרו אוטומטית!',
  },
  {
    num: '3',
    icon: FolderOpen,
    title: 'פתיחת תיק',
    desc: 'בחרו לקוח, בחרו סוג תיק (תבנית), ותנו לתיק שם. המערכת תיצור אוטומטית את כל המסמכים הנדרשים על פי התבנית.',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    num: '4',
    icon: Send,
    title: 'שליחת לינק ללקוח',
    desc: 'שלחו ללקוח לינק לפורטל אישי באימייל. הלקוח יראה בדיוק אילו מסמכים נדרשים ממנו ויוכל להעלות אותם בקלות.',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  {
    num: '5',
    icon: Upload,
    title: 'הלקוח מעלה מסמכים',
    desc: 'הלקוח נכנס לפורטל, רואה רשימה ברורה של מסמכים, ומעלה כל מסמך בלחיצה. ניתן גם לחתום דיגיטלית על מסמכי הצהרה.',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
  {
    num: '6',
    icon: Eye,
    title: 'בדיקה ואישור',
    desc: 'קבלו התראה בזמן אמת כשלקוח מעלה מסמך. בדקו כל מסמך, אשרו אותו או דחו אותו עם הערה — והלקוח יקבל עדכון.',
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
  },
  {
    num: '7',
    icon: CheckCircle2,
     title: 'סיום והעברת התיק',
     desc: 'כשכל המסמכים אושרו — סמנו את התיק כהושלם, הורידו את כל הקבצים בלחיצה, או שלחו ישירות לרואה חשבון / גורם מקצועי.',
    color: 'from-emerald-600 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

const features = [
  {
    icon: PenTool,
    title: 'חתימה דיגיטלית',
    desc: 'לקוחות חותמים על מסמכי הצהרה ישירות מהפורטל — בלי הדפסה ובלי סריקה.',
  },
  {
    icon: Shield,
    title: 'אבטחה מלאה',
    desc: 'כל תיק מוגן בסיסמה. רק הלקוח עם הלינק והסיסמה יכול לגשת למסמכים שלו.',
  },
  {
    icon: Sparkles,
    title: 'תזכורות אוטומטיות',
    desc: 'המערכת שולחת תזכורות ללקוחות שלא השלימו את העלאת המסמכים — בלי שתצטרכו לעקוב.',
  },
  {
    icon: Wallet,
    title: 'ניהול חיובים ותשלומים',
    desc: 'רשמו חיוב לכל תיק, עקבו אחרי תשלומים שהתקבלו וצפו ביתרה לתשלום — לכל לקוח ולכל תיק בנפרד.',
  },
  {
    icon: Clock,
    title: 'מעקב זמן עבודה',
    desc: 'הפעילו טיימר ידני או אוטומטי לכל תיק. ראו כמה זמן הושקע בכל תיק וחשבו כדאיות לפי תעריף שעתי.',
  },
  {
    icon: LayoutDashboard,
    title: 'פורטל לקוח לצפייה בלבד',
    desc: 'שלחו ללקוח קישור אישי שבו הוא רואה את כל התיקים שלו, סיכום פיננסי, זמן עבודה והיסטוריית פעילות — ללא יכולת לערוך.',
  },
];

export default function HowItWorks() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-10" dir="rtl">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            איך EasyDocs עובד?
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            מדריך מהיר ל-7 השלבים שיהפכו את ניהול המסמכים שלכם לפשוט, מסודר ומקצועי
          </p>
        </div>

        {/* Steps */}
        <div className="relative space-y-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative">
                {/* Connector arrow */}
                {i < steps.length - 1 && (
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 z-10 text-muted-foreground/40">
                    <ArrowDown className="h-5 w-5" />
                  </div>
                )}
                <Card className={`${step.borderColor} border-2 overflow-hidden`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Step number + icon */}
                      <div className={`flex items-center justify-center gap-3 p-6 sm:p-8 sm:w-48 bg-gradient-to-br ${step.color} text-white shrink-0`}>
                        <span className="text-4xl font-bold opacity-80">{step.num}</span>
                        <Icon className="h-8 w-8" />
                      </div>
                      {/* Content */}
                      <div className="p-5 sm:p-6 flex-1 space-y-2">
                        <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                        {step.tip && (
                          <div className={`${step.bgColor} rounded-lg p-3 mt-3 border ${step.borderColor}`}>
                            <p className="text-sm font-medium text-foreground/80">
                              💡 <span className="font-bold">טיפ:</span> {step.tip}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Extra features */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-foreground text-center">
            ועוד יתרונות שכדאי להכיר
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="text-center">
                  <CardContent className="p-6 space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Two link types explainer */}
        <Card className="border-primary/20 border-2 bg-primary/5">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground text-center">
              שני סוגי קישורים ללקוח
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4 border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">קישור להעלאת מסמכים</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  קישור ספציפי לתיק אחד — הלקוח מעלה מסמכים, חותם דיגיטלית ושולח אליכם.
                </p>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">קישור לפורטל לקוח (צפייה בלבד)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  קישור מרכזי לכל התיקים של הלקוח — סטטוס, סיכום פיננסי, זמן עבודה והיסטוריית פעילות, ללא אפשרות עריכה.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
