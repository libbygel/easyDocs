-- ============================================
-- FIX: Add portal access to clients table
-- The portal needs to read client info (name, id_number) for signatures
-- ============================================

-- Portal can view client info for their case
CREATE POLICY "Portal can view client via case"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.client_id = clients.id
    AND cases.portal_enabled = true
  )
);

-- ============================================
-- FIX: Portal can delete their own uploads
-- ============================================

CREATE POLICY "Portal can delete uploads"
ON public.uploads
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = uploads.case_id
    AND cases.portal_enabled = true
  )
  AND uploaded_by = 'לקוח'
);

-- ============================================
-- STORAGE POLICIES for documents bucket
-- ============================================

-- Allow anyone to read files (bucket is public)
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents');

-- Allow portal users to upload files
CREATE POLICY "Portal can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents');

-- Allow portal users to update their files
CREATE POLICY "Portal can update files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'documents');

-- Allow advisors to manage all files
CREATE POLICY "Advisors can manage files"
ON storage.objects
FOR ALL
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');