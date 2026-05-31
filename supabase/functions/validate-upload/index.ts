import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  MAX_UPLOAD_SIZE_BYTES,
  detectMagicKind,
  getAllowedExtensions,
  getExtension,
  isAllowedMime,
  isMagicCompatibleWithExtension,
  type UploadKind,
} from '../_shared/upload-validation.ts';
import { validateTextField } from '../_shared/input-validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ValidateUploadRequest {
  bucket: string;
  path: string;
  fileName?: string;
  providedContentType?: string | null;
  kind?: UploadKind;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const { bucket, path, fileName, providedContentType, kind = 'document' } =
      (await req.json()) as ValidateUploadRequest;

    const bucketValidation = validateTextField('bucket', bucket, { required: true, maxLength: 100 });
    const pathValidation = validateTextField('path', path, { required: true, maxLength: 500 });
    const fileNameValidation = validateTextField('fileName', fileName, { maxLength: 255 });
    const contentTypeValidation = validateTextField('providedContentType', providedContentType, { maxLength: 120 });

    if (!bucketValidation.ok || !pathValidation.ok || !fileNameValidation.ok || !contentTypeValidation.ok) {
      return jsonResponse({ success: false, error: 'Invalid text input' }, 400);
    }

    const safeBucket = bucketValidation.value;
    const safePath = pathValidation.value;
    const safeFileName = fileNameValidation.value;
    const safeProvidedContentType = contentTypeValidation.value || null;

    if (!safeBucket || !safePath) {
      return jsonResponse({ success: false, error: 'bucket and path are required' }, 400);
    }

    if (kind !== 'document' && kind !== 'signature') {
      return jsonResponse({ success: false, error: 'kind must be document or signature' }, 400);
    }

    const sourceName = safeFileName || safePath;
    const ext = getExtension(sourceName);
    const allowedExtensions = getAllowedExtensions(kind);
    const reasons: string[] = [];

    if (!ext || !allowedExtensions.has(ext)) {
      reasons.push(`invalid extension: ${ext || '(none)'}`);
    }

    if (safeProvidedContentType && !isAllowedMime(safeProvidedContentType, kind)) {
      reasons.push(`invalid content-type: ${safeProvidedContentType}`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: 'Missing Supabase service credentials' }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: fileBlob, error: downloadError } = await admin.storage.from(safeBucket).download(safePath);
    if (downloadError || !fileBlob) {
      return jsonResponse(
        {
          success: false,
          error: 'Failed to read file from storage',
          details: downloadError?.message || null,
        },
        400,
      );
    }

    const size = fileBlob.size;
    if (size <= 0) {
      reasons.push('empty file');
    }
    if (size > MAX_UPLOAD_SIZE_BYTES) {
      reasons.push(`file too large: ${size} bytes`);
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const magic = detectMagicKind(bytes.subarray(0, 16));
    if (!isMagicCompatibleWithExtension(ext, magic)) {
      reasons.push(`magic mismatch for extension ${ext}: detected ${magic}`);
    }

    const valid = reasons.length === 0;

    return jsonResponse({
      success: true,
      valid,
      bucket: safeBucket,
      path: safePath,
      kind,
      extension: ext,
      providedContentType: safeProvidedContentType,
      detectedMagic: magic,
      size,
      reasons,
    });
  } catch (error: any) {
    console.error('validate-upload error:', error);
    return jsonResponse(
      {
        success: false,
        error: error?.message || String(error),
      },
      500,
    );
  }
});
