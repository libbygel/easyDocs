import { AEGW_ANON_KEY, AEGW_URL, supabase } from '@/lib/supabaseClient';

// Helper to call Edge Functions on the same Supabase project used by auth/data.
const EDGE_FUNCTIONS_URL = AEGW_URL;
const EDGE_FUNCTIONS_ANON_KEY = AEGW_ANON_KEY;

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
  const url = `${EDGE_FUNCTIONS_URL}/functions/v1/${functionName}`;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'apikey': EDGE_FUNCTIONS_ANON_KEY,
    'Authorization': `Bearer ${session?.access_token || EDGE_FUNCTIONS_ANON_KEY}`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
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
