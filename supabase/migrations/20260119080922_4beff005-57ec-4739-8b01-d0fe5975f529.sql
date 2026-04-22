-- Fix the overly permissive RLS policy on case_types
DROP POLICY IF EXISTS "Authenticated users can insert case types" ON public.case_types;

-- Only advisors with profiles can insert case types
CREATE POLICY "Authenticated users can insert case types" ON public.case_types
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid())
  );