ALTER TABLE public.personal_tasks 
  ADD COLUMN IF NOT EXISTS case_id uuid,
  ADD COLUMN IF NOT EXISTS client_id uuid;

CREATE INDEX IF NOT EXISTS idx_personal_tasks_case_id ON public.personal_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_client_id ON public.personal_tasks(client_id);