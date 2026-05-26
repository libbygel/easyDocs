import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
};

export default function PendingDocuments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingDocuments = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('case_documents')
          .select(`
            id,
            doc_name,
            review_status,
            created_at,
            due_date,
            case_id,
            cases!inner(title, advisor_id, clients(full_name)),
            uploads(file_url, file_name)
          `)
          .in('review_status', ['הועלה', 'נחתם'])
          .eq('cases.advisor_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments((data || []) as PendingDocument[]);
      } catch (err) {
        console.error('Error fetching pending documents:', err);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDocuments();
  }, [user]);

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
            <h1 className="text-2xl font-bold">מסמכים ממתינים לבדיקה</h1>
            <p className="text-muted-foreground mt-1">רשימה מרוכזת של כל המסמכים הממתינים מכל התיקים</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {documents.length} ממתינים
          </Badge>
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
              <div className="text-center py-10 text-muted-foreground">
                אין מסמכים ממתינים כרגע
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>מסמך</TableHead>
                      <TableHead>לקוח</TableHead>
                      <TableHead>תיק</TableHead>
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
                          <TableCell className="font-medium">{doc.doc_name}</TableCell>
                          <TableCell>{getClientName(doc)}</TableCell>
                          <TableCell>{doc.cases?.title || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{statusLabelMap[doc.review_status] || doc.review_status}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/cases/${doc.case_id}`)}
                              >
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
