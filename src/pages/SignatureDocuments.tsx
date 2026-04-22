import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  PenTool, 
  Plus, 
  Upload, 
  Loader2, 
  FileText,
  Send,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SignatureDocument {
  id: string;
  doc_name: string;
  file_url: string;
  file_name: string;
  case_id: string;
  status: 'ממתין לחתימה' | 'נחתם';
  created_at: string;
  signed_at?: string;
  cases?: { title: string; clients?: { full_name: string } };
}

interface Case {
  id: string;
  title: string;
  clients?: { full_name: string };
}

export default function SignatureDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<SignatureDocument[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [docName, setDocName] = useState('');
  const [selectedCase, setSelectedCase] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [declarationStatement, setDeclarationStatement] = useState('');

  const fetchData = async () => {
    if (!user) return;

    // Fetch cases for dropdown
    const { data: casesData } = await supabase
      .from('cases')
      .select('id, title, clients(full_name)')
      .eq('advisor_id', user.id)
      .eq('status', 'פתוח');

    setCases((casesData || []) as Case[]);

    // Fetch signature documents
    const { data: docsData } = await supabase
      .from('case_documents')
      .select(`
        id,
        doc_name,
        review_status,
        created_at,
        case_id,
        document_type,
        cases!inner(title, advisor_id, clients(full_name))
      `)
      .eq('document_type', 'signature')
      .eq('cases.advisor_id', user.id)
      .order('created_at', { ascending: false });

    // Get uploads for these documents
    const docIds = (docsData || []).map(d => d.id);
    const { data: uploadsData } = await supabase
      .from('uploads')
      .select('*')
      .in('case_document_id', docIds);

    // Combine data
    const enrichedDocs = (docsData || []).map(doc => {
      const upload = (uploadsData || []).find(u => u.case_document_id === doc.id);
      
      return {
        id: doc.id,
        doc_name: doc.doc_name,
        file_url: upload?.file_url || '',
        file_name: upload?.file_name || '',
        case_id: doc.case_id,
        status: (doc.review_status === 'נחתם' || doc.review_status === 'תקין') ? 'נחתם' as const : 'ממתין לחתימה' as const,
        created_at: doc.created_at,
        cases: doc.cases,
      };
    });

    setDocuments(enrichedDocs as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpload = async () => {
    if (!file || !docName || !selectedCase || !user) {
      toast({ title: 'יש למלא את כל השדות', variant: 'destructive' });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'יש להעלות קובץ PDF בלבד', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // 1. Create case_document
      const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: docData, error: docError } = await supabase
        .from('case_documents')
        .insert({
          case_id: selectedCase,
          doc_name: docName,
          required: true,
          review_status: 'חסר',
          sent_status: 'נשלח',
          document_type: 'signature',
          declaration_statement: declarationStatement.trim() || null,
          due_date: defaultDueDate,
        })
        .select()
        .single();

      if (docError) throw docError;

      // 2. Upload file to storage - sanitize filename for Supabase (remove non-ASCII chars)
      const sanitizedFileName = file.name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_') || `document_${Date.now()}.pdf`;
      const storagePath = `${selectedCase}/${docData.id}/${Date.now()}_${sanitizedFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

      // 4. Create upload record
      await supabase.from('uploads').insert({
        case_document_id: docData.id,
        case_id: selectedCase,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: 'application/pdf',
        uploaded_by: 'יועץ',
      });

      // 5. Log activity
      await supabase.from('case_activity_log').insert({
        case_id: selectedCase,
        action_type: 'שליחת לינק',
        description: `המסמך "${docName}" נשלח לחתימת הלקוח`,
      });

      toast({ title: 'המסמך הועלה בהצלחה!' });
      setDialogOpen(false);
      setDocName('');
      setSelectedCase('');
      setFile(null);
      setDeclarationStatement('');
      fetchData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'שגיאה בהעלאה', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const copyPortalLink = (caseId: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    // Get the portal token from the case
    supabase
      .from('cases')
      .select('portal_token')
      .eq('id', caseId)
      .single()
      .then(({ data }) => {
        if (data?.portal_token) {
          const link = `${window.location.origin}/portal/${data.portal_token}`;
          navigator.clipboard.writeText(link);
          toast({ title: 'הקישור הועתק!' });
        }
      });
  };

  const pendingCount = documents.filter(d => d.status === 'ממתין לחתימה').length;
  const signedCount = documents.filter(d => d.status === 'נחתם').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PenTool className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">מסמכים לחתימה</h1>
              <p className="text-sm text-muted-foreground">
                מסמכים שנשלחו ללקוחות לחתימה דיגיטלית
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                העלה מסמך לחתימה
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>העלאת מסמך לחתימה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>שם המסמך</Label>
                  <Input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="לדוגמה: הסכם שירות"
                  />
                </div>
                <div className="space-y-2">
                  <Label>בחר תיק</Label>
                  <Select value={selectedCase} onValueChange={setSelectedCase}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תיק" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title} - {c.clients?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>הצהרה (אופציונלי)</Label>
                  <textarea
                    value={declarationStatement}
                    onChange={(e) => setDeclarationStatement(e.target.value)}
                    placeholder="הזן טקסט הצהרה שיופיע בדף החתימה (לדוגמה: אני מאשר/ת שקראתי והבנתי את תוכן המסמך...)"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    טקסט זה יופיע בדף החתימה יחד עם פרטי החותם
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>קובץ PDF</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <Label htmlFor="pdf-upload" className="cursor-pointer">
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-success">
                          <FileText className="h-5 w-5" />
                          {file.name}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="h-8 w-8" />
                          <span>לחץ לבחירת קובץ PDF</span>
                        </div>
                      )}
                    </Label>
                  </div>
                </div>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !file || !docName || !selectedCase}
                  className="w-full gap-2"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  שלח לחתימה
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">ממתינים לחתימה</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{signedCount}</p>
                  <p className="text-sm text-muted-foreground">נחתמו</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{documents.length}</p>
                  <p className="text-sm text-muted-foreground">סה"כ מסמכים</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>רשימת מסמכים</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <PenTool className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">אין מסמכים לחתימה</p>
                <p className="text-sm text-muted-foreground mt-1">
                  לחץ על "העלה מסמך לחתימה" להתחלה
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם המסמך</TableHead>
                      <TableHead>תיק</TableHead>
                      <TableHead>לקוח</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>תאריך</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.doc_name}</TableCell>
                        <TableCell>{doc.cases?.title}</TableCell>
                        <TableCell>{doc.cases?.clients?.full_name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={doc.status === 'נחתם' ? 'default' : 'secondary'}
                            className={doc.status === 'נחתם' ? 'bg-success' : 'bg-warning'}
                          >
                            {doc.status === 'נחתם' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(doc.file_url, '_blank')}
                              className="gap-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              צפה
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyPortalLink(doc.case_id)}
                              className="gap-1"
                            >
                              <Copy className="h-4 w-4" />
                              קישור
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
