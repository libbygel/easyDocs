CREATE TABLE public.recurring_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id uuid NOT NULL,
  client_id uuid NOT NULL,
  case_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  day_of_month integer NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamp with time zone,
  next_run_on date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own recurring charges"
  ON public.recurring_charges FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors insert own recurring charges"
  ON public.recurring_charges FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors update own recurring charges"
  ON public.recurring_charges FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors delete own recurring charges"
  ON public.recurring_charges FOR DELETE
  USING (auth.uid() = advisor_id);

CREATE INDEX idx_recurring_charges_advisor ON public.recurring_charges(advisor_id);
CREATE INDEX idx_recurring_charges_client ON public.recurring_charges(client_id);
CREATE INDEX idx_recurring_charges_active ON public.recurring_charges(is_active, day_of_month) WHERE is_active = true;