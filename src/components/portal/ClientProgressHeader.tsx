import { FileText, Check, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Document {
  id: string;
  review_status: string;
  required: boolean;
  isSignatureDoc?: boolean;
}

interface UploadedFile {
  id: string;
  fileName: string;
  fileUrl: string;
}

interface ClientProgressHeaderProps {
  caseTitle: string;
  clientName: string;
  documents: Document[];
  uploadedFiles: Map<string, { docId: string; docName: string; files: UploadedFile[] }>;
}

export function ClientProgressHeader({
  caseTitle,
  clientName,
  documents,
  uploadedFiles,
}: ClientProgressHeaderProps) {
  const totalDocs = documents.length;
  
  // Calculate actual progress: count documents that have client uploads or are signed
  // A signature doc counts as "uploaded" only when status is 'הועלה' or 'תקין' (signed by client)
  // A regular doc counts as "uploaded" when it has files in uploadedFiles map
  const actualUploadsCount = documents.filter(doc => {
    if (doc.isSignatureDoc) {
      // For signature docs: only count when client has actually signed (status 'נחתם' or 'תקין')
      // Having an advisor upload does NOT count - client must sign
      return doc.review_status === 'נחתם' || doc.review_status === 'תקין';
    } else {
      // For regular upload docs: count if client has uploaded files
      return uploadedFiles.has(doc.id);
    }
  }).length;
  
  const progress = totalDocs > 0 ? (actualUploadsCount / totalDocs) * 100 : 0;
  
  const validDocs = documents.filter(d => d.review_status === 'תקין').length;
  const rejectedDocs = documents.filter(d => d.review_status === 'לא תקין').length;
  // Pending = uploaded by client (waiting for advisor review) - exclude signature docs awaiting signature
  const pendingDocs = documents.filter(d => 
    (d.review_status === 'הועלה' || d.review_status === 'נחתם') && !d.isSignatureDoc
  ).length;
  // Signature docs that have been signed but pending advisor approval
  const signedDocs = documents.filter(d =>
    d.isSignatureDoc && d.review_status === 'נחתם'
  ).length;
  // Signature docs still awaiting client signature
  const awaitingSignature = documents.filter(d =>
    d.isSignatureDoc && !uploadedFiles.has(d.id) && d.review_status !== 'תקין' && d.review_status !== 'נחתם'
  ).length;
  const missingDocs = documents.filter(d => d.review_status === 'חסר').length;

  const allComplete = validDocs === totalDocs && totalDocs > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${
            allComplete ? 'bg-success' : 'bg-primary'
          }`}>
            {allComplete ? (
              <CheckCircle className="h-7 w-7 text-white" />
            ) : (
              <FileText className="h-7 w-7 text-primary-foreground" />
            )}
          </div>
        </div>
        <CardTitle className="text-xl">
          {allComplete ? 'כל המסמכים התקבלו!' : 'העלאת מסמכים לתיק'}
        </CardTitle>
        <p className="text-muted-foreground mt-2">{caseTitle}</p>
        {clientName && (
          <p className="text-sm text-muted-foreground">שלום, {clientName}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">נשלחו {actualUploadsCount} מתוך {totalDocs} מסמכים</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                allComplete ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {validDocs > 0 && (
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <span>{validDocs} אושרו</span>
            </div>
          )}
          {pendingDocs > 0 && (
            <div className="flex items-center gap-2 text-info">
              <Clock className="h-4 w-4" />
              <span>{pendingDocs} בבדיקת יועץ</span>
            </div>
          )}
          {signedDocs > 0 && (
            <div className="flex items-center gap-2 text-info">
              <Clock className="h-4 w-4" />
              <span>{signedDocs} נחתמו - בבדיקה</span>
            </div>
          )}
          {awaitingSignature > 0 && (
            <div className="flex items-center gap-2 text-primary">
              <Clock className="h-4 w-4" />
              <span>{awaitingSignature} ממתינים לחתימה</span>
            </div>
          )}
          {rejectedDocs > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{rejectedDocs} נדרש תיקון</span>
            </div>
          )}
          {missingDocs > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{missingDocs} ממתינים להעלאה</span>
            </div>
          )}
        </div>

        {allComplete && (
          <div className="mt-4 p-3 bg-success/10 rounded-lg text-center text-success text-sm">
            <CheckCircle className="h-5 w-5 inline-block ml-2" />
            תודה רבה! כל המסמכים התקבלו ואושרו.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
