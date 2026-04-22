
-- Add advisor_id to case_types
ALTER TABLE public.case_types ADD COLUMN advisor_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Set existing case_types advisor_id based on their doc_templates
UPDATE public.case_types ct
SET advisor_id = (
  SELECT dt.advisor_id FROM public.doc_templates dt WHERE dt.case_type_id = ct.id LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.doc_templates dt WHERE dt.case_type_id = ct.id
);

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view case types" ON public.case_types;
DROP POLICY IF EXISTS "Authenticated users can insert case types" ON public.case_types;

-- Create new RLS policies scoped to advisor
CREATE POLICY "Advisors can view own case types"
  ON public.case_types FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can insert own case types"
  ON public.case_types FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own case types"
  ON public.case_types FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own case types"
  ON public.case_types FOR DELETE
  USING (auth.uid() = advisor_id);
