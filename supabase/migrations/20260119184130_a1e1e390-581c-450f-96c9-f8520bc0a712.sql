-- Create enum for activity action types
CREATE TYPE public.case_activity_type AS ENUM (
  'העלאת מסמך',
  'אישור מסמך',
  'דחיית מסמך',
  'שליחת תזכורת',
  'שליחת לינק',
  'השלמת תיק'
);

-- Create case activity log table
CREATE TABLE public.case_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  action_type public.case_activity_type NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_case_activity_log_case_id ON public.case_activity_log(case_id);
CREATE INDEX idx_case_activity_log_created_at ON public.case_activity_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.case_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Advisors can view activity logs for their cases
CREATE POLICY "Advisors can view activity logs for their cases"
ON public.case_activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_activity_log.case_id
    AND cases.advisor_id = auth.uid()
  )
);

-- Policy: Allow inserts from edge functions and authenticated users
CREATE POLICY "Allow inserts for case activity"
ON public.case_activity_log
FOR INSERT
WITH CHECK (true);

-- Policy: Public can view activity logs for cases with portal tokens (for client portal)
CREATE POLICY "Portal users can view activity logs"
ON public.case_activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_activity_log.case_id
    AND cases.portal_enabled = true
  )
);

-- Add last_client_activity_at to cases if not exists (for smart reminders)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'last_client_activity_at') 
  THEN
    ALTER TABLE public.cases ADD COLUMN last_client_activity_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;