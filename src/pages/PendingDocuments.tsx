import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type PendingDocument = {
  id: string;
  doc_name: string;
  review_status: string;
  created_at: string;
  due_date: string | null;
  case_id: string;
  cases?: {
    title?: string;
    clients?: { full_name?: string } | { full_name?: string }[];
  };
  uploads?: { file_url?: string; file_name?: string }[];
};

const statusLabelMap: Record<string, string> = {
  'הועלה': 'הועלה לבדיקה',
  'נחתם': 'נחתם וממתין',
  'חסר': 'חסר',
  'לא תקין': 'לא תקין',
};

export default function PendingDocuments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const view = searchParams.get('view') === 'missing' ? 'missing' : 'pending';
  const statuses = useMemo(
    () => (view === 'missing' ? ['חסר', 'לא תקין'] : ['הועלה', 'נחתם']),
    [view]
  );

  const pageTitle = view === 'missing' ? 'מסמכים חסרים / לא תקינים' : 'מסמכים ממתינים לבדיקה';
  const pageSubtitle =
    view === 'missing'
      ? 'רשימה מרוכזת של מסמכים שדורשים השלמה או תיקון, לפי תיק'
      : 'רשימה מרוכזת של מסמכים ממתינים, לפי תיק';
  const countLabel = view === 'missing' ? 'לטיפול' : 'ממתינים';
  const emptyMessage = view === 'missing' ? 'אין מסמכים חסרים כרגע' : 'אין מסמכים ממתינים כרגע';

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data: casesData, error: casesError } = await supabase
          .from('cases')
          .select(`
            id,
            title,
            clients!cases_client_id_fkey ( full_name ),
            case_documents (id, doc_name, review_status, created_at, due_date, case_id)
          `)
          .eq('advisor_id', user.id);

        if (casesError) throw casesError;

        const flattenedDocs: PendingDocument[] = (casesData || []).flatMap((caseItem: any) =>
          ((caseItem.case_documents || []) as PendingDocument[])
            .filter((doc) => statuses.includes(doc.review_status))
            .map((doc) => ({
              ...doc,
              cases: {
                title: caseItem.title,
                clients: caseItem.clients,
              },
            }))
        );

        const docIds = flattenedDocs.map((doc) => doc.id);
        let uploadsByDocId = new Map<string, { file_url?: string; file_name?: string }[]>();

        if (docIds.length > 0) {
          const { data: uploadsData } = await supabase
            .from('uploads')
            .select('case_document_id, file_url, file_name, created_at')
            .in('case_document_id', docIds)
            .order('created_at', { ascending: false });

          uploadsByDocId = (uploadsData || []).reduce((map, upload: any) => {
            const existing = map.get(upload.case_document_id) || [];
            existing.push({ file_url: upload.file_url, file_name: upload.file_name });
            map.set(upload.case_document_id, existing);
            return map;
          }, new Map<string, { file_url?: string; file_name?: string }[]>());
        }

        const rows = flattenedDocs.map((doc) => ({
          ...doc,
          uploads: uploadsByDocId.get(doc.id) || [],
        })).sort((a, b) => {
          const caseA = a.cases?.title || '';
          const caseB = b.cases?.title || '';
          const caseCompare = caseA.localeCompare(caseB, 'he');
          if (caseCompare !== 0) return caseCompare;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setDocuments(rows);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user, statuses]);

  const getClientName = (doc: PendingDocument) => {
    const clients = doc.cases?.clients;
    if (Array.isArray(clients)) return clients[0]?.full_name || '-';
    return clients?.full_name || '-';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
            <p className="text-muted-foreground mt-1">{pageSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {documents.length} {countLabel}
            </Badge>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              חזרה לדשבורד
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              מסמכים לטיפול
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען מסמכים...
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">{emptyMessage}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תיק</TableHead>
                      <TableHead>מסמך</TableHead>
                      <TableHead>לקוח</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>הועלה בתאריך</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const upload = doc.uploads?.[0];
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.cases?.title || '-'}</TableCell>
                          <TableCell className="font-medium">{doc.doc_name}</TableCell>
                          <TableCell>{getClientName(doc)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{statusLabelMap[doc.review_status] || doc.review_status}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">{format(new Date(doc.created_at), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/cases/${doc.case_id}`)}>
                                פתח תיק
                              </Button>
                              {upload?.file_url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(upload.file_url, '_blank', 'noopener,noreferrer')}
                                  title={upload.file_name || 'פתח קובץ'}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
