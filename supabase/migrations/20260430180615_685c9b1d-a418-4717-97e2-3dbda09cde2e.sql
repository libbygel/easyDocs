ALTER TABLE public.case_payments
  ADD COLUMN IF NOT EXISTS charge_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_case_payments_charge_id
  ON public.case_payments(charge_id);