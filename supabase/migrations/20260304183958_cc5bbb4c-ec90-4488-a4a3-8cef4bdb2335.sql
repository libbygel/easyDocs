
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  role text DEFAULT 'בנקאי',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view own contacts" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors can insert own contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = advisor_id);
CREATE POLICY "Advisors can update own contacts" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors can delete own contacts" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = advisor_id);
