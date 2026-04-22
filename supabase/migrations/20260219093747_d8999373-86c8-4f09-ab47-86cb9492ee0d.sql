-- Allow portal (anon) users to insert notifications
CREATE POLICY "Portal can insert notifications"
ON public.notifications
FOR INSERT
TO anon
WITH CHECK (true);