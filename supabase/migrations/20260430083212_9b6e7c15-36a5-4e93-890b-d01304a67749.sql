-- Add spouse fields and category to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS spouse_full_name text,
  ADD COLUMN IF NOT EXISTS spouse_id_number text,
  ADD COLUMN IF NOT EXISTS spouse_phone text,
  ADD COLUMN IF NOT EXISTS spouse_email text,
  ADD COLUMN IF NOT EXISTS category_id uuid;

-- Create client_categories table
CREATE TABLE IF NOT EXISTS public.client_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (advisor_id, name)
);

ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view own categories"
  ON public.client_categories FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can insert own categories"
  ON public.client_categories FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own categories"
  ON public.client_categories FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own categories"
  ON public.client_categories FOR DELETE
  USING (auth.uid() = advisor_id);

CREATE INDEX IF NOT EXISTS idx_clients_category_id ON public.clients(category_id);
CREATE INDEX IF NOT EXISTS idx_client_categories_advisor ON public.client_categories(advisor_id);