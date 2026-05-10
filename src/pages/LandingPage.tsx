import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, ArrowLeft, Zap, ChevronDown, Play,
  BellRing, Mail, ListChecks, Timer, Building2, ClipboardList, PenTool,
  CheckCircle2, Star, Shield, Archive, Activity, Users, Briefcase,
  FileSignature, BarChart3, Lock,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const steps = [
  { num: "1", title: "צור תיק ובחר תבנית", desc: "רשימת המסמכים נטענת אוטומטית לפי סוג התיק" },
  { num: "2", title: "שלח לינק אחד ללקוח", desc: "הלקוח מעלה את כל המסמכים ישירות לתיק שלו" },
  { num: "3", title: "סגור את האיסוף בשליטה", desc: "רואה הכל במקום אחד – מה התקבל ומה עדיין חסר" },
  { num: "4", title: "כל המסמכים בתיקייה מסודרת של הלקוח", desc: "כל קובץ נשמר אוטומטית בתיקייה ייעודית לכל לקוח – מסודר, נגיש וזמין בכל רגע" },
  { num: "5", title: "שלח להגשה בלחיצה אחת", desc: "כל המסמכים מוכנים לשליחה לביטוח לאומי, רשויות המס או כל גורם אחר – ישירות מהמערכת" },
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
            <Button size="sm" onClick={() => navigate("/get-offer")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              קבל הצעה משתלמת
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            גם אצלך איסוף המסמכים זה
            <br />
            <span className="text-primary">הלוך ושוב אינסופי במייל?</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            שליחת מייל ללקוחות, ואז מעקב —
            <br />
            מי שלח, מה חסר, ועד מתי צריך להגיש. 
            <br />
            <strong className="text-foreground">EasyDocs</strong> עושה את זה בשבילך.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-accent/10 text-foreground rounded-full px-5 py-2 text-sm sm:text-base font-medium border border-accent/20">
            <span>🔔 תזכורות אוטומטיות</span>
            <span className="text-muted-foreground">•</span>
            <span>📁 המסמכים נאספים לבד ומוכנים בזמן</span>
          </div>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            בלי לזכור איפה כל לקוח אוחז. בלי לתזכר ידנית. בלי הפתעות לפני הגשה.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" onClick={() => navigate("/get-offer")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-10 h-14 gap-2 shadow-lg shadow-primary/30 animate-pulse hover:animate-none font-bold">
              💎 קבל הצעה מותאמת למשרד שלך
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-base px-8 h-12 gap-2">
              מה כלול?
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── PAIN SECTION ─── */}
      <section className="py-16 px-4 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">אם את/ה יועץ מס – זה בטוח מוכר לך</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto text-xl">
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
      <section id="features" className="py-20 px-4 bg-gradient-to-b from-primary/10 via-accent/5 to-background border-y border-primary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-4 py-1.5 text-sm font-bold shadow-lg">
              <Zap className="h-4 w-4" />
              הפיצ'רים שמשנים את כל המשחק
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">
              לא עוד כלי איסוף.<br />
              <span className="text-primary">מערכת שעובדת בשבילך.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              אוטומציה מלאה מהרגע שהלקוח מקבל את הלינק ועד שהתיק מוכן להגשה.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: FolderOpen,
                title: "פורטל לקוח – לינק אחד",
                desc: "הלקוח מעלה הכל מלינק יחיד. בלי וואטסאפ, בלי בלאגן.",
                color: "bg-primary",
              },
              {
                icon: Mail,
                title: "תזכורות אוטומטיות ללקוחות",
                desc: "המערכת רודפת אחרי הלקוח במקומך – מייל אוטומטי על כל מה שחסר.",
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
                title: "סטטוס תיק חכם",
                desc: "תמיד יודע איפה כל תיק עומד – מה התקבל, מה נבדק ומה מוכן להגשה.",
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
                title: "הורדת כל התיק ב־ZIP",
                desc: "כל המסמכים של התיק בקובץ אחד מסודר – מוכן לשליחה לכל גורם.",
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
                  <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={() => navigate("/get-offer")}
              className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-10 h-14 gap-2 shadow-xl shadow-primary/30 font-bold"
            >
              💎 קבל הצעה מותאמת למשרד שלך
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── ALL CAPABILITIES ACCORDION ─── */}
      <section className="py-20 px-4 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold">כל מה שהמערכת כוללת</h2>
            <p className="text-lg text-muted-foreground">מערכת מלאה שמלווה אותך מהלקוח הראשון ועד ההגשה הסופית.</p>
          </div>
          <Accordion type="multiple" className="space-y-3">
            {[
              {
                icon: Users, title: "ניהול לקוחות",
                items: ["כרטיס לקוח עם כל הפרטים והקשר", "ייבוא/ייצוא מאקסל", "סיכומי שיחות והערות אישיות", "אזור אישי ללקוח לצפייה בכל התיקים"],
              },
              {
                icon: ClipboardList, title: "ניהול תיקים",
                items: ["תבניות מס מוכנות (שכיר, עצמאי, החזר מס, הצהרת הון)", "פתיחת תיקים מרובים בלחיצה", "סטטוס חכם לכל תיק", "יומן פעילות מלא לכל תיק"],
              },
              {
                icon: FolderOpen, title: "פורטל לקוח",
                items: ["לינק אחד להעלאת כל המסמכים", "גישה מאובטחת עם זיהוי", "סרגל התקדמות אישי", "הודעה אישית מהיועץ"],
              },
              {
                icon: FileSignature, title: "חתימות דיגיטליות",
                items: ["דף חתימה אוטומטי", "חתימה מהמובייל", "PDF מוכן עם החתימה משולבת", "תבניות חתימה לשימוש חוזר"],
              },
              {
                icon: BellRing, title: "אוטומציות והתראות",
                items: ["תזכורות אוטומטיות ללקוחות", "התראות בזמן אמת על כל פעולה", "מיילים אוטומטיים על מסמכים נדחים", "התראות דד-ליין דחוף"],
              },
              {
                icon: Timer, title: "משימות וזמנים",
                items: ["משימות אישיות ולכל תיק", "טיימר לכל תיק", "דוחות שעות חודשיים", "חיובים חוזרים ללקוח"],
              },
              {
                icon: BarChart3, title: "דוחות וייצוא",
                items: ["דשבורד עם מדדים מרכזיים", "ייצוא לאקסל ו-PDF (תמיכת RTL)", "הורדת תיק שלם ב-ZIP", "שליחה לבנקאי / רו\"ח / כל גורם חיצוני"],
              },
              {
                icon: Lock, title: "אבטחה והרשאות",
                items: ["בידוד מלא של נתוני כל יועץ", "הצפנת מידע ואחסון מאובטח", "אימות זהות לכניסה לפורטל", "שליטה מלאה על מי רואה מה"],
              },
            ].map((cat, i) => (
              <AccordionItem
                key={cat.title}
                value={`item-${i}`}
                className="bg-background rounded-xl border-2 border-border px-5 data-[state=open]:border-primary/40 data-[state=open]:shadow-md transition-all"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-base text-foreground">{cat.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pr-13">
                  <ul className="space-y-2 pr-13">
                    {cat.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
                src="/easydocs-guide-v3.mp4"
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12">איך זה עובד?&nbsp;</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
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

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-4 text-center bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">הגיע הזמן לעשות סדר באיסוף המסמכים</h2>
          <p className="text-lg text-muted-foreground">
            לתת ללקוחות דרך אחת ברורה לשלוח הכול –<br />
            ולך מערכת אחת שאפשר לסמוך עליה.
          </p>
          <Button size="lg" onClick={() => navigate("/get-offer")} className="bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg px-12 h-16 gap-3 shadow-xl shadow-primary/30 font-bold">
            💎 קבל הצעה משתלמת מותאמת למשרד שלך
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border py-8 px-4 bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} EasyDocs. כל הזכויות שמורות.</span>
          <div className="flex gap-4">
            <button onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">התחברות</button>
            <button onClick={() => navigate("/get-offer")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">קבל הצעה</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
