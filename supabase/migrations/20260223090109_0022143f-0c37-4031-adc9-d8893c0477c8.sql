
-- Fix notifications RLS: RESTRICTIVE policies without any PERMISSIVE policy blocks everything.
-- Drop all existing and recreate as PERMISSIVE.

DROP POLICY IF EXISTS "Advisors can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Advisors can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Advisors can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Portal can insert notifications" ON public.notifications;

CREATE POLICY "Advisors can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Anyone can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
