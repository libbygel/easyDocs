CREATE TABLE public.client_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id uuid NOT NULL,
  client_id uuid NOT NULL,
  conversation_date date NOT NULL DEFAULT CURRENT_DATE,
  summary text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors view own client conversations"
  ON public.client_conversations FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors insert own client conversations"
  ON public.client_conversations FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors update own client conversations"
  ON public.client_conversations FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors delete own client conversations"
  ON public.client_conversations FOR DELETE
  USING (auth.uid() = advisor_id);

CREATE INDEX idx_client_conversations_client ON public.client_conversations(client_id, conversation_date DESC);

CREATE TRIGGER update_client_conversations_updated_at
  BEFORE UPDATE ON public.client_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_documents_updated_at();