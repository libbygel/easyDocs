// Dedicated Supabase client pointing to the external "aegw" project.
// The auto-generated `@/integrations/supabase/client` is bound to Lovable Cloud
// (vpzbspnqwyonyffsgfas), but this app's auth + data live in the aegw project.
// Using the wrong client breaks login: tokens issued by aegw are rejected by
// Lovable Cloud's JWKS, so setSession silently fails and ProtectedRoute kicks
// the user back to /login.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const AEGW_URL = "https://hndzejkwwpwrtzqpnqme.supabase.co";
export const AEGW_ANON_KEY =
  "sb_publishable_KK3uDx2kOLcgvFpyTcU3IA_vf7E6x0F";

export const supabase = createClient<Database>(AEGW_URL, AEGW_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "sb-hndzejkwwpwrtzqpnqme-auth-token",
  },
});

/**
 * Creates a Supabase client with the portal token sent as x-portal-token header.
 * Use this ONLY in portal pages (ClientPortal, ClientMasterPortal).
 * Never use for advisor-side requests.
 */
export function createPortalClient(portalToken: string) {
  return createClient<Database>(AEGW_URL, AEGW_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-portal-token": portalToken,
      },
    },
  });
}