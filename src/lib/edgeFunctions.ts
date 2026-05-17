// Helper to call Edge Functions on Lovable Cloud
// The main supabase client points to aegw (external project for data),
// but edge functions are deployed on Lovable Cloud.

const LOVABLE_CLOUD_URL = 'https://secsdczrrrdncibhpbhs.supabase.co';
const LOVABLE_CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlY3NkY3pycnJkbmNpYmhwYmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTU2NDMsImV4cCI6MjA5NDA5MTY0M30.dBWnIYFNZpYvt_1BL_Wkb5eSmsk_U14rnzHAWE9NlE8';

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
