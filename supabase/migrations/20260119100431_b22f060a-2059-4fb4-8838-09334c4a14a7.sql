-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('מסמך_התקבל', 'מסמך_דחוף', 'לקוח_לא_פעיל', 'מסמך_נדחה', 'תיק_חדש', 'מסמך_אושר')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Advisors can view their own notifications
CREATE POLICY "Advisors can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = advisor_id);

-- Advisors can update their own notifications (mark as read)
CREATE POLICY "Advisors can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = advisor_id);

-- Advisors can delete their own notifications
CREATE POLICY "Advisors can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = advisor_id);

-- System can insert notifications (using service role)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_advisor_id ON public.notifications(advisor_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;