// Dedicated Supabase client pointing to the external "aegw" project.
// The auto-generated `@/integrations/supabase/client` is bound to Lovable Cloud
// (vpzbspnqwyonyffsgfas), but this app's auth + data live in the aegw project.
// Using the wrong client breaks login: tokens issued by aegw are rejected by
// Lovable Cloud's JWKS, so setSession silently fails and ProtectedRoute kicks
// the user back to /login.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const AEGW_URL = "https://aegwmpkihkeaemcdgyqq.supabase.co";
const AEGW_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZ3dtcGtpaGtlYWVtY2RneXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg0NzUsImV4cCI6MjA4NTA4NDQ3NX0.5sfLvSwcmzUJShwPg8NpMD3t7VrEBYrfwdNBGlFjWdM";

export const supabase = createClient<Database>(AEGW_URL, AEGW_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "sb-aegwmpkihkeaemcdgyqq-auth-token",
  },
});