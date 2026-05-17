import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error" | "submitting";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus("error");
      setErrorMsg("Missing Supabase env vars");
      return;
    }

    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, { headers: { apikey: SUPABASE_ANON_KEY } });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); setErrorMsg(data.error || ""); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        if (data.valid === true) { setStatus("valid"); return; }
        setStatus("invalid");
      } catch (_) { setStatus("invalid"); }
    })();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus("error");
      setErrorMsg("Missing Supabase env vars");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) setStatus("success");
      else if (data.reason === "already_unsubscribed") setStatus("already");
      else { setStatus("error"); setErrorMsg(data.error || ""); }
    } catch (e: any) { setStatus("error"); setErrorMsg(e.message || ""); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center"><CardTitle>הסרת מנוי</CardTitle></CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (<><Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" /><p>טוען...</p></>)}
          {status === "valid" && (<><p>האם להסיר אותך מרשימת התפוצה של EasyDocs?</p><Button onClick={handleConfirm} variant="destructive">אשר/י הסרה</Button></>)}
          {status === "submitting" && (<><Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" /><p>מסיר...</p></>)}
          {status === "success" && (<><CheckCircle2 className="h-12 w-12 mx-auto text-green-600" /><p>הוסרת בהצלחה. לא תקבל/י עוד מיילים.</p></>)}
          {status === "already" && (<><CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" /><p>כבר הוסרת מרשימת התפוצה.</p></>)}
          {status === "invalid" && (<><XCircle className="h-12 w-12 mx-auto text-destructive" /><p>הקישור לא תקף או פג תוקפו.{errorMsg && ` (${errorMsg})`}</p></>)}
          {status === "error" && (<><XCircle className="h-12 w-12 mx-auto text-destructive" /><p>אירעה שגיאה. נסה/י שוב.{errorMsg && ` (${errorMsg})`}</p></>)}
        </CardContent>
      </Card>
    </div>
  );
}