-- Ensure client portal can always read full case_documents list for a portal-enabled case.
-- This aligns case_documents policies with the non-recursive helper-based approach
-- already used for uploads.

-- 1) Remove legacy and drifted policies on case_documents.
DROP POLICY IF EXISTS "Advisors can manage case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Advisors can view case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Portal access to documents" ON public.case_documents;
DROP POLICY IF EXISTS "Portal can update documents" ON public.case_documents;
DROP POLICY IF EXISTS "Portal can view case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Portal can insert case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Portal can delete case documents" ON public.case_documents;

-- 2) Recreate explicit helper-based policies.
CREATE POLICY "Advisors can view case documents"
  ON public.case_documents
  FOR SELECT
  TO authenticated
  USING (public.can_advisor_access_case(case_id));

CREATE POLICY "Advisors can insert case documents"
  ON public.case_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_advisor_access_case(case_id));

CREATE POLICY "Advisors can update case documents"
  ON public.case_documents
  FOR UPDATE
  TO authenticated
  USING (public.can_advisor_access_case(case_id))
  WITH CHECK (public.can_advisor_access_case(case_id));

CREATE POLICY "Advisors can delete case documents"
  ON public.case_documents
  FOR DELETE
  TO authenticated
  USING (public.can_advisor_access_case(case_id));

CREATE POLICY "Portal can view case documents"
  ON public.case_documents
  FOR SELECT
  TO anon
  USING (public.can_portal_access_case(case_id));

CREATE POLICY "Portal can update case documents"
  ON public.case_documents
  FOR UPDATE
  TO anon
  USING (public.can_portal_access_case(case_id))
  WITH CHECK (public.can_portal_access_case(case_id));

-- 3) Keep grants explicit and idempotent for runtime environments with drift.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_documents TO authenticated;
GRANT SELECT, UPDATE ON public.case_documents TO anon;
