export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
  'xls',
  'xlsx',
]);

export const ALLOWED_SIGNATURE_EXTENSIONS = new Set(['pdf']);

export type UploadKind = 'document' | 'signature';

export function getAllowedExtensions(kind: UploadKind): Set<string> {
  return kind === 'signature' ? ALLOWED_SIGNATURE_EXTENSIONS : ALLOWED_DOCUMENT_EXTENSIONS;
}

export function getExtension(nameOrPath: string): string {
  const candidate = nameOrPath.split('/').pop() ?? nameOrPath;
  const parts = candidate.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function isAllowedMime(mime: string | null, kind: UploadKind): boolean {
  if (!mime) return false;

  const normalized = mime.toLowerCase().trim();
  if (!normalized) return false;

  const common = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]);

  if (kind === 'signature') {
    return normalized === 'application/pdf';
  }

  return common.has(normalized);
}

export type MagicKind = 'pdf' | 'jpg' | 'png' | 'zip' | 'ole' | 'unknown';

export function detectMagicKind(bytes: Uint8Array): MagicKind {
  if (bytes.length >= 4) {
    // PDF: %PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'pdf';
    }

    // ZIP: PK\x03\x04 / PK\x05\x06 / PK\x07\x08
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      return 'zip';
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'jpg';
    }
  }

  if (bytes.length >= 8) {
    // PNG signature
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'png';
    }

    // OLE container (old doc/xls)
    if (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1
    ) {
      return 'ole';
    }
  }

  return 'unknown';
}

export function isMagicCompatibleWithExtension(ext: string, magic: MagicKind): boolean {
  if (ext === 'pdf') return magic === 'pdf';
  if (ext === 'jpg' || ext === 'jpeg') return magic === 'jpg';
  if (ext === 'png') return magic === 'png';
  if (ext === 'docx' || ext === 'xlsx') return magic === 'zip';
  if (ext === 'doc' || ext === 'xls') return magic === 'ole' || magic === 'zip';
  return false;
}
