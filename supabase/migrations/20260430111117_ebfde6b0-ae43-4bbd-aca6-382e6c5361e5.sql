-- 1. Add advisor preferences for billing & timer
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS timer_mode text NOT NULL DEFAULT 'manual';

-- 2. case_charges: amounts the advisor has billed the client for a specific case
CREATE TABLE IF NOT EXISTS public.case_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  client_id uuid NOT NULL,
  case_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text,
  charged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_charges_advisor ON public.case_charges(advisor_id);
CREATE INDEX IF NOT EXISTS idx_case_charges_case ON public.case_charges(case_id);
CREATE INDEX IF NOT EXISTS idx_case_charges_client ON public.case_charges(client_id);

ALTER TABLE public.case_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own charges"
  ON public.case_charges FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors insert own charges"
  ON public.case_charges FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors update own charges"
  ON public.case_charges FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors delete own charges"
  ON public.case_charges FOR DELETE
  USING (auth.uid() = advisor_id);

-- 3. case_payments: amounts the client has paid against a case
CREATE TABLE IF NOT EXISTS public.case_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  client_id uuid NOT NULL,
  case_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text,
  payment_method text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_payments_advisor ON public.case_payments(advisor_id);
CREATE INDEX IF NOT EXISTS idx_case_payments_case ON public.case_payments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_payments_client ON public.case_payments(client_id);

ALTER TABLE public.case_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own payments"
  ON public.case_payments FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors insert own payments"
  ON public.case_payments FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors update own payments"
  ON public.case_payments FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors delete own payments"
  ON public.case_payments FOR DELETE
  USING (auth.uid() = advisor_id);

-- 4. case_time_entries: time tracking entries (manual + timer)
CREATE TABLE IF NOT EXISTS public.case_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  client_id uuid NOT NULL,
  case_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer,
  description text,
  source text NOT NULL DEFAULT 'timer', -- 'timer' | 'manual' | 'auto'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_advisor ON public.case_time_entries(advisor_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_case ON public.case_time_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client ON public.case_time_entries(client_id);
-- ensure only one open (running) entry per advisor at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_one_open
  ON public.case_time_entries(advisor_id) WHERE ended_at IS NULL;

ALTER TABLE public.case_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own time entries"
  ON public.case_time_entries FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors insert own time entries"
  ON public.case_time_entries FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors update own time entries"
  ON public.case_time_entries FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors delete own time entries"
  ON public.case_time_entries FOR DELETE
  USING (auth.uid() = advisor_id);