import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Trash2, Eye, Download, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ClientDoc {
  id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
}

const DEFAULT_DOC_TYPES = [
  'תעודת זהות',
  'אישור ניהול חשבון בנק',
  'תלוש משכורת',
  'אישור הכנסות',
  'חוזה שכירות',
  'אישור מס הכנסה',
  'דוח שנתי',
  'מסמך אחר',
];

function sanitizeFilename(name: string): string {
  const ext = name.split('.').pop() || 'bin';
  return `${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  clientId: string;
}

export function ClientDocumentsPanel({ clientId }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState(DEFAULT_DOC_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('client_documents' as any)
      .select('*')
      .eq('client_id', clientId)
      .eq('advisor_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error('שגיאה בטעינת המסמכים');
    else setDocs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, [user, clientId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const finalType = docType === 'מסמך אחר' && customType.trim() ? customType.trim() : docType;
    if (!finalType) {
      toast.error('בחר סוג מסמך');
      return;
    }
    setUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        const path = `client-docs/${user.id}/${clientId}/${sanitizeFilename(file.name)}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
        const { error: dbErr } = await supabase.from('client_documents' as any).insert({
          client_id: clientId,
          advisor_id: user.id,
          doc_type: finalType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type || null,
        });
        if (dbErr) throw dbErr;
        successCount++;
      } catch (err: any) {
        toast.error(`שגיאה בהעלאה: ${err?.message || file.name}`);
      }
    }
    if (successCount > 0) toast.success(`${successCount} קובץ${successCount > 1 ? 'ים' : ''} הועלו בהצלחה`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    setCustomType('');
    fetchDocs();
  };

  const deleteDoc = async (doc: ClientDoc) => {
    if (!confirm(`למחוק את "${doc.file_name}"?`)) return;
    try {
      // Try to remove from storage (best effort - parse path from public URL)
      const url = new URL(doc.file_url);
      const idx = url.pathname.indexOf('/documents/');
      if (idx !== -1) {
        const path = url.pathname.slice(idx + '/documents/'.length);
        await supabase.storage.from('documents').remove([decodeURIComponent(path)]);
      }
    } catch (_) {}
    const { error } = await supabase.from('client_documents' as any).delete().eq('id', doc.id);
    if (error) toast.error('שגיאה במחיקה');
    else {
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success('המסמך נמחק');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Upload form */}
      <Card className="shadow-sm border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Upload className="h-4 w-4 text-primary" />
            העלאת מסמך לקוח
          </div>
          <p className="text-xs text-muted-foreground">
            אזור למסמכים בסיסיים של הלקוח שלא קשורים לתיק ספציפי (ת.ז., אישור ניהול חשבון בנק, וכו׳)
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">סוג מסמך</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {docType === 'מסמך אחר' && (
              <div className="space-y-1.5">
                <Label className="text-xs">תיאור מסמך</Label>
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="למשל: צו ירושה"
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">קובץ (ניתן לבחור כמה)</Label>
              <Input
                ref={fileRef}
                type="file"
                multiple
                disabled={uploading}
                onChange={(e) => handleFiles(e.target.files)}
                className="h-9 cursor-pointer"
              />
            </div>
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              מעלה...
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">טוען...</div>
        ) : docs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <div className="text-sm">אין מסמכים. העלה מסמך ראשון למעלה.</div>
            </CardContent>
          </Card>
        ) : (
          docs.map((doc) => (
            <Card key={doc.id} className="shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/30 text-accent-foreground font-medium">
                      {doc.doc_type}
                    </span>
                    <span className="font-medium truncate">{doc.file_name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}
                    {doc.file_size ? ` • ${formatBytes(doc.file_size)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="צפה"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="הורד"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = doc.file_url;
                      a.download = doc.file_name;
                      a.target = '_blank';
                      a.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    title="מחק"
                    onClick={() => deleteDoc(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}