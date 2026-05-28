-- Fix: "infinite recursion detected in policy for relation uploads"
--
-- This migration rewrites uploads RLS policies to use SECURITY DEFINER helper
-- functions that read only from public.cases. This avoids recursive policy
-- chains when evaluating access for uploads insert/select/update/delete.

-- 1) Helper functions (run as owner, bypassing RLS on referenced tables)
CREATE OR REPLACE FUNCTION public.can_advisor_access_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = p_case_id
      AND c.advisor_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_portal_access_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = p_case_id
      AND c.portal_enabled = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_advisor_access_case(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_portal_access_case(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_advisor_access_case(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_portal_access_case(uuid) TO anon, authenticated, service_role;

-- 2) Drop old uploads policies (idempotent)
DROP POLICY IF EXISTS "Advisors can manage uploads" ON public.uploads;
DROP POLICY IF EXISTS "Advisors can view uploads" ON public.uploads;
DROP POLICY IF EXISTS "Portal can view uploads" ON public.uploads;
DROP POLICY IF EXISTS "Portal can insert uploads" ON public.uploads;
DROP POLICY IF EXISTS "Portal can delete uploads" ON public.uploads;
DROP POLICY IF EXISTS "Advisors can insert uploads" ON public.uploads;
DROP POLICY IF EXISTS "Advisors can update uploads" ON public.uploads;
DROP POLICY IF EXISTS "Advisors can delete uploads" ON public.uploads;

-- 3) Recreate non-recursive uploads policies
CREATE POLICY "Advisors can view uploads"
  ON public.uploads
  FOR SELECT
  TO authenticated
  USING (public.can_advisor_access_case(case_id));

CREATE POLICY "Advisors can insert uploads"
  ON public.uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_advisor_access_case(case_id));

CREATE POLICY "Advisors can update uploads"
  ON public.uploads
  FOR UPDATE
  TO authenticated
  USING (public.can_advisor_access_case(case_id))
  WITH CHECK (public.can_advisor_access_case(case_id));

CREATE POLICY "Advisors can delete uploads"
  ON public.uploads
  FOR DELETE
  TO authenticated
  USING (public.can_advisor_access_case(case_id));

CREATE POLICY "Portal can view uploads"
  ON public.uploads
  FOR SELECT
  TO anon
  USING (public.can_portal_access_case(case_id));

CREATE POLICY "Portal can insert uploads"
  ON public.uploads
  FOR INSERT
  TO anon
  WITH CHECK (public.can_portal_access_case(case_id));

CREATE POLICY "Portal can delete uploads"
  ON public.uploads
  FOR DELETE
  TO anon
  USING (
    public.can_portal_access_case(case_id)
    AND uploaded_by = 'לקוח'::uploaded_by_type
  );
