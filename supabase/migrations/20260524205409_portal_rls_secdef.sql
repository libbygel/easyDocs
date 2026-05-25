-- Fix: "new row violates row-level security policy for table uploads"
--
-- Root cause: every portal RLS policy uses a subquery
--   EXISTS (SELECT 1 FROM cases WHERE cases.id = ... AND cases.portal_enabled = true)
-- That subquery runs as the 'anon' role.  If 'anon' lacks SELECT privilege on
-- 'cases', or if 'cases' RLS blocks the row in the subquery context, the
-- EXISTS returns false and every portal INSERT/UPDATE is rejected.
--
-- Fix: replace the direct subquery with a SECURITY DEFINER helper function that
-- runs as the DB owner and can always read 'cases' without role restrictions.
-- We then update every affected portal policy to call this function.
--
-- Also adds explicit GRANTs so the portal page can directly read the tables
-- it needs (cases, clients, uploads, case_documents, case_activity_log,
-- notifications).

-- ── 1. SECURITY DEFINER helper ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_portal_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''               -- prevent search_path injection
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases
    WHERE id = p_case_id AND portal_enabled = true
  );
$$;

-- Only roles that actually need to call this function should be able to.
REVOKE EXECUTE ON FUNCTION public.is_portal_case(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_portal_case(uuid) TO anon, authenticated, service_role;

-- ── 2. Re-create portal RLS policies on uploads ───────────────────────────────
DROP POLICY IF EXISTS "Portal can view uploads"   ON public.uploads;
DROP POLICY IF EXISTS "Portal can insert uploads" ON public.uploads;
DROP POLICY IF EXISTS "Portal can delete uploads" ON public.uploads;

CREATE POLICY "Portal can view uploads"
  ON public.uploads FOR SELECT
  USING (public.is_portal_case(case_id));

CREATE POLICY "Portal can insert uploads"
  ON public.uploads FOR INSERT
  WITH CHECK (public.is_portal_case(case_id));

CREATE POLICY "Portal can delete uploads"
  ON public.uploads FOR DELETE
  USING (public.is_portal_case(case_id) AND uploaded_by = 'לקוח'::uploaded_by_type);

-- ── 3. Re-create portal RLS policies on case_documents ────────────────────────
DROP POLICY IF EXISTS "Portal access to documents"  ON public.case_documents;
DROP POLICY IF EXISTS "Portal can update documents" ON public.case_documents;

CREATE POLICY "Portal access to documents"
  ON public.case_documents FOR SELECT
  USING (public.is_portal_case(case_id));

CREATE POLICY "Portal can update documents"
  ON public.case_documents FOR UPDATE
  USING (public.is_portal_case(case_id));

-- ── 4. Re-create portal RLS policy on clients ─────────────────────────────────
DROP POLICY IF EXISTS "Portal can view client via case" ON public.clients;

CREATE POLICY "Portal can view client via case"
  ON public.clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cases
    WHERE  public.cases.client_id   = clients.id
    AND    public.is_portal_case(public.cases.id)
  ));

-- ── 5. Explicit GRANTs so the portal page can read tables directly ─────────────
-- (idempotent: GRANT is a no-op if the privilege already exists)
GRANT SELECT                         ON public.cases              TO anon;
GRANT SELECT                         ON public.clients            TO anon;
GRANT SELECT, INSERT, UPDATE         ON public.case_documents     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads            TO anon;
GRANT SELECT, INSERT                 ON public.case_activity_log  TO anon;
GRANT SELECT, INSERT                 ON public.notifications      TO anon;
