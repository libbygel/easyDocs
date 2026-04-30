import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  effectiveHourlyRate,
  formatCurrency,
  formatDuration,
  type CaseTimeEntry,
} from '@/lib/billing';

const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

interface MonthBucket {
  key: string; // YYYY-MM
  label: string;
  totalSeconds: number;
  totalCharge: number;
  entries: CaseTimeEntry[];
}

function bucketByMonth(entries: CaseTimeEntry[], defaultRate: number | null): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const e of entries) {
    const d = new Date(e.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { key, label, totalSeconds: 0, totalCharge: 0, entries: [] };
      map.set(key, bucket);
    }
    const secs = e.duration_seconds || 0;
    const rate = effectiveHourlyRate(e, defaultRate);
    bucket.totalSeconds += secs;
    bucket.totalCharge += (secs / 3600) * rate;
    bucket.entries.push(e);
  }
  // newest first
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}

interface Props {
  entries: CaseTimeEntry[];
  hourlyRate: number | null;
  caseTitle?: string;
}

export function MonthlyTimeReport({ entries, hourlyRate, caseTitle }: Props) {
  const [open, setOpen] = useState(false);
  const buckets = useMemo(() => bucketByMonth(entries, hourlyRate), [entries, hourlyRate]);

  const totalSeconds = buckets.reduce((s, b) => s + b.totalSeconds, 0);
  const totalCharge = buckets.reduce((s, b) => s + b.totalCharge, 0);

  const handleExportCsv = () => {
    const rows: string[] = [];
    rows.push(['חודש', 'תאריך', 'תיאור', 'משך', 'שעות', 'תעריף', 'סכום'].join(','));
    for (const b of buckets) {
      for (const e of b.entries) {
        const secs = e.duration_seconds || 0;
        const rate = effectiveHourlyRate(e, hourlyRate);
        const hours = secs / 3600;
        rows.push(
          [
            b.label,
            new Date(e.started_at).toLocaleDateString('he-IL'),
            JSON.stringify(e.description || ''),
            formatDuration(secs),
            hours.toFixed(2),
            rate.toFixed(2),
            (hours * rate).toFixed(2),
          ].join(','),
        );
      }
      rows.push(
        [
          `סיכום ${b.label}`,
          '',
          '',
          formatDuration(b.totalSeconds),
          (b.totalSeconds / 3600).toFixed(2),
          '',
          b.totalCharge.toFixed(2),
        ].join(','),
      );
    }
    rows.push(
      ['סך הכל', '', '', formatDuration(totalSeconds), (totalSeconds / 3600).toFixed(2), '', totalCharge.toFixed(2)].join(','),
    );
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `דוח-זמני-עבודה-${caseTitle || 'תיק'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (buckets.length === 0) return null;

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              פילוח חודשי
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-2 h-8" onClick={() => setOpen(true)}>
              דוח מפורט
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {buckets.map((b) => (
              <div key={b.key} className="flex items-center justify-between py-2 text-sm">
                <div className="flex-1 font-medium">{b.label}</div>
                <div className="font-mono tabular-nums shrink-0 w-20 text-end">
                  {formatDuration(b.totalSeconds)}
                </div>
                <div className="font-semibold tabular-nums shrink-0 w-24 text-end">
                  {b.totalCharge > 0 ? formatCurrency(b.totalCharge) : '—'}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1 border-t-2 text-sm font-bold">
              <div className="flex-1">סך הכל</div>
              <div className="font-mono tabular-nums shrink-0 w-20 text-end">
                {formatDuration(totalSeconds)}
              </div>
              <div className="tabular-nums shrink-0 w-24 text-end">
                {totalCharge > 0 ? formatCurrency(totalCharge) : '—'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-right">דוח חודשי — {caseTitle || 'תיק'}</DialogTitle>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportCsv}>
                <Download className="h-4 w-4" />
                ייצוא CSV
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto space-y-6 pr-1">
            {buckets.map((b) => (
              <div key={b.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="font-semibold text-base">{b.label}</div>
                  <div className="text-sm">
                    <span className="font-mono tabular-nums">{formatDuration(b.totalSeconds)}</span>
                    {b.totalCharge > 0 && (
                      <span className="font-semibold ms-3 tabular-nums">
                        {formatCurrency(b.totalCharge)}
                      </span>
                    )}
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תאריך</TableHead>
                      <TableHead>תיאור</TableHead>
                      <TableHead className="text-end">משך</TableHead>
                      <TableHead className="text-end">תעריף</TableHead>
                      <TableHead className="text-end">סכום</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b.entries.map((e) => {
                      const secs = e.duration_seconds || 0;
                      const rate = effectiveHourlyRate(e, hourlyRate);
                      const charge = (secs / 3600) * rate;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="tabular-nums">
                            {new Date(e.started_at).toLocaleDateString('he-IL')}
                          </TableCell>
                          <TableCell>{e.description || '—'}</TableCell>
                          <TableCell className="tabular-nums text-end">{formatDuration(secs)}</TableCell>
                          <TableCell className="tabular-nums text-end">
                            {rate > 0 ? formatCurrency(rate) : '—'}
                          </TableCell>
                          <TableCell className="tabular-nums text-end font-semibold">
                            {charge > 0 ? formatCurrency(charge) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}