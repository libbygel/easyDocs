-- Add reminder fields to personal_tasks
ALTER TABLE public.personal_tasks
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_personal_tasks_reminder_pending
  ON public.personal_tasks (reminder_at)
  WHERE reminder_at IS NOT NULL AND reminder_sent_at IS NULL AND is_completed = false;

-- Create client_documents table
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  advisor_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents (client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_advisor ON public.client_documents (advisor_id);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own client documents"
  ON public.client_documents FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors insert own client documents"
  ON public.client_documents FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors update own client documents"
  ON public.client_documents FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors delete own client documents"
  ON public.client_documents FOR DELETE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Portal can view client documents"
  ON public.client_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.client_id = client_documents.client_id
      AND cases.portal_enabled = true
  ));

CREATE OR REPLACE FUNCTION public.update_client_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_client_documents_updated_at ON public.client_documents;
CREATE TRIGGER trg_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_client_documents_updated_at();