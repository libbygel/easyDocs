import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Archive } from 'lucide-react';
import { downloadFilesAsZip, getApprovedDocumentsForDownload } from '@/lib/bulkDownload';
import { useToast } from '@/hooks/use-toast';

interface Upload {
  file_name: string;
  file_url: string;
}

interface Document {
  doc_name: string;
  review_status: string;
  uploads?: Upload[];
}

interface BulkDownloadButtonProps {
  documents: Document[];
  caseTitle: string;
}

export function BulkDownloadButton({ documents, caseTitle }: BulkDownloadButtonProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const approvedFiles = getApprovedDocumentsForDownload(documents);
  const hasApprovedDocs = approvedFiles.length > 0;

  const handleDownload = async () => {
    if (!hasApprovedDocs) {
      toast({
        title: 'אין מסמכים להורדה',
        description: 'אין מסמכים מאושרים בתיק זה',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
    try {
      const sanitizedTitle = caseTitle.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_');
      const zipFileName = `${sanitizedTitle}_מסמכים_מאושרים.zip`;
      
      await downloadFilesAsZip(approvedFiles, zipFileName);
      
      toast({
        title: 'ההורדה הושלמה! 📁',
        description: `${approvedFiles.length} קבצים הורדו בהצלחה`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'שגיאה בהורדה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={!hasApprovedDocs || downloading}
      className="gap-2"
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
      הורד מסמכים מאושרים ({approvedFiles.length})
    </Button>
  );
}
