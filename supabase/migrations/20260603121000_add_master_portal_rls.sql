-- Allow master portal (client-portal) to read cases by client_id.
-- The master portal sends the client_id via x-portal-client-id header.

-- 1) Helper function to extract client_id from request header
CREATE OR REPLACE FUNCTION public.portal_client_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-portal-client-id',
    ''
  );
$$;

REVOKE EXECUTE ON FUNCTION public.portal_client_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_client_id() TO anon, authenticated, service_role;

-- 2) Policy: anon can SELECT cases for a given client_id (master portal)
DROP POLICY IF EXISTS "portal_master_can_view_cases" ON public.cases;
CREATE POLICY "portal_master_can_view_cases"
  ON public.cases
  FOR SELECT
  TO anon, authenticated
  USING (
    portal_enabled = true
    AND client_id::text = portal_client_id()
  );
