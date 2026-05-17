// Helper to call Edge Functions on Lovable Cloud
// Both URL and key are taken from the app's Supabase env variables.

const LOVABLE_CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
const LOVABLE_CLOUD_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function safeParseJson(rawText: string) {
  if (!rawText) return null;

  try {
    return JSON.parse(rawText) as Record<string, any>;
  } catch {
    return null;
  }
}

export async function invokeEdgeFunction<T extends Record<string, any> = Record<string, any>>(
  functionName: string,
  body: Record<string, any>
): Promise<T> {
  if (!LOVABLE_CLOUD_URL || !LOVABLE_CLOUD_KEY) {
    throw new Error('Edge function error: Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY');
  }

  const url = `${LOVABLE_CLOUD_URL}/functions/v1/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'apikey': LOVABLE_CLOUD_KEY,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const rawResponse = await response.text();
  const payload = safeParseJson(rawResponse);
  const isJsonResponse = contentType.includes('application/json');

  if (!response.ok) {
    throw new Error(
      `Edge function error: ${JSON.stringify({
        success: false,
        error: payload?.error || rawResponse || `HTTP ${response.status}`,
        status: response.status,
      })}`
    );
  }

  if (!isJsonResponse || !payload) {
    throw new Error(
      `Edge function error: ${JSON.stringify({
        success: false,
        error: 'Backend returned a non-JSON response',
        status: response.status,
        body: rawResponse.slice(0, 200),
      })}`
    );
  }

  return payload as T;
}
