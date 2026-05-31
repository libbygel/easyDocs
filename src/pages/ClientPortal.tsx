import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { createPortalClient } from '@/lib/supabaseClient';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';

import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Send, CheckCircle, PenTool, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClientProgressHeader } from '@/components/portal/ClientProgressHeader';
import { DocumentStatusCard } from '@/components/portal/DocumentStatusCard';
import { SignatureDocumentCard } from '@/components/portal/SignatureDocumentCard';
import { ALLOWED_DOCUMENT_EXTENSIONS, validateUploadFile } from '@/lib/uploadValidation';

interface DocUploads {
  docId: string;
  docName: string;
  files: { id: string; fileName: string; fileUrl: string }[];
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const supabase = useMemo(() => createPortalClient(token || ''), [token]);
  const [searchParams] = useSearchParams();
  const readOnly = searchParams.get('view') === '1';
  const [caseData, setCaseData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, DocUploads>>(new Map());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const { toast } = useToast();

  const fetchData = async (bypassPasswordCheck = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // First fetch case to get ID
      const { data: caseRes, error: caseError } = await supabase
        .from('cases')
        .select(`
          *,
          clients!cases_client_id_fkey (*),
          case_types!cases_case_type_id_fkey (*)
        `)
        .eq('portal_token', token)
        .eq('portal_enabled', true)
        .maybeSingle();

      if (caseError) {
        console.error('ClientPortal: failed to fetch case by token', caseError);
      }

      if (!caseRes) {
        setCaseData(null);
        setDocuments([]);
        setLoading(false);
        return;
      }

      // Check if password protection is enabled
      if (caseRes.portal_password && !authenticated && !bypassPasswordCheck) {
        setCaseData(caseRes);
        setPasswordRequired(true);
        setLoading(false);
        return;
      }

      setCaseData(caseRes);

      // Parallel fetch for documents and uploads
      const [docsResult, uploadsResult] = await Promise.all([
        supabase
          .from('case_documents')
          .select('*')
          .eq('case_id', caseRes.id)
          .order('display_order'),
        
        supabase
          .from('uploads')
          .select('*')
          .eq('case_id', caseRes.id)
          .order('created_at')
      ]);

      if (docsResult.error) {
        console.error('ClientPortal: failed to fetch case_documents', docsResult.error);
        toast({
          title: 'בעיה זמנית בטעינת רשימת המסמכים',
          description: 'המערכת מציגה כרגע את הקבצים שהועלו. אנא נסו לרענן בעוד רגע.',
          variant: 'destructive',
        });
      }

      if (uploadsResult.error) {
        console.error('ClientPortal: failed to fetch uploads', uploadsResult.error);
        toast({
          title: 'בעיה זמנית בטעינת קבצים',
          description: 'ייתכן שחלק מהקבצים לא יוצגו כעת. נסו לרענן בעוד רגע.',
          variant: 'destructive',
        });
      }

      // Build uploads map efficiently
      const uploadsByDoc = new Map<string, any[]>();
      (uploadsResult.data || []).forEach((u: any) => {
        const existing = uploadsByDoc.get(u.case_document_id) || [];
        existing.push(u);
        uploadsByDoc.set(u.case_document_id, existing);
      });

      // Fallback: if the document list is unexpectedly empty but uploads exist,
      // derive a visible document list from the uploaded files so the client
      // still sees the advisor's work instead of a misleading 0/0 state.
      const rawDocs = docsResult.data || [];
      const sourceDocs = rawDocs.length > 0 ? rawDocs : Array.from(uploadsByDoc.entries()).map(([docId, docUploads]) => {
        const firstUpload = docUploads[0];
        const baseName = String(firstUpload?.file_name || 'מסמך').replace(/\.[^/.]+$/, '').trim() || 'מסמך';

        return {
          id: docId,
          doc_name: baseName,
          required: true,
          review_status: 'הועלה',
          document_type: 'request',
          uploads: docUploads,
          isSignatureDoc: false,
          advisorUpload: docUploads.find((u: any) => u.uploaded_by === 'יועץ'),
          clientUpload: docUploads.find((u: any) => u.uploaded_by === 'לקוח'),
        };
      });

      // Merge and process documents
      const mergedDocs = sourceDocs.map((doc: any) => {
        const docUploads = uploadsByDoc.get(doc.id) || [];
        const advisorUpload = docUploads.find((u: any) => u.uploaded_by === 'יועץ');
        const isSignatureDoc = doc.document_type === 'signature';
        const clientUpload = docUploads.find((u: any) => u.uploaded_by === 'לקוח');
        
        return {
          ...doc,
          uploads: docUploads,
          isSignatureDoc,
          advisorUpload,
          clientUpload,
        };
      });

      setDocuments(mergedDocs);

      // Pre-populate uploaded files map
      const existingUploads = new Map<string, DocUploads>();
      mergedDocs.forEach((doc: any) => {
        const uploads = doc.uploads || [];
        if (uploads.length > 0) {
          existingUploads.set(doc.id, {
            docId: doc.id,
            docName: doc.doc_name,
            files: uploads.map((u: any) => ({
              id: u.id,
              fileName: u.file_name,
              fileUrl: u.file_url,
            })),
          });
        }
      });
      setUploadedFiles(existingUploads);
    } catch (err) {
      console.error('ClientPortal: unexpected error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime subscription for uploads
    if (token) {
      const channel = supabase
        .channel('portal-uploads')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'uploads',
          },
          () => {
            fetchData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'case_documents',
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [token]);

  const handleUpload = async (docId: string, docName: string, file: File) => {
    if (!caseData) return;

    const validationError = validateUploadFile(file, {
      allowedExtensions: ALLOWED_DOCUMENT_EXTENSIONS,
    });
    if (validationError) {
      toast({ title: 'קובץ לא תקין', description: validationError, variant: 'destructive' });
      return;
    }

    setUploading(docId);

    // Sanitize filename: remove Hebrew/special chars, use timestamp for uniqueness
    const ext = file.name.split('.').pop() || 'bin';
    const sanitizedName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
    const fileName = `${caseData.id}/${docId}/${sanitizedName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'שגיאה בהעלאה', description: uploadError.message, variant: 'destructive' });
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

    const { data: insertedUpload, error: insertError } = await supabase.from('uploads').insert({
      case_document_id: docId,
      case_id: caseData.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      uploaded_by: 'לקוח',
    }).select().single();

    if (insertError) {
      toast({ title: 'שגיאה בשמירה', description: insertError.message, variant: 'destructive' });
      setUploading(null);
      return;
    }

    const { error: docStatusError } = await supabase
      .from('case_documents')
      .update({ review_status: 'הועלה', sent_status: 'נשלח' })
      .eq('id', docId);

    if (docStatusError) {
      toast({ title: 'שגיאה בעדכון סטטוס מסמך', description: docStatusError.message, variant: 'destructive' });
      setUploading(null);
      return;
    }

    await supabase
      .from('cases')
      .update({ last_client_activity_at: new Date().toISOString() })
      .eq('id', caseData.id);

    // Log activity
    await supabase.from('case_activity_log').insert({
      case_id: caseData.id,
      action_type: 'העלאת מסמך',
      description: `הלקוח העלה את המסמך "${docName}"`,
    });

    // Notify advisor in real-time about the upload (in-app notification only).
    // Email is sent once per submission (when client clicks "send to advisor"),
    // not per individual document upload.
    try {
      const clientName = caseData?.clients?.full_name || 'לקוח';
      const caseTitle = caseData?.title || '';
      await supabase.from('notifications').insert({
        advisor_id: caseData.advisor_id,
        case_id: caseData.id,
        client_id: caseData.client_id,
        type: 'מסמך_התקבל',
        title: `${clientName} העלה מסמך - ${caseTitle}`,
        message: `הלקוח ${clientName} העלה את המסמך "${docName}" לתיק "${caseTitle}"`,
      });
    } catch (notifyErr) {
      console.warn('[ClientPortal] upload notify failed:', notifyErr);
    }

    // Update local state immediately (don't wait for realtime)
    setUploadedFiles(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(docId);
      const newFile = { id: insertedUpload.id, fileName: file.name, fileUrl: urlData.publicUrl };
      
      if (existing) {
        newMap.set(docId, {
          ...existing,
          files: [...existing.files, newFile],
        });
      } else {
        newMap.set(docId, {
          docId,
          docName,
          files: [newFile],
        });
      }
      return newMap;
    });

    toast({ title: 'הקובץ הועלה בהצלחה!' });
    setUploading(null);
  };

  const handleDeleteFile = async (uploadId: string, docId: string, fileUrl: string) => {
    setDeleting(uploadId);
    
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/documents/');
      const filePath = urlParts[1] ? decodeURIComponent(urlParts[1]) : null;
      
      // Delete from storage
      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }

      // Delete upload record
      await supabase.from('uploads').delete().eq('id', uploadId);

      // Check if there are remaining uploads for this document
      const { data: remainingUploads } = await supabase
        .from('uploads')
        .select('id')
        .eq('case_document_id', docId);

      // If no more uploads, reset document status
      if (!remainingUploads || remainingUploads.length === 0) {
        await supabase
          .from('case_documents')
          .update({ review_status: 'חסר' })
          .eq('id', docId);
      }

      // Update local state to reflect deletion immediately
      setUploadedFiles(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(docId);
        if (existing) {
          const updatedFiles = existing.files.filter(f => f.id !== uploadId);
          if (updatedFiles.length === 0) {
            newMap.delete(docId);
          } else {
            newMap.set(docId, { ...existing, files: updatedFiles });
          }
        }
        return newMap;
      });

      toast({ title: 'הקובץ נמחק בהצלחה' });
    } catch (error: any) {
      toast({ 
        title: 'שגיאה במחיקה', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
    
    setDeleting(null);
  };

  const handleOpenFile = async (fileUrl: string) => {
    try {
      const urlParts = fileUrl.split('/documents/');
      const filePath = urlParts[1] ? decodeURIComponent(urlParts[1]) : null;

      if (!filePath) {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 10);

      if (error || !data?.signedUrl) {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      toast({
        title: 'לא ניתן לפתוח את הקובץ',
        description: error?.message || 'אירעה שגיאה בפתיחת המסמך',
        variant: 'destructive',
      });
    }
  };

  // Get list of documents ready for sending - only NEW/pending docs, not already approved
  const getReadyDocuments = () => {
    return documents.filter(doc => {
      // Skip already approved documents - advisor already handled them
      if (doc.review_status === 'תקין') return false;
      
      if (doc.isSignatureDoc) {
        return doc.review_status === 'נחתם';
      }
      // Only include docs with uploads that haven't been approved yet
      const docUploads = uploadedFiles.get(doc.id);
      return docUploads && docUploads.files.length > 0 && doc.review_status !== 'תקין';
    });
  };

  const handleSendClick = () => {
    const readyDocs = getReadyDocuments();
    if (readyDocs.length === 0) {
      toast({ 
        title: 'אין מסמכים חדשים לשליחה', 
        description: 'כל המסמכים כבר אושרו או שלא הועלו מסמכים חדשים', 
        variant: 'destructive' 
      });
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleSendToAdvisor = async () => {
    setConfirmDialogOpen(false);
    setSending(true);
    try {
      const readyDocs = getReadyDocuments();
      const documentNames = readyDocs.map(doc => doc.doc_name);
      const clientName = caseData?.clients?.full_name || 'לקוח';
      const caseTitle = caseData?.title || '';

      // Insert individual notifications per document
      let notificationErrors = 0;
      for (const docName of documentNames) {
        const { error: notifError } = await supabase.from('notifications').insert({
          advisor_id: caseData.advisor_id,
          case_id: caseData.id,
          type: 'מסמך_התקבל',
          title: `${clientName} - הועלה מסמך: ${docName}`,
          message: `לתיק: ${caseTitle}\nמסמך: ${docName}`,
        });
        if (notifError) {
          console.error('[ClientPortal] Notification insert failed:', notifError);
          notificationErrors++;
        } else {
          console.log('[ClientPortal] Notification inserted for:', docName);
        }
      }

      // Send advisor email via edge function.
      // Pass advisorId so the function can resolve the email with service role
      // (the portal anon client cannot read profiles via RLS).
      let emailSent = false;
      let emailSkippedReason = '';
      try {
        const advisorEmailFromCase = caseData?.profiles?.email || caseData?.advisor_email || undefined;
        const advisorNameFromCase = caseData?.profiles?.sender_display_name || caseData?.profiles?.name || undefined;

        const emailRes = await invokeEdgeFunction<{ success?: boolean; skipped?: string }>('send-documents-to-advisor', {
          mode: 'client-submission',
          clientName,
          caseTitle,
          documentNames,
          advisorId: caseData.advisor_id,   // looked up server-side
          advisorEmail: advisorEmailFromCase,
          advisorName: advisorNameFromCase,
          portalUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        });

        emailSkippedReason = emailRes?.skipped || '';
        emailSent = emailRes?.success !== false && !emailSkippedReason;
      } catch (emailErr) {
        emailSent = false;
        console.error('[ClientPortal] Email sending failed:', emailErr);
      }

      // Update case status
      const { error: caseUpdateError } = await supabase
        .from('cases')
        .update({ status: 'בבדיקה', last_client_activity_at: new Date().toISOString() })
        .eq('id', caseData.id);

      if (caseUpdateError) {
        console.error('[ClientPortal] Case update failed:', caseUpdateError);
      }

      if (notificationErrors === documentNames.length && documentNames.length > 0) {
        // All notifications failed
        toast({
          title: 'שגיאה בשליחה',
          description: 'לא ניתן היה לשלוח התראות ליועץ. נסה שוב.',
          variant: 'destructive',
        });
      } else {
        setSent(true);
        toast({
          title: 'המסמכים נשלחו בהצלחה!',
          description: notificationErrors > 0 
            ? `${documentNames.length - notificationErrors} מתוך ${documentNames.length} התראות נשלחו`
            : (emailSent
              ? 'היועץ קיבל התראה במייל ובהתראות המערכת'
              : (emailSkippedReason
                ? 'היועץ קיבל התראה במערכת. המייל דולג לפי הגדרות ההתראות של היועץ'
                : 'היועץ קיבל התראה במערכת. שליחת מייל נכשלה - נסו שוב בעוד רגע')),
        });
      }
    } catch (error: any) {
      console.error('[ClientPortal] Submission error:', error);
      toast({
        title: 'שגיאה בשליחה',
        description: error?.message || 'שגיאה בלתי צפויה',
        variant: 'destructive',
      });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">הקישור לא תקף</h1>
            <p className="text-muted-foreground">הפורטל אינו זמין או שהקישור שגוי</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password gate
  if (passwordRequired && !authenticated) {
    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === caseData.portal_password) {
        setAuthenticated(true);
        setPasswordRequired(false);
        setPasswordError(false);
        // Re-fetch to load documents
        setLoading(true);
        fetchData(true);
      } else {
        setPasswordError(true);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold mb-1">טופס מסמכים</h1>
              <p className="text-muted-foreground text-sm">הזן את מספר תעודת הזהות שלך לאימות</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                placeholder="מספר תעודת זהות"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center tracking-widest"
                dir="ltr"
                autoFocus
              />
              {passwordError && (
                <p className="text-destructive text-sm text-center">תעודת זהות שגויה, נסה שוב</p>
              )}
              <Button type="submit" className="w-full">כניסה</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readyDocs = getReadyDocuments();
  const readyCount = readyDocs.length;

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-xl font-bold mb-2">המסמכים נשלחו בהצלחה!</h1>
            <p className="text-muted-foreground">
              {readyCount} מסמכים נשלחו ליועץ
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              תודה! היועץ יבדוק את המסמכים ויצור איתך קשר בהקדם.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Enhanced Progress Header */}
        <ClientProgressHeader
          caseTitle={caseData.title}
          clientName={caseData.clients?.full_name || ''}
          documents={documents}
          uploadedFiles={uploadedFiles}
        />

        {/* Signature Documents Section */}
        {documents.filter(doc => doc.isSignatureDoc).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">מסמכים לחתימה:</h2>
            </div>
            {documents
              .filter(doc => doc.isSignatureDoc)
              .map((doc) => (
                <div key={doc.id} className={readOnly ? 'pointer-events-none opacity-90' : ''}>
                  <SignatureDocumentCard
                    docId={doc.id}
                    docName={doc.doc_name}
                    required={doc.required}
                    reviewStatus={doc.review_status}
                    advisorNote={doc.advisor_note}
                    declarationStatement={doc.declaration_statement}
                    fileUrl={doc.advisorUpload?.file_url}
                    fileName={doc.advisorUpload?.file_name}
                    caseId={caseData.id}
                    clientName={caseData.clients?.full_name || ''}
                    clientIdNumber={caseData.clients?.id_number || ''}
                    clientSignedUrl={doc.clientUpload?.file_url}
                    supabaseClient={supabase}
                    onSignComplete={fetchData}
                  />
                </div>
              ))}
          </div>
        )}

        {/* Upload Documents Section */}
        {documents.filter(doc => !doc.isSignatureDoc).length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">מסמכים נדרשים:</h2>
            {documents
              .filter(doc => !doc.isSignatureDoc)
              .map((doc) => {
                const docUploads = uploadedFiles.get(doc.id);
                const files = docUploads?.files || [];
                
                return (
                  <DocumentStatusCard
                    key={doc.id}
                    docId={doc.id}
                    docName={doc.doc_name}
                    required={doc.required}
                    reviewStatus={doc.review_status}
                    advisorNote={doc.advisor_note}
                    uploadedFiles={files}
                    uploading={uploading === doc.id}
                    deleting={deleting}
                    onUpload={(file) => handleUpload(doc.id, doc.doc_name, file)}
                    onDelete={(uploadId, fileUrl) => handleDeleteFile(uploadId, doc.id, fileUrl)}
                    onOpenFile={handleOpenFile}
                    readOnly={readOnly}
                  />
                );
              })}
          </div>
        )}

        {/* Send Button */}
        {!readOnly && (
        <Card className="shadow-sm sticky bottom-4">
          <CardContent className="pt-4 pb-4">
            <Button 
              onClick={handleSendClick}
              disabled={sending || readyCount === 0}
              className="w-full gap-2"
              size="lg"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              שלח מסמכים חדשים ליועץ ({readyCount})
            </Button>
            {readyCount === 0 && uploadedFiles.size > 0 && (
              <p className="text-sm text-success text-center mt-2">
                ✓ כל המסמכים כבר נשלחו ואושרו
              </p>
            )}
            {uploadedFiles.size === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                יש להעלות לפחות מסמך אחד לפני השליחה
              </p>
            )}
          </CardContent>
        </Card>
        )}

        {readOnly && (
          <Card className="shadow-sm sticky bottom-4 border-info/40 bg-info/5">
            <CardContent className="pt-4 pb-4 text-center text-sm text-info font-medium">
              👁️ מצב צפייה בלבד — לא ניתן לבצע שינויים בתיק זה
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>אישור שליחת מסמכים ליועץ</DialogTitle>
            <DialogDescription>
              האם ברצונך לשלוח את המסמכים הבאים לבדיקת היועץ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {getReadyDocuments().map(doc => {
              const docUploads = uploadedFiles.get(doc.id);
              return (
                <div key={doc.id} className="border rounded-lg bg-muted/30 overflow-hidden">
                  <div className="flex items-center gap-2 p-2">
                    {doc.isSignatureDoc ? (
                      <PenTool className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="text-sm font-medium">{doc.doc_name}</span>
                    <span className="text-xs text-muted-foreground mr-auto">
                      {doc.isSignatureDoc ? 'נחתם' : 'הועלה'}
                    </span>
                  </div>
                  {/* Show uploaded files with delete option - for both regular and signature docs */}
                  {docUploads && docUploads.files.length > 0 && !doc.isSignatureDoc && (
                    <div className="border-t px-2 py-1 space-y-1">
                      {docUploads.files.map(file => (
                        <div key={file.id} className="flex items-center gap-2 text-xs group">
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          <button
                            type="button"
                            onClick={() => handleOpenFile(file.fileUrl)}
                            className="truncate flex-1 text-start text-primary hover:underline"
                            title={`פתח את ${file.fileName}`}
                          >
                            {file.fileName}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteFile(file.id, doc.id, file.fileUrl)}
                            disabled={deleting === file.id}
                          >
                            {deleting === file.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            שים לב: לאחר השליחה, היועץ יקבל התראה ויוכל להתחיל בטיפול בתיק שלך.
          </p>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSendToAdvisor} disabled={sending} className="flex-1 gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              כן, שלח כעת
            </Button>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              חזור לעריכה
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
