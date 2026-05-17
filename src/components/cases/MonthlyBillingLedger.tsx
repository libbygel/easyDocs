import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, CalendarRange, Repeat, Plus, Clock, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import {
  effectiveHourlyRate,
  formatCurrency,
  formatDuration,
  type CaseCharge,
  type CasePayment,
  type CaseTimeEntry,
} from '@/lib/billing';

const HE_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

type Category = 'recurring' | 'extra' | 'time' | 'payment';

interface LedgerRow {
  id: string;
  date: string;
  category: Category;
  description: string;
  amount: number; // positive for charge, negative for payment
  meta?: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: React.ReactNode; bg: string; text: string; ring: string }> = {
  recurring: {
    label: 'חיוב חוזר',
    icon: <Repeat className="h-3 w-3" />,
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    ring: 'border-r-4 border-purple-500',
  },
  extra: {
    label: 'חיוב נוסף',
    icon: <Plus className="h-3 w-3" />,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'border-r-4 border-amber-500',
  },
  time: {
    label: 'זמן עבודה',
    icon: <Clock className="h-3 w-3" />,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'border-r-4 border-blue-500',
  },
  payment: {
    label: 'תשלום שהתקבל',
    icon: <Banknote className="h-3 w-3" />,
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'border-r-4 border-emerald-500',
  },
};

function isRecurring(c: CaseCharge): boolean {
  // New: explicit column
  if ((c as any).source === 'recurring') return true;
  // Legacy: detect via marker embedded in description by run-recurring-charges
  if (c.description && /\[recurring:[^\]]+\]/.test(c.description)) return true;
  return false;
}

function cleanDescription(raw: string | null): string {
  if (!raw) return '—';
  return raw.replace(/\s*\[recurring:[^\]]+\]\s*/g, '').trim() || '—';
}

interface Props {
  charges: CaseCharge[];
  payments: CasePayment[];
  timeEntries: CaseTimeEntry[];
  hourlyRate: number | null;
}

export function MonthlyBillingLedger({ charges, payments, timeEntries, hourlyRate }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11

  const monthStart = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(year, month + 1, 1), [year, month]);

  const inMonth = (iso: string) => {
    const d = new Date(iso);
    return d >= monthStart && d < monthEnd;
  };

  const rows: LedgerRow[] = useMemo(() => {
    const items: LedgerRow[] = [];

    for (const c of charges) {
      if (!inMonth(c.charged_at)) continue;
      items.push({
        id: `c-${c.id}`,
        date: c.charged_at,
        category: isRecurring(c) ? 'recurring' : 'extra',
        description: cleanDescription(c.description),
        amount: Number(c.amount || 0),
      });
    }

    for (const t of timeEntries) {
      if (!inMonth(t.started_at)) continue;
      const rate = effectiveHourlyRate(t, hourlyRate);
      const secs = t.duration_seconds || 0;
      const amt = (secs / 3600) * rate;
      if (amt <= 0) continue;
      items.push({
        id: `t-${t.id}`,
        date: t.started_at,
        category: 'time',
        description: t.description || 'רישום זמן',
        amount: amt,
        meta: `${formatDuration(secs)} × ${formatCurrency(rate)}`,
      });
    }

    for (const p of payments) {
      if (!inMonth(p.paid_at)) continue;
      const desc = [p.payment_method, p.description].filter(Boolean).join(' • ') || 'תשלום';
      items.push({
        id: `p-${p.id}`,
        date: p.paid_at,
        category: 'payment',
        description: desc,
        amount: -Number(p.amount || 0),
        meta: p.charge_id ? 'מקזז חיוב מסוים' : 'תשלום כללי',
      });
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [charges, payments, timeEntries, hourlyRate, monthStart, monthEnd]);

  const totals = useMemo(() => {
    let recurring = 0, extra = 0, time = 0, paid = 0;
    for (const r of rows) {
      if (r.category === 'recurring') recurring += r.amount;
      else if (r.category === 'extra') extra += r.amount;
      else if (r.category === 'time') time += r.amount;
      else if (r.category === 'payment') paid += -r.amount;
    }
    const charged = recurring + extra + time;
    return { recurring, extra, time, paid, charged, balance: charged - paid };
  }, [rows]);

  const goPrev = () => {
    const d = new Date(year, month - 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const goNext = () => {
    const d = new Date(year, month + 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            ספר תנועות חודשי
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goPrev} title="חודש קודם">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1 text-sm font-medium min-w-[140px] text-center">
              {HE_MONTHS[month]} {year}
              {isCurrentMonth && <span className="text-xs text-muted-foreground"> (נוכחי)</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={goNext}
              disabled={isCurrentMonth}
              title="חודש הבא"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Category totals strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <CategoryTile cat="recurring" amount={totals.recurring} />
          <CategoryTile cat="extra" amount={totals.extra} />
          <CategoryTile cat="time" amount={totals.time} />
          <CategoryTile cat="payment" amount={totals.paid} />
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            אין תנועות בחודש זה
          </div>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => {
              const meta = CATEGORY_META[r.category];
              const isCredit = r.amount < 0;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 py-2 px-3 rounded-md ${meta.bg} ${meta.ring} text-sm`}
                >
                  <div className="text-muted-foreground tabular-nums shrink-0 text-xs w-20">
                    {format(new Date(r.date), 'dd/MM/yyyy')}
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${meta.text} gap-1 bg-background/60`}>
                    {meta.icon}
                    {meta.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{r.description}</div>
                    {r.meta && <div className="text-xs text-muted-foreground truncate">{r.meta}</div>}
                  </div>
                  <div className={`font-semibold tabular-nums shrink-0 ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {isCredit ? '−' : '+'}{formatCurrency(Math.abs(r.amount))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer summary */}
        <div className="pt-3 mt-2 border-t-2 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">סך חיובים בחודש</span>
            <span className="tabular-nums font-medium">{formatCurrency(totals.charged)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">סך תשלומים שהתקבלו</span>
            <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
              −{formatCurrency(totals.paid)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 mt-1 border-t">
            <span className="font-semibold">יתרה לחודש זה</span>
            <span className={`text-lg font-bold tabular-nums ${totals.balance > 0 ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(totals.balance)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryTile({ cat, amount }: { cat: Category; amount: number }) {
  const meta = CATEGORY_META[cat];
  return (
    <div className={`rounded-md p-2 ${meta.bg} ${meta.ring}`}>
      <div className={`flex items-center gap-1 text-xs ${meta.text}`}>
        {meta.icon}
        {meta.label}
      </div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{formatCurrency(amount)}</div>
    </div>
  );
}
