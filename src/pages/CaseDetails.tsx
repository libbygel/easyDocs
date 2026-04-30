import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { fetchCurrentAdvisorProfile } from '@/lib/advisorProfile';
import type { Case, Client, CaseType, CaseDocument, Upload } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { CaseActivityTimeline } from '@/components/cases/CaseActivityTimeline';
import { ReadyForSubmissionButton } from '@/components/cases/ReadyForSubmissionButton';
import { BulkDownloadButton } from '@/components/cases/BulkDownloadButton';
import { CaseCompletionBanner } from '@/components/cases/CaseCompletionBanner';
import { DraggableDocumentRow } from '@/components/cases/DraggableDocumentRow';
import { logCaseActivity } from '@/lib/activityLog';
import { syncCaseStatus } from '@/lib/caseStatusSync';
import { CaseTimerWidget } from '@/components/cases/CaseTimerWidget';
import { CaseFinancePanel } from '@/components/cases/CaseFinancePanel';
import { 
  ArrowRight, 
  Copy, 
  Mail, 
  Phone, 
  FileText,
  Plus,
  ExternalLink,
  Send,
  Download,
  PenTool,
  Search,
  Filter,
  Upload as UploadIcon,
  Inbox,
  Landmark,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DocumentReviewDialog } from '@/components/cases/DocumentReviewDialog';
import { DocumentFilesDialog } from '@/components/cases/DocumentFilesDialog';
import { AddUploadDocumentDialog } from '@/components/cases/AddUploadDocumentDialog';
import { AddSignatureDocumentDialog } from '@/components/cases/AddSignatureDocumentDialog';
import { UploadSignaturePdfDialog } from '@/components/cases/UploadSignaturePdfDialog';
import { SendReminderDialog } from '@/components/cases/SendReminderDialog';
import { SendPortalLinkDialog } from '@/components/cases/SendPortalLinkDialog';
import { AdvisorUploadDialog } from '@/components/cases/AdvisorUploadDialog';
import { SendToBankerTab } from '@/components/cases/SendToBankerTab';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { generateCaseReport } from '@/lib/pdfExport';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

type CaseWithRelations = Case & {
  clients: Client | null;
  case_types: CaseType | null;
};

type DocumentWithUpload = CaseDocument & {
  uploads: Upload[];
};

type ReviewStatusFilter = 'all' | 'חסר' | 'הועלה' | 'תקין' | 'לא תקין';

const CaseDetails = React.forwardRef<HTMLDivElement, Record<string, never>>(function CaseDetails(_props, _ref) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [caseData, setCaseData] = useState<CaseWithRelations | null>(null);
  const [documents, setDocuments] = useState<DocumentWithUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDoc, setReviewDoc] = useState<DocumentWithUpload | null>(null);
  const [addUploadDocOpen, setAddUploadDocOpen] = useState(false);
  const [addSignatureDocOpen, setAddSignatureDocOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [sendPortalLinkOpen, setSendPortalLinkOpen] = useState(false);
  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);
  const [filesDialogDoc, setFilesDialogDoc] = useState<DocumentWithUpload | null>(null);
  const [uploadSignaturePdfDoc, setUploadSignaturePdfDoc] = useState<DocumentWithUpload | null>(null);
  const [advisorUploadDoc, setAdvisorUploadDoc] = useState<DocumentWithUpload | null>(null);
  const [previewMode, setPreviewMode] = useState<'new_tab' | 'modal'>('new_tab');
  const [advisorName, setAdvisorName] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [timerMode, setTimerMode] = useState<'manual' | 'auto'>('manual');
  const [financeRefresh, setFinanceRefresh] = useState(0);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('all');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = documents.findIndex((d) => d.id === active.id);
      const newIndex = documents.findIndex((d) => d.id === over.id);

      const newOrder = arrayMove(documents, oldIndex, newIndex);
      setDocuments(newOrder);

      // Update order in database
      const updates = newOrder.map((doc, index) => ({
        id: doc.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('case_documents')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    }
  };

  const fetchData = async () => {
    if (!id) return;

    try {
      // Parallel fetch for case data and documents+uploads
      const [caseResult, docsResult, uploadsResult] = await Promise.all([
        supabase
          .from('cases')
          .select(`
            *,
            clients!cases_client_id_fkey (*),
            case_types!cases_case_type_id_fkey (*)
          `)
          .eq('id', id)
          .maybeSingle(),
        
        supabase
          .from('case_documents')
          .select('*')
          .eq('case_id', id)
          .order('display_order'),
        
        supabase
          .from('uploads')
          .select('*')
          .eq('case_id', id)
          .order('created_at')
      ]);

      if (caseResult.data) {
        setCaseData(caseResult.data as CaseWithRelations);
      }

      // Merge uploads into documents efficiently
      const uploadsByDoc = new Map<string, Upload[]>();
      (uploadsResult.data || []).forEach((u) => {
        const existing = uploadsByDoc.get(u.case_document_id) || [];
        existing.push(u);
        uploadsByDoc.set(u.case_document_id, existing);
      });

      const mergedDocs = (docsResult.data || []).map((doc) => ({
        ...doc,
        uploads: uploadsByDoc.get(doc.id) || [],
      }));

      setDocuments(mergedDocs as DocumentWithUpload[]);

      // Reconcile case status with current document state (idempotent — only
      // updates the DB if the derived status differs from the stored one).
      if (caseResult.data) {
        await syncCaseStatus(
          id,
          mergedDocs as Pick<CaseDocument, 'required' | 'review_status'>[],
          (caseResult.data as any).status,
        );
      }
    } catch (err) {
      console.error('Error fetching case data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Fetch preview mode preference from localStorage
    if (user) {
      try {
        const saved = localStorage.getItem(`settings_${user.id}`);
        if (saved) {
          const s = JSON.parse(saved);
          if (s.previewMode) {
            setPreviewMode(s.previewMode as 'new_tab' | 'modal');
          }
        }
      } catch {}

      fetchCurrentAdvisorProfile(user).then((profile) => {
        setAdvisorName(profile.displayName || user.email?.split('@')[0] || '');
        setHourlyRate(profile.hourlyRate);
        setTimerMode(profile.timerMode);
      });
    }

    // Realtime subscription for instant updates
    if (id) {
      const channel = supabase
        .channel(`case-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'case_documents', filter: `case_id=eq.${id}` }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'uploads', filter: `case_id=eq.${id}` }, () => fetchData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [id, user]);

  const copyPortalLink = () => {
    if (!caseData) return;
    const link = `${window.location.origin}/portal/${caseData.portal_token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'הקישור הועתק',
      description: 'ניתן לשלוח ללקוח',
    });
  };

  const copyMasterPortalLink = () => {
    if (!caseData?.client_id) return;
    const link = `${window.location.origin}/client-portal/${caseData.client_id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'קישור פורטל הלקוח הועתק',
      description: 'קישור צפייה בלבד לכל התיקים של הלקוח',
    });
  };

  const handleApprove = async (docId: string, docName: string) => {
    await supabase
      .from('case_documents')
      .update({ review_status: 'תקין' })
      .eq('id', docId);
    
    if (id) {
      await logCaseActivity(id, 'אישור מסמך', `המסמך "${docName}" אושר`);
    }
    
    await syncCaseStatus(id, documents.map(d => d.id === docId ? { ...d, review_status: 'תקין' as const } : d), caseData?.status);
    fetchData();
    toast({ title: 'המסמך אושר בהצלחה' });
  };

  const handleReject = async (docId: string, note: string) => {
    const docName = reviewDoc?.doc_name || '';
    
    await supabase
      .from('case_documents')
      .update({ review_status: 'לא תקין', advisor_note: note })
      .eq('id', docId);
    
    if (id) {
      await logCaseActivity(id, 'דחיית מסמך', `המסמך "${docName}" נדחה: ${note}`);
    }
    
    await syncCaseStatus(id, documents.map(d => d.id === docId ? { ...d, review_status: 'לא תקין' as const } : d), caseData?.status);
    fetchData();
    setReviewDoc(null);

    // Send rejection email to client immediately
    if (caseData?.clients?.email) {
      try {
        await invokeEdgeFunction('send-reminder-to-client', {
          clientName: caseData.clients.full_name,
          clientEmail: caseData.clients.email,
          caseTitle: caseData.title,
          portalToken: caseData.portal_token,
          personalMessage: `המסמך "${docName}" נדחה ויש להעלות אותו מחדש.`,
          advisorEmail: user?.email || '',
          advisorName: advisorName || '',
          missingDocs: [{
            doc_name: docName,
            review_status: 'לא תקין',
            due_date: null,
            advisor_note: note,
          }],
        });
        toast({ title: 'המסמך נדחה', description: 'נשלח מייל ללקוח עם ההערה' });
      } catch (err: any) {
        console.error('Failed to send rejection email:', err);
        toast({
          title: 'המסמך נדחה',
          description: 'אך שליחת המייל ללקוח נכשלה',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'המסמך נדחה',
        description: 'ללקוח אין כתובת מייל - לא נשלחה הודעה',
      });
    }
  };

  const handleSendReminder = async (personalMessage: string) => {
    if (!id || !caseData?.clients?.email) {
      toast({ 
        title: 'שגיאה', 
        description: 'ללקוח אין כתובת מייל',
        variant: 'destructive'
      });
      return;
    }

    const missingDocs = documents.filter(d => d.review_status === 'חסר' || d.review_status === 'לא תקין');

    setSendingReminder(true);
    try {
      const response = await invokeEdgeFunction('send-reminder-to-client', {
        clientName: caseData.clients.full_name,
        clientEmail: caseData.clients.email,
        caseTitle: caseData.title,
        portalToken: caseData.portal_token,
        personalMessage,
        advisorEmail: user?.email || '',
        advisorName: advisorName || '',
        missingDocs: missingDocs.map(d => ({
          doc_name: d.doc_name,
          review_status: d.review_status,
          due_date: d.due_date,
          advisor_note: d.advisor_note,
        })),
      });

      if (response?.error) {
        throw new Error(response.error.message || 'שגיאה בשליחת תזכורת');
      }

      // Update DB from frontend (edge function only sends email)
      await Promise.all([
        logCaseActivity(id, 'שליחת תזכורת', `תזכורת נשלחה ל-${caseData.clients.email}`),
        supabase.from('cases').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', id),
        supabase.from('email_logs').insert({
          advisor_id: caseData.advisor_id,
          case_id: id,
          client_id: caseData.client_id,
          email_type: 'תזכורת יומית' as const,
          to_email: caseData.clients.email,
          subject: `תזכורת: מסמכים חסרים לתיק ${caseData.title}`,
          body_preview: `מסמכים חסרים: ${missingDocs.map(d => d.doc_name).join(', ')}`
        }),
      ]);

      toast({ 
        title: 'התזכורת נשלחה בהצלחה', 
        description: `נשלח מייל ל-${caseData.clients.email} עם ${missingDocs.length} מסמכים חסרים`
      });
      setReminderDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({ 
        title: 'שגיאה בשליחת התזכורת', 
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleEditNote = async (docId: string, note: string) => {
    await supabase
      .from('case_documents')
      .update({ advisor_note: note || null })
      .eq('id', docId);
    fetchData();
    toast({ title: 'ההערה עודכנה' });
  };

  const handleRenameDoc = async (docId: string, newName: string) => {
    await supabase
      .from('case_documents')
      .update({ doc_name: newName })
      .eq('id', docId);
    fetchData();
    toast({ title: 'שם המסמך עודכן' });
  };

  const handleDeleteDocClick = (docId: string, docName: string) => {
    setDocToDelete({ id: docId, name: docName });
    setDeleteDocDialogOpen(true);
  };

  const handleDeleteDocConfirm = async () => {
    if (!docToDelete || !id) return;
    
    // Delete all uploads associated with this document first
    const docUploads = documents.find(d => d.id === docToDelete.id)?.uploads || [];
    for (const upload of docUploads) {
      const urlParts = upload.file_url.split('/documents/');
      const filePath = urlParts[1] ? decodeURIComponent(urlParts[1]) : null;
      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }
      await supabase.from('uploads').delete().eq('id', upload.id);
    }
    
    // Delete the document
    await supabase.from('case_documents').delete().eq('id', docToDelete.id);
    
    await logCaseActivity(id, 'מחיקת מסמך', `המסמך "${docToDelete.name}" נמחק`);
    
    toast({ title: 'המסמך נמחק' });
    setDeleteDocDialogOpen(false);
    setDocToDelete(null);
    fetchData();
  };

  // Categorize documents by document_type column
  const signatureDocs = useMemo(() => {
    return documents.filter(doc => (doc as any).document_type === 'signature');
  }, [documents]);

  const requestDocs = useMemo(() => {
    return documents.filter(doc => (doc as any).document_type !== 'signature');
  }, [documents]);

  const receivedDocs = useMemo(() => {
    return documents
      .filter(doc => {
        const hasClientUpload = doc.uploads?.some((u: Upload) => u.uploaded_by === 'לקוח');
        return hasClientUpload || doc.review_status === 'הועלה' || doc.review_status === 'תקין' || doc.review_status === 'נחתם';
      })
      .map(doc => {
        // For signature documents, only show client uploads (not the advisor's original PDF)
        if (doc.document_type === 'signature') {
          return {
            ...doc,
            uploads: (doc.uploads || []).filter((u: Upload) => u.uploaded_by === 'לקוח'),
          };
        }
        return doc;
      });
  }, [documents]);

  // Filtered documents based on search and status
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || doc.review_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [documents, searchTerm, statusFilter]);

  const filterDocs = (docs: DocumentWithUpload[]) => {
    return docs.filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || doc.review_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">טוען...</div>
      </AppLayout>
    );
  }

  if (!caseData) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">התיק לא נמצא</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/cases')}>
            חזרה לתיקים
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" onClick={() => navigate('/cases')} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            חזרה לתיקים
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <ReadyForSubmissionButton
              caseId={id!}
              caseTitle={caseData.title}
              documents={documents}
              onSuccess={fetchData}
            />
            <Button 
              variant="outline" 
              onClick={async () => {
                if (caseData) {
                  toast({ title: 'הדוח יורד...' });
                  await generateCaseReport({
                    caseTitle: caseData.title,
                    caseType: caseData.case_types?.name || '',
                    clientName: caseData.clients?.full_name || '',
                    clientEmail: caseData.clients?.email || undefined,
                    clientPhone: caseData.clients?.phone || undefined,
                    createdAt: caseData.created_at,
                    status: caseData.status,
                    documents: documents,
                  });
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              ייצוא דוח PDF
            </Button>
            <BulkDownloadButton documents={documents} caseTitle={caseData.title} />
          </div>
        </div>

        {/* Celebration Banner */}
        <CaseCompletionBanner documents={documents} />

        {/* Smart Case Status Badge */}
        <CaseStatusBadge documents={documents} />

        {/* Case Header Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">{caseData.title}</CardTitle>
              <p className="text-muted-foreground">
                {caseData.case_types?.name}
              </p>
            </div>
            <StatusBadge status={caseData.status} />
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Client Info */}
              <div className="space-y-3">
                <h3 className="font-semibold">פרטי לקוח</h3>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">שם:</span>
                    <span className="font-medium">{caseData.clients?.full_name}</span>
                  </p>
                  {caseData.clients?.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span dir="ltr">{caseData.clients.phone}</span>
                    </p>
                  )}
                  {caseData.clients?.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span dir="ltr">{caseData.clients.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Portal Link */}
              <div className="space-y-3">
                <h3 className="font-semibold">פורטל לקוח</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => setSendPortalLinkOpen(true)}
                    size="lg"
                    className="gap-2 bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all text-primary-foreground"
                  >
                    <Send className="h-5 w-5" />
                    שלח טופס מסמכים ללקוח
                  </Button>
                  <Button onClick={copyPortalLink} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    העתק קישור
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open(`/portal/${caseData.portal_token}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    צפה בטופס הלקוח
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={copyMasterPortalLink}
                  >
                    <Copy className="h-4 w-4" />
                    העתק קישור פורטל לקוח (צפייה)
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => caseData.client_id && window.open(`/client-portal/${caseData.client_id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    פתח פורטל לקוח (צפייה)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setReminderDialogOpen(true)}
                    disabled={!caseData.clients?.email}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    שלח תזכורת
                  </Button>
                </div>

                {/* Portal Password (auto = client ID) */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">אימות ת.ז.:</span>
                  <Input
                    type="text"
                    placeholder="ת.ז. הלקוח"
                    value={(caseData as any).portal_password || ''}
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      setCaseData((prev: any) => prev ? { ...prev, portal_password: val } : prev);
                      await supabase.from('cases').update({ portal_password: val } as any).eq('id', caseData.id);
                    }}
                    className="max-w-[180px] h-8 text-sm"
                    dir="ltr"
                  />
                  <span className="text-xs text-muted-foreground">
                    {(caseData as any).portal_password ? '🔒 מוגן בת.ז.' : '🔓 פתוח'}
                  </span>
                </div>

                {caseData.last_reminder_sent_at && (
                  <p className="text-xs text-muted-foreground">
                    תזכורת אחרונה נשלחה: {new Date(caseData.last_reminder_sent_at).toLocaleDateString('he-IL')} בשעה {new Date(caseData.last_reminder_sent_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Management - 3 Tabs */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ניהול מסמכים ({documents.length})
              </CardTitle>
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-[180px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as ReviewStatusFilter)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="חסר">חסר</SelectItem>
                    <SelectItem value="הועלה">הועלה</SelectItem>
                    <SelectItem value="תקין">תקין</SelectItem>
                    <SelectItem value="לא תקין">לא תקין</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="requests" dir="rtl">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="requests" className="gap-2">
                  <UploadIcon className="h-4 w-4" />
                  מסמכים נדרשים ({requestDocs.length})
                </TabsTrigger>
                <TabsTrigger value="signatures" className="gap-2">
                  <PenTool className="h-4 w-4" />
                  מסמכים לחתימה ({signatureDocs.length})
                </TabsTrigger>
                <TabsTrigger value="received" className="gap-2">
                  <Inbox className="h-4 w-4" />
                  קבצים שהתקבלו ({receivedDocs.length})
                </TabsTrigger>
                <TabsTrigger value="banker" className="gap-2">
                  <Landmark className="h-4 w-4" />
                  שליחה לאיש קשר
                </TabsTrigger>
                <TabsTrigger value="finance" className="gap-2">
                  💰 חיובים וזמן
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Request Documents */}
              <TabsContent value="requests">
                <div className="flex justify-end mb-3">
                  <Button onClick={() => setAddUploadDocOpen(true)} size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    הוסף מסמך נדרש
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>שם מסמך</TableHead>
                          <TableHead>נדרש</TableHead>
                          <TableHead>תאריך יעד</TableHead>
                          <TableHead>נשלח ללקוח</TableHead>
                          <TableHead>נשלח</TableHead>
                          <TableHead>קובץ</TableHead>
                          <TableHead>סטטוס בדיקה</TableHead>
                          <TableHead className="min-w-[120px]">אישור מסמך</TableHead>
                          <TableHead>הערה ללקוח</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext items={filterDocs(requestDocs).map(d => d.id)} strategy={verticalListSortingStrategy}>
                          {filterDocs(requestDocs).length === 0 ? (
                            <TableRow>
                               <td colSpan={10} className="text-center py-8 text-muted-foreground">
                                {searchTerm || statusFilter !== 'all' ? 'לא נמצאו מסמכים' : 'אין מסמכים נדרשים — הוסף מסמך חדש'}
                              </td>
                            </TableRow>
                          ) : (
                            filterDocs(requestDocs).map((doc) => (
                              <DraggableDocumentRow key={doc.id} doc={doc} onApprove={handleApprove} onReject={setReviewDoc} onDelete={handleDeleteDocClick} onViewFiles={setFilesDialogDoc} onEditNote={handleEditNote} onRename={handleRenameDoc} onAdvisorUpload={setAdvisorUploadDoc} previewMode={previewMode} />
                            ))
                          )}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </TabsContent>

              {/* Tab 2: Signature Documents */}
              <TabsContent value="signatures">
                <div className="flex justify-end mb-3">
                  <Button onClick={() => setAddSignatureDocOpen(true)} size="sm" className="gap-2">
                    <PenTool className="h-4 w-4" />
                    הוסף מסמך לחתימה
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>שם מסמך</TableHead>
                          <TableHead>נדרש</TableHead>
                          <TableHead>תאריך יעד</TableHead>
                          <TableHead>נשלח ללקוח</TableHead>
                          <TableHead>נשלח</TableHead>
                          <TableHead>קובץ</TableHead>
                          <TableHead>סטטוס בדיקה</TableHead>
                          <TableHead className="min-w-[120px]">אישור מסמך</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext items={filterDocs(signatureDocs).map(d => d.id)} strategy={verticalListSortingStrategy}>
                          {filterDocs(signatureDocs).length === 0 ? (
                            <TableRow>
                               <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                {searchTerm || statusFilter !== 'all' ? 'לא נמצאו מסמכים' : 'אין מסמכים לחתימה — הוסף מסמך חדש'}
                              </td>
                            </TableRow>
                          ) : (
                            filterDocs(signatureDocs).map((doc) => (
                              <DraggableDocumentRow key={doc.id} doc={doc} onApprove={handleApprove} onReject={setReviewDoc} onDelete={handleDeleteDocClick} onViewFiles={setFilesDialogDoc} onEditNote={handleEditNote} onRename={handleRenameDoc} onUploadSignaturePdf={setUploadSignaturePdfDoc} previewMode={previewMode} />
                            ))
                          )}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </TabsContent>

              {/* Tab 3: Received Files */}
              <TabsContent value="received">
                <div className="overflow-x-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>שם מסמך</TableHead>
                          <TableHead>נדרש</TableHead>
                          <TableHead>תאריך יעד</TableHead>
                          <TableHead>נשלח ללקוח</TableHead>
                          <TableHead>נשלח</TableHead>
                          <TableHead>קובץ</TableHead>
                          <TableHead>סטטוס בדיקה</TableHead>
                          <TableHead className="min-w-[120px]">אישור מסמך</TableHead>
                          <TableHead>הערה ללקוח</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext items={filterDocs(receivedDocs).map(d => d.id)} strategy={verticalListSortingStrategy}>
                          {filterDocs(receivedDocs).length === 0 ? (
                            <TableRow>
                              <td colSpan={10} className="text-center py-8 text-muted-foreground">
                                {searchTerm || statusFilter !== 'all' ? 'לא נמצאו מסמכים' : 'טרם התקבלו קבצים מהלקוח'}
                              </td>
                            </TableRow>
                          ) : (
                            filterDocs(receivedDocs).map((doc) => (
                              <DraggableDocumentRow key={doc.id} doc={doc} onApprove={handleApprove} onReject={setReviewDoc} onDelete={handleDeleteDocClick} onViewFiles={setFilesDialogDoc} onEditNote={handleEditNote} onRename={handleRenameDoc} previewMode={previewMode} />
                            ))
                          )}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </TabsContent>

              {/* Tab 4: Send to Banker */}
              <TabsContent value="banker">
                <SendToBankerTab
                  caseId={id!}
                  caseTitle={caseData.title}
                  documents={documents}
                  advisorName={advisorName || user?.email || ''}
                />
              </TabsContent>

              <TabsContent value="finance">
                <div className="space-y-4">
                  <CaseTimerWidget
                    caseId={id!}
                    clientId={caseData.client_id}
                    timerMode={timerMode}
                    onChange={() => setFinanceRefresh((n) => n + 1)}
                  />
                  <CaseFinancePanel
                    caseId={id!}
                    clientId={caseData.client_id}
                    hourlyRate={hourlyRate}
                    refreshKey={financeRefresh}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <CaseActivityTimeline caseId={id!} caseTitle={caseData.title} />
      </div>

      {reviewDoc && (
        <DocumentReviewDialog
          open={!!reviewDoc}
          onOpenChange={() => setReviewDoc(null)}
          onReject={(note) => handleReject(reviewDoc.id, note)}
          docName={reviewDoc.doc_name}
        />
      )}

      <AddUploadDocumentDialog
        open={addUploadDocOpen}
        onOpenChange={setAddUploadDocOpen}
        caseId={id!}
        portalToken={caseData?.portal_token}
        clientEmail={caseData?.clients?.email || undefined}
        clientName={caseData?.clients?.full_name || undefined}
        caseTitle={caseData?.title || undefined}
        onSuccess={fetchData}
      />

      <AddSignatureDocumentDialog
        open={addSignatureDocOpen}
        onOpenChange={setAddSignatureDocOpen}
        caseId={id!}
        portalToken={caseData?.portal_token}
        clientEmail={caseData?.clients?.email || undefined}
        clientName={caseData?.clients?.full_name || undefined}
        caseTitle={caseData?.title || undefined}
        onSuccess={fetchData}
      />

      {caseData && (
        <SendReminderDialog
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          documents={documents}
          clientName={caseData.clients?.full_name || ''}
          clientEmail={caseData.clients?.email || ''}
          onSend={handleSendReminder}
          sending={sendingReminder}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDocDialogOpen}
        onOpenChange={setDeleteDocDialogOpen}
        onConfirm={handleDeleteDocConfirm}
        title="מחיקת מסמך"
        description={`האם אתה בטוח שברצונך למחוק את המסמך "${docToDelete?.name}"? כל הקבצים שהועלו יימחקו גם כן.`}
      />

      <SendPortalLinkDialog
        open={sendPortalLinkOpen}
        onOpenChange={setSendPortalLinkOpen}
        caseId={id!}
        portalToken={caseData.portal_token}
        clientEmail={caseData.clients?.email || undefined}
        clientName={caseData.clients?.full_name}
        caseTitle={caseData.title}
        onComplete={() => {}}
      />

      {filesDialogDoc && (
        <DocumentFilesDialog
          open={!!filesDialogDoc}
          onOpenChange={() => setFilesDialogDoc(null)}
          docName={filesDialogDoc.doc_name}
          uploads={filesDialogDoc.uploads}
          previewMode={previewMode}
          isSignatureDoc={filesDialogDoc.document_type === 'signature'}
        />
       )}

      <UploadSignaturePdfDialog
        open={!!uploadSignaturePdfDoc}
        onOpenChange={() => setUploadSignaturePdfDoc(null)}
        document={uploadSignaturePdfDoc}
        onSuccess={fetchData}
      />

      <AdvisorUploadDialog
        open={!!advisorUploadDoc}
        onOpenChange={() => setAdvisorUploadDoc(null)}
        document={advisorUploadDoc ? { id: advisorUploadDoc.id, doc_name: advisorUploadDoc.doc_name, case_id: advisorUploadDoc.case_id } : null}
        onSuccess={fetchData}
      />
    </AppLayout>
  );
});

export default CaseDetails;
