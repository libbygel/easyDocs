import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, ArrowLeft, Zap, ChevronDown, Play,
  Mail, PenTool, Activity, Archive, BarChart3,
  CheckCircle2, Star, Shield, Link2, Send, Bell, Inbox,
  Calculator, Briefcase, Home, Users, FileText, Clock,
} from "lucide-react";

const testimonials = [
  { name: "אורי כ.", role: "יועץ מס", text: "סוף סוף כל המסמכים מגיעים למקום אחד מסודר – בלי לחפש בוואטסאפ ובמיילים." },
  { name: "מיכל ד.", role: "יועצת מס", text: "הפסקתי לרדוף אחרי לקוחות. התזכורות עושות את העבודה במקומי." },
  { name: "יוסי ש.", role: "יועץ מס בכיר", text: "כל תיק נסגר מסודר מהרגע הראשון. אני יודע בדיוק מה התקבל ומה חסר." },
];

const howItWorks = [
  { icon: FolderOpen, title: "יוצרים תיק ללקוח", desc: "בוחרים את סוג התיק והמסמכים הדרושים." },
  { icon: Link2, title: "הלקוח מקבל לינק אישי", desc: "הלקוח מקבל לינק אישי ופשוט לשליחת המסמכים." },
  { icon: Bell, title: "המערכת מתזכרת אוטומטית", desc: "מייל אוטומטי על כל מה שחסר, עד שמסיים." },
  { icon: Inbox, title: "כל המסמכים מסודרים בתיק", desc: "מסודר, מלא, וניתן לשליחה לכל גורם בלחיצת כפתור" },
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
            <div className="flex flex-col items-center">
              <div className="flex flex-col items-center">
                <Button size="sm" onClick={() => navigate("/login")} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  לנסות את המערכת
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6 text-xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight" style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4rem)' }}>
            תפסיקו לרדוף
            <br />
            <span className="text-primary">אחרי מסמכים.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed whitespace-pre-line text-slate-800 sm:text-3xl">
            <strong className="text-foreground">EasyDocs</strong> אוספת, מתזכרת ומסדרת את כל המסמכים בשבילך — אוטומטית.{"\n\n\nבלי מיילים אינסופיים.\nבלי מעקב ידני אחרי כל לקוח.\nבלי לנסות לזכור מה עדיין חסר."}
          </p>
          <div className="pt-6 max-w-xl mx-auto flex flex-col gap-3 items-center">
            {[
              "\n",
            ].map((line, i) => (
              <p
                key={i}
                className="text-xl sm:text-2xl font-bold tracking-wide leading-snug text-foreground"
              >
                <span className="text-accent text-2xl sm:text-3xl font-black ml-1 text-2xl">
                  {line.split(" ")[0]}
                </span>
                {line.substring(line.indexOf(" "))}
              </p>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <div className="flex flex-col items-center">
              <div className="flex flex-col items-center">
                <Button size="lg" onClick={() => navigate("/login")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-10 h-14 gap-2 shadow-lg shadow-primary/30 animate-pulse hover:animate-none font-bold">
                  לראות איך EasyDocs חוסכת לך שעות כל שבוע
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-base px-8 h-12 gap-2">
              איך זה עובד?
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── PAIN SECTION ─── */}
      <section className="py-16 px-4 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">למה יועצי מס עוברים ל-EasyDocs?</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto text-lg">
            ככה נראה היום תהליך איסוף המסמכים אצל רוב היועצים — מייל, טלפון, והרבה הלוך ושוב.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              "שולחת מייל ואז מעקב אחרי כל לקוח בנפרד מה שלח ומה חסר",
              "אי אפשר לזכור איפה כל לקוח אוחז וכמה תיקים נשארו להגיש ועד מתי",
              "לקוחות שוכחים לשלוח, וצריך לתזכר אותם בזמן — שוב ושוב, ידנית",
              "מסמכים מגיעים חסרים או לא ברורים, וכל פנייה דורשת מייל וטלפון נוספים",
            ].map((pain, i) => (
              <div key={i} className="flex items-start gap-3 bg-destructive/5 rounded-xl p-4">
                <span className="text-destructive text-xl mt-0.5">✕</span>
                <p className="text-foreground text-base">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── KEY HIGHLIGHTS ─── */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-primary/10 via-accent/5 to-background border-y border-primary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-4 py-1.5 text-sm font-bold shadow-lg">
              <Zap className="h-4 w-4" />
              הפתרון
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              לא עוד כלי איסוף.<br />
              <span className="text-primary">מערכת שעובדת בשבילך.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              אוטומציה מלאה מהרגע שהלקוח מקבל את הלינק ועד שהתיק מוכן להגשה.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: FolderOpen,
                title: "פורטל לקוח – לינק אחד",
                desc: "הלקוח מעלה את כל המסמכים דרך לינק אחד מסודר — בלי וואטסאפ ובלי בלאגן.\nבכל רגע אפשר לראות מה התקבל, מה חסר ומה סטטוס התיק.\n",
                color: "bg-primary",
              },
              {
                icon: Mail,
                title: "תזכורות אוטומטיות",
                desc: "המערכת מתזכרת אוטומטית את הלקוחות על כל מסמך שחסר",
                color: "bg-rose-500",
              },
              {
                icon: PenTool,
                title: "חתימה דיגיטלית מובנית",
                desc: "דף חתימה מצורף אוטומטית. הלקוח חותם אונליין מהפורטל.",
                color: "bg-purple-500",
              },
              {
                icon: Activity,
                title: "שליחה לכל גורם מקצועי חיצוני",
                desc: "שליחה לכל גורם מקצועי חיצוני\n\nכל המסמכים מסודרים בתיק — מוכנים להגשה או לשליחה בלחיצת כפתור.",
                color: "bg-amber-500",
              },
              {
                icon: BarChart3,
                title: "דשבורד מעקב",
                desc: "תמונת מצב מלאה של כל התיקים והלקוחות במסך אחד.",
                color: "bg-emerald-500",
              },
              {
                icon: Archive,
                title: "ניהול תיקים חכם",
                desc: "כל המידע של הלקוח במקום אחד — משימות, חיובים, מסמכים, סיכומי שיחה והיסטוריית פעילות מלאה.",
                color: "bg-indigo-500",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="group relative bg-card rounded-2xl p-6 border-2 border-border hover:border-primary/40 hover:shadow-xl transition-all flex gap-4"
              >
                <div className={`shrink-0 w-14 h-14 ${feat.color} text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                  <feat.icon className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-foreground">{feat.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-10">איך זה עובד?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {howItWorks.map((step, i) => (
              <div key={i} className="relative bg-card rounded-2xl p-6 border border-border space-y-3">
                <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shadow-md">
                  {i + 1}
                </div>
                <step.icon className="h-8 w-8 text-primary" />
                <h3 className="font-bold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BEFORE / AFTER ─── */}
      <section className="py-20 px-4 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">לפני ואחרי EasyDocs</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-4">
              <h3 className="font-bold text-lg text-destructive">בלי EasyDocs</h3>
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
              <h3 className="font-bold text-lg text-success">עם EasyDocs</h3>
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

      {/* ─── VIDEO DEMO ─── */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold">רוצה לראות איך זה עובד?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            סרטון קצר שמראה את כל התהליך – מיצירת תבנית ועד העברת התיק המוכן.
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
                <span className="text-xl font-bold text-foreground">צפה בהדגמה</span>
              </div>
            </button>
          ) : (
            <div className="mx-auto w-full aspect-video rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl">
              <video
                src="/easydocs-guide-v3.mp4"
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          )}
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

      {/* ─── WHO IT'S FOR ─── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold">למי זה מתאים?</h2>
            <p className="text-lg text-muted-foreground whitespace-pre-line">
              לכל מי שאוסף מסמכים מלקוחות באופן קבוע — ורוצה לעשות את זה אחרת.
              {"\n"}אם אתם עובדים עם מסמכים מלקוחות — זה בשבילכם.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: Calculator, label: "יועצי מס" },
              { icon: BarChart3, label: "משרדי הנהלת חשבונות" },
              { icon: FileText, label: "משרדי החזרי מס" },
              { icon: Home, label: "יועצי משכנתאות" },
              { icon: Briefcase, label: "רואי חשבון" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-center text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Shield className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">אבטחה ברמה הגבוהה ביותר</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            כל המסמכים נשמרים בענן מאובטח עם גישה מוגבלת ליועץ וללקוח בלבד.
            הפרדת לקוחות מלאה, הצפנה וגיבוי ענן אוטומטי — שקט נפשי בכל שלב.
          </p>
        </div>
      </section>

      {/* ─── WHY NOW ─── */}
      <section className="py-16 px-4 bg-gradient-to-b from-accent/10 to-background border-y border-accent/20">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-accent/15 text-accent-foreground rounded-full px-4 py-1.5 text-sm font-bold">
            <Clock className="h-4 w-4" />
            למה עכשיו?
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
            במקום להתחיל עוד עונת דוחות עם אקסלים, וואטסאפ ותזכורות ידניות —
            <br />
            <span className="text-primary">אפשר לעבוד מסודר כבר מהלקוח הבא.</span>
          </h2>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-4 text-center bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">פחות מעקבים. פחות בלאגן. יותר שליטה.</h2>
          <p className="text-lg text-muted-foreground">
            לתת ללקוחות דרך אחת ברורה לשלוח הכול –<br />
            ולך מערכת אחת שאפשר לסמוך עליה.
          </p>
          <div className="flex flex-col items-center">
            <Button size="lg" onClick={() => navigate("/login")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-12 h-16 gap-3 shadow-xl shadow-primary/30 font-bold">
              לראות איך EasyDocs חוסכת לך שעות כל שבוע
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground mt-3 font-medium text-primary italic">
            </span>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border py-8 px-4 bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} EasyDocs. כל הזכויות שמורות.</span>
          <div className="flex gap-4">
            <button onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">לנסות את המערכת</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
