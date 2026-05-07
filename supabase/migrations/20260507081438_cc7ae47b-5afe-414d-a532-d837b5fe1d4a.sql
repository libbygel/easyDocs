
-- Vault settings per advisor: stores verifier hash + salt for master password
CREATE TABLE public.vault_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL UNIQUE,
  verifier text NOT NULL,
  salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own vault settings" ON public.vault_settings FOR SELECT USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors insert own vault settings" ON public.vault_settings FOR INSERT WITH CHECK (auth.uid() = advisor_id);
CREATE POLICY "Advisors update own vault settings" ON public.vault_settings FOR UPDATE USING (auth.uid() = advisor_id);

-- Encrypted client passwords table
CREATE TABLE public.client_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  client_id uuid NOT NULL,
  service_name text NOT NULL,
  username_ciphertext text,
  username_iv text,
  password_ciphertext text NOT NULL,
  password_iv text NOT NULL,
  notes_ciphertext text,
  notes_iv text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own client passwords" ON public.client_passwords FOR SELECT USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors insert own client passwords" ON public.client_passwords FOR INSERT WITH CHECK (auth.uid() = advisor_id);
CREATE POLICY "Advisors update own client passwords" ON public.client_passwords FOR UPDATE USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors delete own client passwords" ON public.client_passwords FOR DELETE USING (auth.uid() = advisor_id);

CREATE INDEX idx_client_passwords_client ON public.client_passwords(client_id);
CREATE INDEX idx_client_passwords_advisor ON public.client_passwords(advisor_id);

CREATE TRIGGER update_client_passwords_updated_at
BEFORE UPDATE ON public.client_passwords
FOR EACH ROW EXECUTE FUNCTION public.update_client_documents_updated_at();

CREATE TRIGGER update_vault_settings_updated_at
BEFORE UPDATE ON public.vault_settings
FOR EACH ROW EXECUTE FUNCTION public.update_client_documents_updated_at();
