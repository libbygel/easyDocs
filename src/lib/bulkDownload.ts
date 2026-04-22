import JSZip from 'jszip';

interface DownloadFile {
  fileName: string;
  fileUrl: string;
}

/**
 * Downloads multiple files and creates a ZIP archive
 */
export async function downloadFilesAsZip(
  files: DownloadFile[],
  zipFileName: string
): Promise<void> {
  const zip = new JSZip();

  // Fetch all files in parallel
  const fetchPromises = files.map(async (file, index) => {
    try {
      const response = await fetch(file.fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch ${file.fileName}`);
      
      const blob = await response.blob();
      
      // Handle duplicate filenames by adding index
      let fileName = file.fileName;
      const existingFiles = Object.keys(zip.files);
      if (existingFiles.includes(fileName)) {
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        const base = fileName.substring(0, fileName.lastIndexOf('.'));
        fileName = `${base}_${index}${ext}`;
      }
      
      zip.file(fileName, blob);
    } catch (error) {
      console.error(`Error fetching file ${file.fileName}:`, error);
    }
  });

  await Promise.all(fetchPromises);

  // Check if any files were added
  if (Object.keys(zip.files).length === 0) {
    throw new Error('לא נמצאו קבצים להורדה');
  }

  // Generate ZIP and trigger download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Filters and prepares approved documents for download
 */
export function getApprovedDocumentsForDownload(
  documents: Array<{
    doc_name: string;
    review_status: string;
    uploads?: Array<{ file_name: string; file_url: string }>;
  }>
): DownloadFile[] {
  const files: DownloadFile[] = [];

  documents
    .filter(doc => doc.review_status === 'תקין')
    .forEach(doc => {
      const uploads = doc.uploads || [];
      uploads.forEach(upload => {
        files.push({
          fileName: upload.file_name,
          fileUrl: upload.file_url,
        });
      });
    });

  return files;
}
