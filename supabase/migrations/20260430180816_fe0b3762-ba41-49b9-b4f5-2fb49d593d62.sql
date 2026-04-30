ALTER TABLE public.case_charges
  ADD COLUMN IF NOT EXISTS paid_manually boolean NOT NULL DEFAULT false;