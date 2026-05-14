import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function GetOffer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    officeSize: "",
    notes: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast({ title: "חסרים פרטים", description: "נא למלא שם, טלפון ומייל", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast({ title: "מייל לא תקין", description: "נא להזין כתובת מייל תקינה", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-inquiry", {
        body: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          officeSize: form.officeSize.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "הפנייה נשלחה!", description: "נחזור אליך בהקדם 💎" });
    } catch (err: any) {
      console.error("Error submitting inquiry:", err);
      toast({
        title: "שגיאה בשליחה",
        description: "אירעה שגיאה. נסה שוב או פנה אלינו בטלפון.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background" dir="rtl">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/landing")} className="text-xl font-bold text-primary">
            EasyDocs
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/landing")} className="gap-1">
            חזרה
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">הפנייה התקבלה!</h2>
                <p className="text-muted-foreground">
                  קיבלנו את הפרטים שלך ונחזור אליך בהקדם עם הצעה מותאמת.
                  <br />
                  תודה שבחרת ב-EasyDocs 💎
                </p>
                <Button onClick={() => navigate("/landing")} variant="outline" className="mt-4">
                  חזרה לדף הבית
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-2xl font-bold mb-1">פרטי יצירת קשר</h2>
                <p className="text-sm text-muted-foreground mb-4">השדות המסומנים בכוכבית הם חובה</p>

                <div className="space-y-2">
                  <Label htmlFor="name">שם מלא <span className="text-destructive">*</span></Label>
                  <Input id="name" value={form.name} onChange={update("name")} placeholder="ישראל ישראלי" required maxLength={200} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון <span className="text-destructive">*</span></Label>
                    <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} placeholder="050-1234567" required maxLength={50} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">מייל <span className="text-destructive">*</span></Label>
                    <Input id="email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required maxLength={255} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officeSize">גודל משרד / כמות לקוחות (לא חובה)</Label>
                  <Input id="officeSize" value={form.officeSize} onChange={update("officeSize")} placeholder="" maxLength={100} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">הערות / מה חשוב לך לדעת? (לא חובה)</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={update("notes")}
                    placeholder="ספר/י לנו מעט על הצרכים שלך, איך אתה אוסף מסמכים היום, או כל שאלה אחרת..."
                    rows={5}
                    maxLength={2000}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="w-full bg-gradient-to-l from-primary to-accent text-white hover:opacity-90 text-lg h-14 gap-2 font-bold shadow-lg shadow-primary/30"
                >
                  {submitting ? "שולח..." : "💎 שליחת פנייה לקבלת הצעה"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  בלחיצה על שליחה את/ה מאשר/ת שניצור איתך קשר לגבי ההצעה.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}