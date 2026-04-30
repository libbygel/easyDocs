ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS hourly_rate numeric;
ALTER TABLE public.case_time_entries ADD COLUMN IF NOT EXISTS hourly_rate numeric;