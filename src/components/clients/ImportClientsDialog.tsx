import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'mapping' | 'duplicates' | 'importing' | 'done';

const FIELDS = [
  { key: 'full_name', label: 'שם מלא', required: true },
  { key: 'id_number', label: 'תעודת זהות', required: false },
  { key: 'phone', label: 'טלפון', required: false },
  { key: 'email', label: 'אימייל', required: false },
  { key: 'notes', label: 'הערות', required: false },
  { key: 'spouse_full_name', label: 'שם בן/בת זוג', required: false },
  { key: 'spouse_id_number', label: 'ת.ז. בן/בת זוג', required: false },
  { key: 'spouse_phone', label: 'טלפון בן/בת זוג', required: false },
  { key: 'spouse_email', label: 'אימייל בן/בת זוג', required: false },
] as const;

const HEBREW_HINTS: Record<string, string[]> = {
  full_name: ['שם', 'שם מלא', 'לקוח', 'name', 'fullname', 'full name'],
  id_number: ['ת.ז', 'תז', 'תעודת זהות', 'ת"ז', 'id', 'idnumber'],
  phone: ['טלפון', 'נייד', 'phone', 'mobile', 'tel'],
  email: ['מייל', 'אימייל', 'דוא״ל', 'email', 'mail'],
  notes: ['הערות', 'הערה', 'notes', 'remark'],
  spouse_full_name: ['שם מלא בן', 'שם מלא בת', 'בן זוג', 'בת זוג', 'בן/בת זוג', 'בן/בת ה', 'spouse'],
  spouse_id_number: ['ת.ז בן', 'ת.ז בת', 'תעודת זהות בן', 'תעודת זהות בת', 'ת.ז. בן/בת'],
  spouse_phone: ['טלפון בן', 'טלפון בת'],
  spouse_email: ['מייל בן', 'מייל בת', 'אימייל בן', 'אימייל בת', 'אימייל בן/בת'],
};

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const field of FIELDS) {
    const hints = HEBREW_HINTS[field.key] || [];
    const matched = headers.find((h) => {
      const hl = String(h).toLowerCase().trim();
      return hints.some((hint) => hl.includes(hint.toLowerCase()));
    });
    if (matched) mapping[field.key] = matched;
  }
  return mapping;
}

type DuplicateAction = 'skip' | 'update' | 'create';
interface DuplicateRow {
  rowIndex: number;
  newData: any;
  existing: any;
  action: DuplicateAction;
}

export function ImportClientsDialog({ open, onOpenChange, onSuccess }: ImportClientsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateRow[]>([]);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState({ created: 0, updated: 0, skipped: 0, failed: 0 });
  const [firstError, setFirstError] = useState<string | null>(null);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setDuplicates([]);
    setValidRows([]);
    setResult({ created: 0, updated: 0, skipped: 0, failed: 0 });
    setFirstError(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      reset();
      onSuccess();
    }
    onOpenChange(o);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      if (json.length === 0) {
        toast({ title: 'הקובץ ריק', variant: 'destructive' });
        return;
      }
      const hdrs = Object.keys(json[0]);
      setFileName(file.name);
      setHeaders(hdrs);
      setRows(json);
      setMapping(autoDetectMapping(hdrs));
      setStep('mapping');
    } catch (err: any) {
      toast({ title: 'שגיאה בקריאת הקובץ', description: err.message, variant: 'destructive' });
    }
  };

  const proceedToDuplicates = async () => {
    if (!user) return;
    if (!mapping.full_name) {
      toast({ title: 'חובה למפות עמודת שם מלא', variant: 'destructive' });
      return;
    }
    // Build mapped rows
    const mapped = rows.map((row, idx) => {
      const obj: any = { _rowIndex: idx + 2 };
      for (const field of FIELDS) {
        const src = mapping[field.key];
        if (src) {
          const val = row[src];
          obj[field.key] = val === '' || val == null ? null : String(val).trim();
        }
      }
      return obj;
    }).filter((r) => r.full_name);

    // Fetch existing clients with id_numbers
    const ids = mapped.map((r) => r.id_number).filter(Boolean);
    const existingMap = new Map<string, any>();
    if (ids.length > 0) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('advisor_id', user.id)
        .in('id_number', ids);
      (data || []).forEach((c: any) => {
        if (c.id_number) existingMap.set(c.id_number, c);
      });
    }

    const dups: DuplicateRow[] = [];
    const fresh: any[] = [];
    for (const r of mapped) {
      if (r.id_number && existingMap.has(r.id_number)) {
        dups.push({
          rowIndex: r._rowIndex,
          newData: r,
          existing: existingMap.get(r.id_number),
          action: 'skip',
        });
      } else {
        fresh.push(r);
      }
    }
    setValidRows(fresh);
    setDuplicates(dups);
    if (dups.length > 0) {
      setStep('duplicates');
    } else {
      runImport(fresh, []);
    }
  };

  const runImport = async (fresh: any[], dups: DuplicateRow[]) => {
    if (!user) return;
    setStep('importing');
    setImporting(true);
    let created = 0, updated = 0, skipped = 0, failed = 0;
    let capturedError: string | null = null;

    const buildPayload = (r: any) => {
      const p: any = { advisor_id: user.id };
      for (const field of FIELDS) {
        if (r[field.key] !== undefined) p[field.key] = r[field.key];
      }
      return p;
    };

    // Smart batch insert: automatically strips unknown columns on error
    const isMissingCol = (err: any) =>
      err?.code === 'PGRST204' ||
      /column.*does not exist/i.test(err?.message ?? '') ||
      /schema cache/i.test(err?.message ?? '');

    const extractBadCol = (msg: string): string | null => {
      // "Could not find the 'spouse_full_name' column of 'clients' in the schema cache"
      let m = msg.match(/find\s+(?:the\s+)?['"]?(\w+)['"]?\s+column/i);
      if (m) return m[1];
      // "column 'spouse_full_name' of relation 'clients' does not exist"
      m = msg.match(/column\s+['"](\w+)['"]/i);
      if (m) return m[1];
      return null;
    };

    const insertBatch = async (payloads: any[]): Promise<{ ok: number; err: string | null }> => {
      let current = payloads;
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data, error } = await supabase.from('clients').insert(current).select('id');
        if (!error) return { ok: data?.length || current.length, err: null };

        // If the error is "column X does not exist", strip that column and retry
        if (isMissingCol(error)) {
          const badCol = extractBadCol(error.message);
          if (badCol) {
            current = current.map((p) => { const c = { ...p }; delete c[badCol]; return c; });
            continue;
          }
        }

        // Any other error — fall back to row-by-row so we count each failure individually
        let ok = 0;
        for (const p of current) {
          let payload = { ...p };
          let rowError: any = null;
          for (let r = 0; r < 10; r++) {
            const res = await supabase.from('clients').insert(payload);
            if (!res.error) { ok++; rowError = null; break; }
            if (isMissingCol(res.error)) {
              const bc = extractBadCol(res.error.message);
              if (bc) { payload = { ...payload }; delete payload[bc]; continue; }
            }
            rowError = res.error;
            break;
          }
          if (rowError) {
            failed++;
            if (!capturedError) capturedError = rowError.message;
          }
        }
        return { ok, err: error.message };
      }
      return { ok: 0, err: 'מספר ניסיונות חזרה עבר את המגבלה' };
    };

    // Insert fresh rows + duplicates with action=create
    const toInsert = fresh.map(buildPayload);
    dups.filter((d) => d.action === 'create').forEach((d) => toInsert.push(buildPayload(d.newData)));

    if (toInsert.length > 0) {
      const { ok, err } = await insertBatch(toInsert);
      created = ok;
      if (err && !capturedError) capturedError = err;
    }

    // Process update / skip duplicates
    for (const d of dups) {
      if (d.action === 'skip' || d.action === 'create') {
        if (d.action === 'skip') skipped++;
        continue;
      }
      // update
      const payload: any = {};
      for (const field of FIELDS) {
        const v = d.newData[field.key];
        if (v !== undefined && v !== null && v !== '') payload[field.key] = v;
      }
      const { error } = await supabase.from('clients').update(payload).eq('id', d.existing.id);
      if (error) { failed++; if (!capturedError) capturedError = error.message; }
      else updated++;
    }

    setFirstError(capturedError);
    setResult({ created, updated, skipped, failed });
    setImporting(false);
    setStep('done');
  };

  const totalToProcess = useMemo(
    () => validRows.length + duplicates.filter((d) => d.action !== 'skip').length,
    [validRows, duplicates]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            יבוא לקוחות מקובץ Excel / CSV
          </DialogTitle>
          <DialogDescription className="text-right">
            העלה את קובץ הלקוחות הקיים שלך — נמפה את העמודות אוטומטית
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">לחץ לבחירת קובץ</p>
              <p className="text-sm text-muted-foreground mt-1">
                תומך ב-.xlsx, .xls, .csv
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
            />
            <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium">💡 טיפ:</p>
              <p className="text-muted-foreground">
                שורה ראשונה צריכה להיות כותרות (שם, ת.ז., טלפון וכו'). נזהה אותן אוטומטית.
              </p>
              <p className="text-muted-foreground">חובה: עמודת שם מלא. שאר השדות אופציונליים.</p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="bg-muted/40 rounded-lg p-3 text-sm flex items-center justify-between">
              <span>{fileName}</span>
              <Badge variant="secondary">{rows.length} שורות</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              התאם כל שדה במערכת לעמודה בקובץ שלך. השדות שזוהו אוטומטית מסומנים מראש.
            </p>
            <div className="space-y-2">
              {FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-[160px_1fr] gap-3 items-center">
                  <Label className="text-right">
                    {field.label}
                    {field.required && <span className="text-destructive mr-1">*</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || '__none__'}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [field.key]: v === '__none__' ? '' : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- לא מיובא --" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="__none__">-- לא מיובא --</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {/* Preview */}
            <div className="space-y-2">
              <Label>תצוגה מקדימה (3 שורות ראשונות)</Label>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <TableHead key={f.key} className="text-start">{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 3).map((r, i) => (
                      <TableRow key={i}>
                        {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <TableCell key={f.key}>{String(r[mapping[f.key]] ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t sticky bottom-0 bg-background">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowRight className="ml-2 h-4 w-4" />
                חזור
              </Button>
              <Button onClick={proceedToDuplicates} className="flex-1">
                המשך
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'duplicates' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                נמצאו <strong>{duplicates.length}</strong> לקוחות עם תעודת זהות שכבר קיימת. בחר מה לעשות עם כל אחד:
              </div>
            </div>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">שם בקובץ</TableHead>
                    <TableHead className="text-start">ת.ז.</TableHead>
                    <TableHead className="text-start">קיים במערכת</TableHead>
                    <TableHead className="text-start">פעולה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicates.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.newData.full_name}</TableCell>
                      <TableCell dir="ltr">{d.newData.id_number}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.existing.full_name}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={d.action}
                          onValueChange={(v: DuplicateAction) =>
                            setDuplicates((arr) => {
                              const copy = [...arr];
                              copy[i] = { ...copy[i], action: v };
                              return copy;
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="skip">דלג</SelectItem>
                            <SelectItem value="update">עדכן קיים</SelectItem>
                            <SelectItem value="create">צור חדש בכל זאת</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex gap-2 pt-3 border-t bg-background">
              <Button variant="outline" size="sm" onClick={() =>
                setDuplicates((arr) => arr.map((d) => ({ ...d, action: 'skip' })))
              }>
                סמן הכל: דלג
              </Button>
              <Button variant="outline" size="sm" onClick={() =>
                setDuplicates((arr) => arr.map((d) => ({ ...d, action: 'update' })))
              }>
                סמן הכל: עדכן
              </Button>
            </div>
            <div className="flex gap-2 pt-3 border-t sticky bottom-0 bg-background">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowRight className="ml-2 h-4 w-4" />
                חזור
              </Button>
              <Button onClick={() => runImport(validRows, duplicates)} className="flex-1">
                ייבא {totalToProcess} לקוחות
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p>מייבא לקוחות...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <h3 className="text-lg font-bold">היבוא הושלם!</h3>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-sm">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-700">{result.created}</div>
                <div className="text-muted-foreground">נוצרו</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
                <div className="text-muted-foreground">עודכנו</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{result.skipped}</div>
                <div className="text-muted-foreground">דולגו</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-700">{result.failed}</div>
                <div className="text-muted-foreground">נכשלו</div>
              </div>
            </div>
            {firstError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-right max-w-md mx-auto">
                <p className="font-medium text-red-700 mb-1">סיבת הכשלון:</p>
                <p className="text-red-600 font-mono text-xs break-all">{firstError}</p>
              </div>
            )}
            <Button onClick={() => handleClose(false)} className="mt-4">סיום</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}