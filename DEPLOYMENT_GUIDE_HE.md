# מדריך תחזוקה ופריסה - EasyDocs

מדריך זה מסביר איך לקחת את הקוד הזה ולהריץ אותו על שרת אחר (Vercel / Netlify / שרת אחר) עם דומיין חדש (לדוגמה `libby....com`).

---

## 1. הקוד עצמו ✅ (אגנוסטי לדומיין)

הקוד **לא מקודד-קשיח** לאף דומיין. הוא משתמש ב-`window.location.origin` בכל מקום רלוונטי (כמו לינק איפוס סיסמה), ולכן הוא יעבוד אוטומטית על:
- `libby....com`
- `easydocs-libby.lovable.app`
- כל דומיין אחר

**אין צורך לשנות שום קוד כדי להחליף דומיין.**

---

## 2. משתני סביבה (Environment Variables) ⚙️

קובץ `.env` מכיל 3 משתנים שחייבים להיות מוגדרים בפלטפורמת הפריסה (Vercel/Netlify):

```
VITE_SUPABASE_URL=https://secsdczrrrdncibhpbhs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
VITE_SUPABASE_PROJECT_ID=secsdczrrrdncibhpbhs
```

### איך מגדירים ב-Vercel:
1. נכנסים לפרויקט ב-Vercel
2. Settings → Environment Variables
3. מוסיפים את שלושת המשתנים למעלה (Production + Preview + Development)
4. עושים Redeploy

⚠️ **שימו לב:** הקוד מחובר ל-**שני** פרויקטי Supabase:
- `secsdczrrrdncibhpbhs` (Lovable Cloud - מוגדר ב-`.env`)
- `hndzejkwwpwrtzqpnqme` (Supabase חיצוני - **מקודד-קשיח** ב-`src/lib/supabaseClient.ts` וב-`src/hooks/useAuth.tsx`)

הפרויקט החיצוני (`hndzejkwwpwrtzqpnqme`) הוא זה שמחזיק את המשתמשים והנתונים. **אין צורך לשנות אותו** - הוא ימשיך לעבוד מכל דומיין.

---

## 3. הגדרות Supabase Redirect URLs 🔑 (הכי חשוב!)

זה הצעד שהכי הרבה פעמים שוכחים אותו, וגורם לכך שלינקים של איפוס סיסמה ואימות אימייל לא עובדים.

### למה זה צריך?
Supabase חוסם כל הפניה (redirect) לדומיין שלא הוגדר מראש כ"מורשה". אם המשתמש לוחץ על לינק איפוס סיסמה והדומיין החדש לא ברשימה - הוא יקבל שגיאה.

### איפה מגדירים:
היכנסי לפרויקט Supabase **`hndzejkwwpwrtzqpnqme`** (לא Lovable Cloud!):

https://supabase.com/dashboard/project/hndzejkwwpwrtzqpnqme/auth/url-configuration

### מה להוסיף ל-Redirect URLs:
```
https://libby....com/**
https://libby....com/reset-password
https://www.libby....com/**
https://www.libby....com/reset-password
```

### Site URL:
שני את `Site URL` לדומיין הראשי החדש:
```
https://libby....com
```

---

## 4. דומיין מותאם אישית (Custom Domain) 🌐

### אם פורסים ל-Vercel:
1. Vercel Dashboard → Project → Settings → Domains
2. Add Domain → `libby....com`
3. Vercel ייתן רשומות DNS (A record או CNAME) להוסיף אצל ספק הדומיין
4. ממתינים להתפשטות DNS (עד 48 שעות, בד"כ כמה דקות)

### אם פורסים ל-Lovable:
Project Settings → Domains → Connect Domain

---

## 5. מיילים ✉️

המערכת שולחת מיילים (איפוס סיסמה, התראות וכו') דרך תשתית של Lovable עם הדומיין `notify.easydocs.tech`.

### חשוב להבין:
- הדומיין `notify.easydocs.tech` מוגדר ב-**workspace של Lovable** של דבורה.
- אם הלקוחה תעבוד **רק ב-Vercel** ולא ב-Lovable - המיילים האלה **לא יעבדו** מהדומיין הזה.

### שתי אפשרויות ללקוחה:

#### אפשרות א' - להישאר עם Lovable (מומלץ):
הלקוחה יוצרת חשבון Lovable, מעלים את הפרויקט לשם, וההגדרות של המיילים נשארות. גם פריסה דרך Lovable.

#### אפשרות ב' - לעבור ל-Vercel ולשירות מיילים נפרד:
1. נרשמים ל-[Resend](https://resend.com) (חינם עד 3000 מיילים בחודש)
2. מאמתים את הדומיין `libby....com` ב-Resend
3. מגדירים את ה-API key של Resend ב-Supabase כ-Auth Email SMTP:
   - Supabase Dashboard → Authentication → Email Settings → SMTP Settings
   - Host: `smtp.resend.com`, Port: `465`, User: `resend`, Password: ה-API key
4. ב-Supabase → Authentication → Email Templates - מעדכנים את התבניות שיהיו בעברית עם המיתוג של EasyDocs

---

## 6. רשימת בדיקה לפני פריסה ✅

לפני שמעלים ללקוחה, ודאי שכל אלה מסומנים:

- [ ] קוד הועלה ל-GitHub של הלקוחה
- [ ] Vercel/Lovable מחובר ל-Repo
- [ ] משתני סביבה הוגדרו ב-Vercel/Lovable (3 משתנים)
- [ ] דומיין `libby....com` מחובר ופעיל (HTTPS עובד)
- [ ] ב-Supabase `hndzejkwwpwrtzqpnqme`: עודכן Site URL + Redirect URLs
- [ ] בוצע פריסה ראשונה והאתר נטען
- [ ] נבדק רישום משתמש חדש (signup)
- [ ] נבדק התחברות (login)
- [ ] נבדק איפוס סיסמה - הלינק במייל מוביל ל-`libby....com/reset-password` ועובד
- [ ] נבדק יצירת תיק + העלאת מסמך
- [ ] נבדק לינק לקוח (Client Portal) - נפתח מהדומיין החדש

---

## 7. קבצים חשובים בפרויקט 📁

| קובץ | תפקיד |
|------|------|
| `.env` | משתני סביבה (מוגדר ב-Vercel, לא ב-Git) |
| `src/lib/supabaseClient.ts` | חיבור ל-Supabase החיצוני (auth + data) |
| `src/integrations/supabase/client.ts` | חיבור ל-Lovable Cloud (מיילים, edge functions) |
| `src/hooks/useAuth.tsx` | לוגיקת התחברות/רישום |
| `src/pages/ResetPassword.tsx` | דף איפוס סיסמה |
| `src/App.tsx` | ניווט ראשי + הגדרת ראוטים |
| `supabase/functions/` | פונקציות שרת (מיילים, התראות, וכו') |

---

## 8. בעיות נפוצות ופתרונן 🔧

### "לינק איפוס סיסמה לא עובד / מוביל לדף שגוי"
→ לא הוספת את הדומיין החדש ל-Redirect URLs ב-Supabase (סעיף 3).

### "המשתמש מצליח להירשם אבל לא מצליח להתחבר"
→ במערכת זו יש "אישור ידני" (`is_paid=true`) שצריך להפעיל ב-DB אחרי הרשמה. בודקים בטבלת `profiles` ב-Supabase.

### "מיילים לא נשלחים"
→ בדקי איזה דומיין מיילים פעיל (סעיף 5). אם זה לא Lovable - צריך להגדיר SMTP נפרד.

### "Build נכשל ב-Vercel"
→ לרוב זה משתני סביבה חסרים. ודאי שכל 3 ה-`VITE_*` מוגדרים.

---

## 9. תמיכה 💬

לכל שאלה במהלך התחזוקה - אפשר לשאול את Lovable AI או לפנות אליי.

בהצלחה! 🚀
