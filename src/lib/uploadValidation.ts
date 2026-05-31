const MB = 1024 * 1024;

export const MAX_UPLOAD_SIZE_BYTES = 20 * MB;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
  'xls',
  'xlsx',
] as const;

export const ALLOWED_SIGNATURE_EXTENSIONS = ['pdf'] as const;

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

interface ValidateOptions {
  allowedExtensions: readonly string[];
  maxSizeBytes?: number;
}

export function validateUploadFile(file: File, options: ValidateOptions): string | null {
  const { allowedExtensions, maxSizeBytes = MAX_UPLOAD_SIZE_BYTES } = options;
  const ext = getFileExtension(file.name);

  if (!ext || !allowedExtensions.includes(ext)) {
    return `סוג קובץ לא נתמך. סוגים מותרים: ${allowedExtensions.join(', ')}`;
  }

  if (file.size <= 0) {
    return 'הקובץ ריק ולא ניתן להעלאה';
  }

  if (file.size > maxSizeBytes) {
    return `הקובץ גדול מדי. גודל מקסימלי: ${Math.round(maxSizeBytes / MB)}MB`;
  }

  return null;
}
