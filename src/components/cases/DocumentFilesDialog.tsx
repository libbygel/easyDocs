import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, ExternalLink, FileText, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Upload } from '@/lib/supabase';

interface DocumentFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docName: string;
  uploads: Upload[];
  previewMode: 'new_tab' | 'modal';
  isSignatureDoc?: boolean;
}

function getGoogleViewerUrl(fileUrl: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}

export function DocumentFilesDialog({
  open,
  onOpenChange,
  docName,
  uploads,
  previewMode,
  isSignatureDoc = false,
}: DocumentFilesDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOriginalUrl, setPreviewOriginalUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // For signature docs, compute the single relevant upload
  const displayUploads = isSignatureDoc
    ? (() => {
        const clientUploads = uploads.filter(u => u.uploaded_by === 'לקוח');
        return clientUploads.length > 0 ? [clientUploads[clientUploads.length - 1]] : uploads;
      })()
    : uploads;

  // For signature docs, auto-open preview immediately
  useEffect(() => {
    if (open && isSignatureDoc && previewMode === 'modal' && displayUploads.length > 0) {
      const url = displayUploads[displayUploads.length - 1].file_url;
      handleView(url);
    }
    if (open && isSignatureDoc && previewMode === 'new_tab' && displayUploads.length > 0) {
      window.open(displayUploads[displayUploads.length - 1].file_url, '_blank');
      onOpenChange(false);
    }
  }, [open, isSignatureDoc]);

  const handleView = (url: string) => {
    if (previewMode === 'new_tab') {
      window.open(url, '_blank');
      return;
    }
    setLoadingPreview(true);
    setPreviewOriginalUrl(url);
    setPreviewUrl(getGoogleViewerUrl(url));
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewOriginalUrl(null);
    setLoadingPreview(false);
    if (isSignatureDoc) {
      onOpenChange(false);
    }
  };

  const handleDialogClose = (openState: boolean) => {
    if (!openState) {
      setPreviewUrl(null);
      setPreviewOriginalUrl(null);
    }
    onOpenChange(openState);
  };

  // For signature docs, skip the file list dialog entirely
  if (isSignatureDoc) {
    return (
      <>
        {loadingPreview && !previewUrl && (
          <Dialog open={true} onOpenChange={() => { closePreview(); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader className="sr-only">
                <DialogTitle>טוען...</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {previewUrl && (
          <Dialog open={!!previewUrl} onOpenChange={closePreview}>
            <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col">
              <DialogHeader className="sr-only">
                <DialogTitle>תצוגה מקדימה - {docName}</DialogTitle>
              </DialogHeader>
              <div className="w-full flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <span className="text-sm font-medium">{docName}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="gap-1">
                      <a href={previewOriginalUrl || ''} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        פתח בעמוד חדש
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 bg-muted/20">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="תצוגה מקדימה"
                    onLoad={() => setLoadingPreview(false)}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  // Regular (non-signature) documents: show file list
  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              קבצים עבור: {docName}
            </DialogTitle>
            <DialogDescription>צפייה בקבצים שהועלו</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין קבצים שהועלו</p>
            ) : (
              uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(upload.uploaded_at), 'dd/MM/yyyy HH:mm')}
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {upload.uploaded_by}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleView(upload.file_url)}
                      disabled={loadingPreview}
                    >
                      {loadingPreview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      צפייה
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={upload.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={closePreview}>
          <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col">
            <DialogHeader className="sr-only">
              <DialogTitle>תצוגה מקדימה</DialogTitle>
            </DialogHeader>
            <div className="w-full flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-sm text-muted-foreground">תצוגה מקדימה</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild className="gap-1">
                    <a href={previewOriginalUrl || ''} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      פתח בעמוד חדש
                    </a>
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 bg-muted/20">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="תצוגה מקדימה"
                  onLoad={() => setLoadingPreview(false)}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
