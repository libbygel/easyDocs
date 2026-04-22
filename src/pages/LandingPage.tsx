import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileText, Send, Bell, PenTool, Users, FolderOpen,
  CheckCircle2, ArrowLeft, Shield, Zap, Clock, Star,
  ChevronDown, Smartphone, LayoutDashboard, Play, Inbox, Eye
} from "lucide-react";

const features = [
  {
    icon: FolderOpen,
    title: "פורטל לקוח פשוט",
    desc: "הלקוח מעלה את כל המסמכים דרך לינק אחד – בלי וואטסאפ, בלי מיילים מפוזרים, בלי בלבול.",
    highlight: true,
  },
  {
    icon: Bell,
    title: "תזכורות אוטומטיות",
    desc: "אם חסר מסמך – המערכת שולחת תזכורת ללקוח במקומך, עד שכל האיסוף נסגר.",
    highlight: true,
  },
  {
    icon: Inbox,
    title: "כל המסמכים במקום אחד",
    desc: "אין יותר חיפוש בוואטסאפ ובמייל – כל תיק מסודר לפי לקוח, עם כל הקבצים שלו.",
    highlight: false,
  },
  {
    icon: Eye,
    title: "שליטה במה התקבל ומה חסר",
    desc: "תמונה ברורה בזמן אמת – מה נכנס, ממי, ומה עדיין לא נשלח. אפס ניחושים.",
    highlight: true,
  },
  {
    icon: FileText,
    title: "תבניות מס מוכנות",
    desc: "שכיר, עצמאי, החזר מס, הצהרת הון – רשימת המסמכים נטענת מוכנה לכל תיק חדש.",
    highlight: false,
  },
  {
    icon: Send,
    title: "העברה מסודרת הלאה",
    desc: "כשהאיסוף נסגר – שלח את כל המסמכים לרואה החשבון או לכל גורם מקצועי בקליק אחד.",
    highlight: false,
  },
];

const steps = [
  { num: "1", title: "צור תיק ובחר תבנית", desc: "רשימת המסמכים נטענת אוטומטית לפי סוג התיק" },
  { num: "2", title: "שלח לינק אחד ללקוח", desc: "הלקוח מעלה את כל המסמכים ישירות לתיק שלו" },
  { num: "3", title: "סגור את האיסוף בשליטה", desc: "רואה הכל במקום אחד – מה התקבל ומה עדיין חסר" },
];

const testimonials = [
  { name: "אורי כ.", role: "יועץ מס", text: "סוף סוף כל המסמכים מגיעים למקום אחד מסודר – בלי לחפש בוואטסאפ ובמיילים." },
  { name: "מיכל ד.", role: "יועצת מס", text: "הפסקתי לרדוף אחרי לקוחות. התזכורות עושות את העבודה במקומי." },
  { name: "יוסי ש.", role: "יועץ מס בכיר", text: "כל תיק נסגר מסודר מהרגע הראשון. אני יודע בדיוק מה התקבל ומה חסר." },
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
            ליועצי מס בישראל
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            תפסיק לרדוף אחרי מסמכים.
            <br />
            <span className="text-primary">תסגור את האיסוף בצורה מסודרת.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            EasyDocs מרכז את כל תהליך איסוף המסמכים מול הלקוח במקום אחד –
            בלי וואטסאפ, בלי בלאגן, ובלי חוסרים שנופלים בין הכיסאות.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" onClick={() => navigate("/signup")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-10 h-14 gap-2 shadow-lg shadow-primary/30 animate-pulse hover:animate-none font-bold">
              🚀 התחל לאסוף מסמכים בצורה מסודרת
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">אם אתה יועץ מס – זה בטוח מוכר לך</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            האיסוף לא באמת מנוהל – הוא פשוט "קורה" איפשהו בין וואטסאפ, מייל ושיחות.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              "לקוחות שולחים מסמכים בוואטסאפ ואתה לא מוצא אותם אחר כך",
              "חלק מהמסמכים מגיעים באיחור ואתה רודף אחריהם ידנית",
              "אין לך תמונה ברורה מה התקבל ומה עדיין חסר",
              "כל תיק מרגיש מפוזר בין כמה מקומות בלי סדר אמיתי",
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
            <h2 className="text-2xl sm:text-3xl font-bold">EasyDocs מרכז את כל איסוף המסמכים במקום אחד</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              כל לקוח מקבל לינק אחד פשוט ומעלה את כל המסמכים ישירות למערכת שלך – מסודר וברור.
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
                  "מסמכים מפוזרים בין וואטסאפ, מייל ושיחות",
                  "רדיפה ידנית אחרי כל לקוח לקראת הגשה",
                  "חוסר סדר בתיקיות ובקבצים שמגיעים",
                  "חוסר ודאות מה התקבל ומה עוד חסר",
                  "תהליך איסוף שפשוט 'קורה', בלי שליטה",
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
                  "כל המסמכים נכנסים למקום אחד מסודר",
                  "הלקוח יודע בדיוק מה לשלוח ומתי",
                  "אין רדיפה – יש תהליך עם תזכורות אוטומטיות",
                  "כל תיק מסודר מהרגע הראשון, לפי לקוח",
                  "שליטה מלאה על מה התקבל ומה עוד חסר",
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
          <h2 className="text-2xl font-bold">אבטחה מלאה</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            כל המידע נשמר בצורה מאובטחת. גישה רק ללקוח וליועץ המס.
            שליטה מלאה על כל מסמך, בכל שלב.
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
          <h2 className="text-3xl sm:text-4xl font-bold">תעשה סדר באיסוף המסמכים שלך</h2>
          <p className="text-lg text-muted-foreground">
            תן ללקוחות דרך אחת ברורה לשלוח הכל –<br />
            ולך מקום אחד מסודר לקבל את הכל.
          </p>
          <Button size="lg" onClick={() => navigate("/signup")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-12 h-16 gap-3 shadow-xl shadow-primary/30 font-bold">
            🚀 התחל בחינם עכשיו
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
