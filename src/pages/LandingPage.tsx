import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileText, Send, Bell, PenTool, Users, FolderOpen,
  CheckCircle2, ArrowLeft, Shield, Zap, Clock, Star,
  ChevronDown, Smartphone, LayoutDashboard, Play, Gauge, AlertTriangle
} from "lucide-react";

const features = [
  {
    icon: Gauge,
    title: "ציון מוכנות לכל תיק",
    desc: "תוך שניות תדע אם התיק Ready לעבודה או Not Ready – ומה בדיוק חסר כדי להתחיל.",
    highlight: true,
  },
  {
    icon: AlertTriangle,
    title: "זיהוי מסמכים קריטיים",
    desc: "המערכת מדגישה אוטומטית מה חוסם אותך עכשיו ומה חייב להיות לפני שמתחילים בדוח.",
    highlight: true,
  },
  {
    icon: Bell,
    title: "תזכורות חכמות ללקוחות",
    desc: "לא רדיפה ולא לחץ – רק עדכון אוטומטי ללקוח עד שהתיק מושלם.",
    highlight: false,
  },
  {
    icon: FileText,
    title: "תבניות מס מוכנות",
    desc: "שכיר, עצמאי, החזר מס, הצהרת הון – כל סוג תיק עם רשימת מסמכים מוגדרת מראש.",
    highlight: false,
  },
  {
    icon: FolderOpen,
    title: "פורטל לקוח חכם",
    desc: "הלקוח מקבל לינק אישי, מעלה מסמכים מהנייד – בלי וואטסאפ ובלי בלאגן.",
    highlight: true,
  },
  {
    icon: LayoutDashboard,
    title: "שליטה מלאה בכל תיק",
    desc: "דאשבורד אחד שמראה מה מוכן, מה חסר, מה תקוע ומה אפשר כבר להעביר לטיפול.",
    highlight: false,
  },
];

const steps = [
  { num: "1", title: "בחר תבנית מס", desc: "שכיר, עצמאי, החזר מס – רשימת המסמכים נטענת אוטומטית" },
  { num: "2", title: "שלח לינק ללקוח", desc: "הלקוח מעלה מסמכים בעצמו, אתה מקבל התראה על כל פעולה" },
  { num: "3", title: "התחל לעבוד רק כשמוכן", desc: "ציון המוכנות מראה לך בדיוק מתי התיק Ready להגשה" },
];

const testimonials = [
  { name: "אורי כ.", role: "יועץ מס", text: "אני לא פותח תיק עד שאני רואה שהוא מוכן – וזה שינה לי את כל העבודה." },
  { name: "מיכל ד.", role: "יועצת מס", text: "סוף סוף אני יודעת מראש מה חסר, לא מגלה את זה מאוחר מדי לפני הגשת הדוח." },
  { name: "יוסי ש.", role: "יועץ מס בכיר", text: "זה הוריד לי את כל הבלאגן של הרגע האחרון לפני דוחות. עובד רגוע ומדויק." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ─── NAV ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">EasyDocs</span>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>התחברות</Button>
            <Button size="sm" onClick={() => navigate("/signup")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              הרשמה חינם
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
            <Zap className="h-4 w-4" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            תפסיק לרדוף אחרי מסמכים.
            <br />
            <span className="text-primary">תתחיל לסגור עסקאות.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            EasyDocs מחליף את הוואטסאפ, האקסלים והבלאגן במערכת אחת פשוטה ליועצי מס –
            פורטל ללקוח, חתימות דיגיטליות, תזכורות אוטומטיות והעברה מסודרת של כל התיק.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" onClick={() => navigate("/signup")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-10 h-14 gap-2 shadow-lg shadow-primary/30 animate-pulse hover:animate-none font-bold">
              🚀 הירשם עכשיו בחינם
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-base px-8 h-12 gap-2">
              מה כלול?
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 max-w-md mx-auto mt-4">
            <p className="text-sm font-medium text-primary">
              ✨ הרשמה חינמית לחלוטין – תוך 24 שעות החשבון שלך יופעל ותוכל להתחיל לעבוד!
            </p>
          </div>
        </div>
      </section>

      {/* ─── PAIN SECTION ─── */}
      <section className="py-16 px-4 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">מכיר את זה?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              "לקוחות שולחים טפסי 106 וקבלות בוואטסאפ ואתה מחפש אותם שעות",
              "מועד הגשת הדוח קרב ועדיין חסרים אישורי הכנסות מהלקוח",
              "אין לך מושג מי העלה מה ואיפה כל מסמך נמצא",
              "אתה מבלה יותר זמן ברדיפה אחרי מסמכים מאשר בעבודה המקצועית",
            ].map((pain, i) => (
              <div key={i} className="flex items-start gap-3 bg-destructive/5 rounded-xl p-4">
                <span className="text-destructive text-xl mt-0.5">✕</span>
                <p className="text-foreground">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12">איך זה עובד? 3 צעדים פשוטים</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="space-y-3">
                <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VIDEO DEMO ─── */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-card border-y border-border">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold">🎬 רוצה לראות איך זה עובד?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            סרטון קצר שמראה את כל התהליך – מיצירת תבנית ועד העברת התיק המוכן
          </p>
          {!showVideo ? (
            <button
              onClick={() => setShowVideo(true)}
              className="relative mx-auto block w-full aspect-video rounded-2xl overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 hover:border-primary/50 transition-all group cursor-pointer shadow-2xl"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="h-10 w-10 mr-[-3px]" />
                </div>
                <span className="text-xl font-bold text-foreground">▶ צפה בהדגמה</span>
              </div>
            </button>
          ) : (
            <div className="mx-auto w-full aspect-video rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl">
              <video
                src="/easydocs-guide.mp4"
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 px-4 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold">כל מה שצריך כדי לנהל מסמכים כמו מקצוען</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              EasyDocs כוללת את כל הכלים שיועץ מס צריך – במערכת אחת, בעברית, עם ממשק פשוט
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-2xl p-6 space-y-3 border transition-all hover:shadow-md ${
                  f.highlight
                    ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                    : "bg-card border-border hover:border-primary/20"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  f.highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BEFORE / AFTER ─── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">לפני ואחרי EasyDocs</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-4">
              <h3 className="font-bold text-lg text-destructive flex items-center gap-2">
                <span className="text-xl">😫</span> בלי EasyDocs
              </h3>
              <ul className="space-y-2 text-sm">
                {[
                  "מסמכים מפוזרים בוואטסאפ ובמייל",
                  "רדיפה ידנית אחרי כל לקוח לקראת הגשת הדוח",
                  "חתימות על הצהרות בנייר, פגישות מיותרות",
                  "חוסרים שמתגלים ברגע האחרון",
                  "שעות של עבודה אדמיניסטרטיבית",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success/5 p-6 space-y-4">
              <h3 className="font-bold text-lg text-success flex items-center gap-2">
                <span className="text-xl">🚀</span> עם EasyDocs
              </h3>
              <ul className="space-y-2 text-sm">
                {[
                  "כל המסמכים במקום אחד מסודר לפי תיק",
                  "תזכורות אוטומטיות ללקוחות על מסמכים חסרים",
                  "חתימות דיגיטליות על הצהרות אונליין",
                  "אחוז השלמה ברור לכל תיק לפני הגשה",
                  "יותר זמן לעבודה מקצועית, פחות אדמיניסטרציה",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 px-4 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">מה יועצי מס אומרים</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Shield className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">אבטחה מקסימלית</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            כל המסמכים מאוחסנים בענן מאובטח. גישה לפורטל רק עם תעודת זהות.
            הנתונים שלך ושל הלקוחות שלך מוגנים בסטנדרטים הגבוהים ביותר.
          </p>
        </div>
      </section>

      {/* ─── COMING SOON ─── */}
      <section className="py-16 px-4 bg-primary/5 border-y border-primary/10">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent rounded-full px-4 py-1.5 text-sm font-medium">
            <Clock className="h-4 w-4" />
            בקרוב
          </div>
          <h2 className="text-2xl font-bold">סנכרון ל-Google Drive</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            בקרוב תוכל לסנכרן את כל המסמכים שהלקוחות מעלים ישירות לתיקייה ב-Google Drive שלך –
            כך שתמיד יהיה לך גיבוי מסודר בענן.
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-4 text-center bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">מוכן להפסיק לרדוף אחרי מסמכים?</h2>
          <p className="text-lg text-muted-foreground">הצטרף עכשיו בחינם ותתחיל לעבוד חכם יותר.</p>
          <Button size="lg" onClick={() => navigate("/signup")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-12 h-16 gap-3 shadow-xl shadow-primary/30 font-bold">
            🚀 הירשם עכשיו – חינם לחלוטין!
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground">תוך 24 שעות החשבון פעיל</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border py-8 px-4 bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} EasyDocs. כל הזכויות שמורות.</span>
          <div className="flex gap-4">
            <button onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">התחברות</button>
            <button onClick={() => navigate("/signup")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">הרשמה</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
