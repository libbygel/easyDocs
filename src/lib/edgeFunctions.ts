// Helper to call Edge Functions on Lovable Cloud (nihvmpljagypqjtvwlim)
// The main supabase client points to aegw (external project for data),
// but edge functions are deployed on Lovable Cloud.

const LOVABLE_CLOUD_URL = 'https://nihvmpljagypqjtvwlim.supabase.co';
const LOVABLE_CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paHZtcGxqYWd5cHFqdHZ3bGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODU5NDQsImV4cCI6MjA4NDM2MTk0NH0.Dh_f7ygtK-3plnapKPHWpHtwmLDqUTWZuifGOulChxk';

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
