import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad } from './SignaturePad';
import { 
  FileText, 
  PenTool, 
  Check, 
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  CreditCard,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { embedSignatureInPdf, getSignedFileName } from '@/lib/pdfSignature';
import { useToast } from '@/hooks/use-toast';
import { validateIsraeliId } from '@/lib/israeliIdValidation';

interface SignatureDocumentCardProps {
  docId: string;
  docName: string;
  required: boolean;
  reviewStatus: string;
  advisorNote?: string | null;
  declarationStatement?: string | null;
  fileUrl?: string;
  fileName?: string;
  caseId: string;
  clientName: string;
  clientIdNumber?: string;
  clientSignedUrl?: string; // URL of the signed PDF uploaded by client
  onSignComplete: () => void;
}

export function SignatureDocumentCard({
  docId,
  docName,
  required,
  reviewStatus,
  advisorNote,
  declarationStatement,
  fileUrl,
  fileName,
  caseId,
  clientName,
  clientIdNumber,
  clientSignedUrl,
  onSignComplete,
}: SignatureDocumentCardProps) {
  const { toast } = useToast();

  console.log('SignatureDocumentCard render:', { docId, docName, fileUrl: !!fileUrl, fileName, reviewStatus, clientSignedUrl: !!clientSignedUrl });

  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Signer details state - pre-fill from client data
  const [fullName, setFullName] = useState(clientName || '');
  const [idNumber, setIdNumber] = useState(clientIdNumber || '');
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [idNumberTouched, setIdNumberTouched] = useState(false);
  const [showSignerForm, setShowSignerForm] = useState(false);

  // Keep form synced with case client details (but don't override user edits)
  useEffect(() => {
    if (!fullNameTouched) setFullName(clientName || '');
  }, [clientName, fullNameTouched]);

  useEffect(() => {
    if (!idNumberTouched) setIdNumber(clientIdNumber || '');
  }, [clientIdNumber, idNumberTouched]);

  // For signature documents, always treat as PDF (that's the only format advisors upload)
  const isPdf = Boolean(fileName?.toLowerCase().endsWith('.pdf')) || Boolean(fileUrl);
  // Document is fully approved by advisor
  const isApproved = reviewStatus === 'תקין';
  // Document was signed by client (has clientSignedUrl OR status is 'נחתם') but pending advisor review
  const isSigned = !!clientSignedUrl || reviewStatus === 'נחתם';
  // Needs signature if advisor uploaded a file and client hasn't signed yet
  const needsSignature = Boolean(fileUrl) && isPdf && !isSigned && !isApproved;

  const signerSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(2, 'נא להזין שם מלא').max(100, 'שם ארוך מדי'),
        idNumber: z
          .string()
          .trim()
          .regex(/^\d{5,9}$/, 'נא להזין תעודת זהות תקינה (5-9 ספרות)')
          .refine(
            (val) => validateIsraeliId(val),
            { message: 'מספר תעודת זהות לא תקין - ספרת ביקורת שגויה' }
          ),
      }),
    []
  );

  const validation = useMemo(
    () => signerSchema.safeParse({ fullName, idNumber }),
    [signerSchema, fullName, idNumber]
  );

  const isFormValid = validation.success;

  const handleStartSigning = () => {
    setShowPreview(true);
    setShowSignerForm(true);
  };

  const handleContinueToSignature = () => {
    if (!validation.success) {
      toast({
        title: 'נא למלא פרטים תקינים',
        description: validation.error.issues[0]?.message || 'נא לבדוק את הפרטים',
        variant: 'destructive',
      });
      return;
    }
    setShowSignaturePad(true);
  };

  const handleSign = async (signatureDataUrl: string) => {
    if (!fileUrl || !fileName) {
      toast({
        title: 'שגיאה',
        description: 'חסרים פרטי המסמך',
        variant: 'destructive',
      });
      return;
    }
    
    setSigning(true);
    console.log('SignatureDocumentCard: Starting signature process for doc:', docId);
    
    try {
      // Preflight: validate IDs to avoid invalid storage keys / bad updates
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(caseId) || !uuidRegex.test(docId)) {
        throw new Error('מזהי מסמך/תיק לא תקינים (UUID)');
      }

      // Step 1: Generate the signed PDF with declaration page
      console.log('SignatureDocumentCard: Generating signed PDF...');
      let signedPdfBlob: Blob;
      
      try {
        signedPdfBlob = await embedSignatureInPdf(
          fileUrl, 
          signatureDataUrl,
          {
            fullName: fullName.trim(),
            idNumber: idNumber.trim(),
            declarationStatement: declarationStatement || undefined,
          }
        );
        console.log('SignatureDocumentCard: PDF generated, size:', signedPdfBlob.size);
      } catch (pdfError: any) {
        console.error('SignatureDocumentCard: PDF generation failed:', pdfError);
        throw new Error(`שגיאה ביצירת המסמך החתום: ${pdfError.message}`);
      }
      
      // Step 2: Generate sanitized filename
      const signedFileName = getSignedFileName(fileName);
      const timestamp = Date.now();
      const storagePath = `${caseId}/${docId}/${timestamp}_${signedFileName}`;
      console.log('SignatureDocumentCard: Uploading to:', storagePath);
      
      // Step 3: Upload signed PDF to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(storagePath, signedPdfBlob, {
          contentType: 'application/pdf',
          upsert: false, // Create new file, don't overwrite
        });

      if (uploadError) {
        console.error('SignatureDocumentCard: Storage upload failed:', uploadError);
        throw new Error(`שגיאה בהעלאת הקובץ לשרת: ${uploadError.message}`);
      }
      
      console.log('SignatureDocumentCard: Upload successful:', uploadData?.path);

      // Step 4: Get public URL for the uploaded file
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('שגיאה בקבלת כתובת הקובץ החתום');
      }
      
      console.log('SignatureDocumentCard: Public URL obtained:', urlData.publicUrl);

      // Step 5: Create upload record in database
      const { data: newUpload, error: uploadRecordError } = await supabase
        .from('uploads')
        .insert({
          case_document_id: docId,
          case_id: caseId,
          file_url: urlData.publicUrl,
          file_name: signedFileName,
          file_type: 'application/pdf',
          uploaded_by: 'לקוח',
        })
        .select('id')
        .single();
      
      if (uploadRecordError) {
        console.error('SignatureDocumentCard: Upload record insert failed:', uploadRecordError);
        throw new Error(`שגיאה ברישום הקובץ: ${uploadRecordError.message}`);
      }
      
      console.log('SignatureDocumentCard: Upload record created:', newUpload?.id);

      // Step 6: Update document status to 'נחתם' (signed, pending advisor review)
      // CRITICAL: Do NOT set to 'תקין' - that requires manual advisor approval
      const { error: docUpdateError } = await supabase
        .from('case_documents')
        .update({ 
          review_status: 'נחתם', // Signed but pending advisor approval
          sent_status: 'נשלח',
          last_upload_id: newUpload?.id || null,
        })
        .eq('id', docId);
      
      if (docUpdateError) {
        console.error('SignatureDocumentCard: Document status update failed:', docUpdateError);
        throw new Error(`שגיאה בעדכון סטטוס המסמך: ${docUpdateError.message}`);
      }
      
      console.log('SignatureDocumentCard: Document status updated to נחתם (pending advisor review)');

      // Step 7: Update case activity timestamp
      await supabase
        .from('cases')
        .update({ last_client_activity_at: new Date().toISOString() })
        .eq('id', caseId);

      // Log activity - use 'העלאת מסמך' which is a valid enum value
      await supabase.from('case_activity_log').insert({
        case_id: caseId,
        action_type: 'העלאת מסמך',
        description: `הלקוח ${fullName} חתם דיגיטלית על המסמך "${docName}"`,
      });

      // Note: Advisor notification is NOT sent here.
      // It will be sent when the client clicks "Send Documents to Advisor" button.

      // Success!
      toast({
        title: 'המסמך נחתם בהצלחה! ✍️',
        description: 'החתימה נשמרה והיועץ קיבל התראה',
      });

      setShowSignaturePad(false);
      setShowSignerForm(false);
      onSignComplete();
      
    } catch (error: any) {
      console.error('SignatureDocumentCard: Signature process failed:', error);
      toast({
        title: 'שגיאה בחתימה',
        description: error.message || 'אירעה שגיאה לא צפויה',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  // Document is fully approved by advisor
  if (isApproved) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {docName}
                {required && <span className="text-destructive text-xs">*נדרש</span>}
              </h3>
              <p className="text-sm text-success">המסמך נחתם ואושר ✓</p>
            </div>
            {fileUrl && (
              <Button variant="ghost" size="sm" asChild className="gap-2">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  צפה
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Document was signed by client, pending advisor review
  if (isSigned) {
    return (
      <Card className="border-info/30 bg-info/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-info flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {docName}
                {required && <span className="text-destructive text-xs">*נדרש</span>}
              </h3>
              <p className="text-sm text-info">נחתם - ממתין לאישור יועץ</p>
            </div>
            {clientSignedUrl && (
              <Button variant="ghost" size="sm" asChild className="gap-2">
                <a href={clientSignedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  צפה במסמך החתום
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No file uploaded by advisor yet
  if (!fileUrl) {
    return (
      <Card className="border-2 border-muted">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {docName}
                {required && <span className="text-destructive text-xs">*נדרש</span>}
              </h3>
              <p className="text-sm text-muted-foreground">ממתין להעלאת מסמך על ידי היועץ</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${needsSignature ? 'border-primary/40 bg-primary/5' : 'border-muted'}`}>
      <CardContent className="pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              needsSignature ? 'bg-primary' : 'bg-muted'
            }`}>
              {needsSignature ? (
                <PenTool className="h-5 w-5 text-white" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-medium flex items-center gap-2">
                {docName}
                {required && <span className="text-destructive text-xs">*נדרש</span>}
              </h3>
              <p className="text-sm text-muted-foreground">
                {needsSignature ? 'ממתין לחתימה שלך' : 'צפייה במסמך'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'הסתר' : 'צפה במסמך'}
            </Button>
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* PDF Preview - use Google Docs Viewer via iframe to bypass sandbox restrictions */}
        {showPreview && fileUrl && (
          <div className="rounded-lg overflow-hidden border bg-white">
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              className="w-full h-[400px] md:h-[500px]"
              title={`תצוגה מקדימה: ${docName}`}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        )}

        {/* Advisor note */}
        {advisorNote && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{advisorNote}</span>
            </p>
          </div>
        )}

        {/* Signature area */}
        {needsSignature && (
          <>
            {!showSignerForm ? (
              <Button
                onClick={handleStartSigning}
                className="w-full gap-2"
                size="lg"
              >
                <PenTool className="h-5 w-5" />
                לחץ לחתימה על המסמך
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="p-3 bg-primary/10 rounded-lg text-center">
                  <p className="text-sm font-medium text-primary">
                    קרא את המסמך למעלה, מלא את הפרטים וחתום למטה
                  </p>
                </div>

                {/* Signer Details Form */}
                <Card className="border-2 border-primary/20">
                  <CardContent className="pt-4 space-y-4">
                    <h4 className="font-semibold text-primary flex items-center gap-2">
                      <User className="h-4 w-4" />
                      פרטי החותם
                    </h4>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="flex items-center gap-1">
                          שם מלא
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => {
                              setFullNameTouched(true);
                              setFullName(e.target.value);
                            }}
                            placeholder="הזן שם מלא"
                            className="pr-10"
                            dir="rtl"
                          />
                        </div>
                        {fullNameTouched && !validation.success && validation.error.issues.find(i => i.path[0] === 'fullName') && (
                          <p className="text-xs text-destructive">{validation.error.issues.find(i => i.path[0] === 'fullName')?.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="idNumber" className="flex items-center gap-1">
                          תעודת זהות
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="idNumber"
                            value={idNumber}
                            onChange={(e) => {
                              setIdNumberTouched(true);
                              setIdNumber(e.target.value);
                            }}
                            placeholder="הזן מספר ת.ז."
                            className="pr-10"
                            dir="ltr"
                            maxLength={9}
                          />
                        </div>
                        {idNumberTouched && !validation.success && validation.error.issues.find(i => i.path[0] === 'idNumber') && (
                          <p className="text-xs text-destructive">{validation.error.issues.find(i => i.path[0] === 'idNumber')?.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Date field - auto filled */}
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>תאריך:</strong> {new Date().toLocaleDateString('he-IL')} בשעה {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Signature Pad or Continue Button */}
                {!showSignaturePad ? (
                  <Button
                    onClick={handleContinueToSignature}
                    className="w-full gap-2"
                    size="lg"
                    disabled={!isFormValid}
                  >
                    <PenTool className="h-5 w-5" />
                    המשך לחתימה
                  </Button>
                ) : (
                  <SignaturePad onSign={handleSign} disabled={signing} />
                )}
              </div>
            )}
          </>
        )}

        {/* Loading overlay */}
        {signing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">מעבד את החתימה...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
