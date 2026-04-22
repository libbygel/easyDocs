-- Drop the restrictive portal policies and recreate as permissive

-- For cases table
DROP POLICY IF EXISTS "Portal access via token" ON public.cases;
CREATE POLICY "Portal access via token"
ON public.cases
FOR SELECT
USING (portal_enabled = true);

-- For case_documents table
DROP POLICY IF EXISTS "Portal access to documents" ON public.case_documents;
CREATE POLICY "Portal access to documents"
ON public.case_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM cases
  WHERE cases.id = case_documents.case_id
  AND cases.portal_enabled = true
));

DROP POLICY IF EXISTS "Portal can update documents" ON public.case_documents;
CREATE POLICY "Portal can update documents"
ON public.case_documents
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM cases
  WHERE cases.id = case_documents.case_id
  AND cases.portal_enabled = true
));

-- For uploads table
DROP POLICY IF EXISTS "Portal can view uploads" ON public.uploads;
CREATE POLICY "Portal can view uploads"
ON public.uploads
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM cases
  WHERE cases.id = uploads.case_id
  AND cases.portal_enabled = true
));

DROP POLICY IF EXISTS "Portal can insert uploads" ON public.uploads;
CREATE POLICY "Portal can insert uploads"
ON public.uploads
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM cases
  WHERE cases.id = uploads.case_id
  AND cases.portal_enabled = true
));