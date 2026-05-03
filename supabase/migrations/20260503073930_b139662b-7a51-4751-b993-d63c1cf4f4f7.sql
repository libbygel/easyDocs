CREATE TABLE public.personal_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own tasks" ON public.personal_tasks
  FOR SELECT USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors insert own tasks" ON public.personal_tasks
  FOR INSERT WITH CHECK (auth.uid() = advisor_id);
CREATE POLICY "Advisors update own tasks" ON public.personal_tasks
  FOR UPDATE USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors delete own tasks" ON public.personal_tasks
  FOR DELETE USING (auth.uid() = advisor_id);

CREATE INDEX idx_personal_tasks_advisor ON public.personal_tasks(advisor_id, is_completed, created_at DESC);