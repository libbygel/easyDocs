
-- Drop all existing RESTRICTIVE policies on notifications
DROP POLICY IF EXISTS "Advisors can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Advisors can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Advisors can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Portal can insert notifications" ON public.notifications;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Advisors can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = advisor_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Portal can insert notifications"
ON public.notifications
FOR INSERT
TO anon
WITH CHECK (true);
