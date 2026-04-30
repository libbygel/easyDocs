import { Check, Clock, AlertCircle, Upload, FileText, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UploadedFile {
  id: string;
  fileName: string;
  fileUrl: string;
}

interface DocumentStatusCardProps {
  docId: string;
  docName: string;
  required: boolean;
  reviewStatus: string;
  advisorNote?: string | null;
  uploadedFiles: UploadedFile[];
  uploading: boolean;
  deleting: string | null;
  onUpload: (file: File) => void;
  onDelete: (uploadId: string, fileUrl: string) => void;
  readOnly?: boolean;
}

const statusConfig = {
  'תקין': {
    icon: Check,
    label: 'תקין',
    className: 'bg-success/10 text-success border-success/30',
    iconBg: 'bg-success',
  },
  'הועלה': {
    icon: Clock,
    label: 'בטיפול',
    className: 'bg-info/10 text-info border-info/30',
    iconBg: 'bg-info',
  },
  'לא תקין': {
    icon: AlertCircle,
    label: 'נדרש תיקון',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    iconBg: 'bg-destructive',
  },
  'חסר': {
    icon: FileText,
    label: 'ממתין להעלאה',
    className: 'bg-muted text-muted-foreground border-border',
    iconBg: 'bg-muted-foreground',
  },
};

export function DocumentStatusCard({
  docId,
  docName,
  required,
  reviewStatus,
  advisorNote,
  uploadedFiles,
  uploading,
  deleting,
  onUpload,
  onDelete,
  readOnly = false,
}: DocumentStatusCardProps) {
  const status = statusConfig[reviewStatus as keyof typeof statusConfig] || statusConfig['חסר'];
  const Icon = status.icon;
  const isUploaded = uploadedFiles.length > 0;
  const canUpload = !readOnly && reviewStatus !== 'תקין';

  return (
    <Card className={`shadow-sm transition-colors border ${status.className}`}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${status.iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium flex items-center gap-2">
                {docName}
                {required && <span className="text-destructive text-xs">*נדרש</span>}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{status.label}</p>
            </div>
          </div>
          {uploadedFiles.length > 0 && (
            <span className="text-xs bg-muted px-2 py-1 rounded-full">
              {uploadedFiles.length} קבצים
            </span>
          )}
        </div>

        {/* Advisor note */}
        {advisorNote && (
          <div className={`mb-3 p-3 rounded-lg border ${
            reviewStatus === 'לא תקין' 
              ? 'bg-destructive/5 border-destructive/20' 
              : 'bg-info/5 border-info/20'
          }`}>
            <p className={`text-sm flex items-start gap-2 ${
              reviewStatus === 'לא תקין' ? 'text-destructive' : 'text-info'
            }`}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{advisorNote}</span>
            </p>
          </div>
        )}

        {/* Uploaded files */}
        {isUploaded && (
          <div className="space-y-2 mb-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-2 p-2 bg-background rounded group">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{file.fileName}</span>
                {canUpload && !readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(file.id, file.fileUrl)}
                    disabled={deleting === file.id}
                  >
                    {deleting === file.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        {canUpload && (
          <Label htmlFor={`file-${docId}`} className="cursor-pointer block">
            <div className={`border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors ${
              isUploaded ? 'border-success/50 bg-success/5' : ''
            }`}>
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {reviewStatus === 'לא תקין' 
                      ? 'העלה קובץ מתוקן'
                      : isUploaded 
                        ? 'הוסף קובץ נוסף'
                        : 'לחץ להעלאת קובץ'}
                  </span>
                </>
              )}
            </div>
          </Label>
        )}
        <Input
          id={`file-${docId}`}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          disabled={uploading}
        />

        {/* Approved state */}
        {reviewStatus === 'תקין' && (
          <div className="mt-2 flex items-center gap-2 text-success text-sm">
            <Check className="h-4 w-4" />
            המסמך אושר - אין צורך בפעולה נוספת
          </div>
        )}
      </CardContent>
    </Card>
  );
}
