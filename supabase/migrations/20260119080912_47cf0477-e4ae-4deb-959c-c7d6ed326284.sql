-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE case_status AS ENUM ('פתוח', 'ממתין למסמכים', 'בבדיקה', 'הושלם', 'מוקפא');
CREATE TYPE sent_status AS ENUM ('לא נשלח', 'נשלח');
CREATE TYPE review_status AS ENUM ('חסר', 'הועלה', 'תקין', 'לא תקין');
CREATE TYPE uploaded_by_type AS ENUM ('לקוח', 'יועץ');
CREATE TYPE email_type AS ENUM ('הודעה על העלאה', 'תזכורת יומית', 'לינק פורטל', 'מסמך נדחה');

-- Create profiles table (for advisors)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  id_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create case_types table
CREATE TABLE public.case_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create cases table
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  case_type_id UUID REFERENCES public.case_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status case_status DEFAULT 'פתוח' NOT NULL,
  portal_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  portal_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  last_client_activity_at TIMESTAMPTZ,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create doc_templates table
CREATE TABLE public.doc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  case_type_id UUID REFERENCES public.case_types(id) ON DELETE CASCADE NOT NULL,
  doc_name TEXT NOT NULL,
  default_required BOOLEAN DEFAULT TRUE NOT NULL,
  default_due_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create case_documents table
CREATE TABLE public.case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  doc_name TEXT NOT NULL,
  required BOOLEAN DEFAULT TRUE NOT NULL,
  due_date DATE,
  sent_status sent_status DEFAULT 'לא נשלח' NOT NULL,
  review_status review_status DEFAULT 'חסר' NOT NULL,
  advisor_note TEXT,
  client_note TEXT,
  last_upload_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create uploads table
CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_document_id UUID REFERENCES public.case_documents(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  uploaded_by uploaded_by_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Update case_documents to reference uploads
ALTER TABLE public.case_documents 
ADD CONSTRAINT fk_last_upload 
FOREIGN KEY (last_upload_id) REFERENCES public.uploads(id) ON DELETE SET NULL;

-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  email_type email_type NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Clients policies
CREATE POLICY "Advisors can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = advisor_id);

-- Case types policies (public read for all authenticated users)
CREATE POLICY "Anyone can view case types" ON public.case_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert case types" ON public.case_types
  FOR INSERT TO authenticated WITH CHECK (true);

-- Cases policies
CREATE POLICY "Advisors can view own cases" ON public.cases
  FOR SELECT USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can insert own cases" ON public.cases
  FOR INSERT WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own cases" ON public.cases
  FOR UPDATE USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own cases" ON public.cases
  FOR DELETE USING (auth.uid() = advisor_id);

-- Public policy for portal access via token
CREATE POLICY "Portal access via token" ON public.cases
  FOR SELECT TO anon USING (portal_enabled = true);

-- Doc templates policies
CREATE POLICY "Advisors can view own templates" ON public.doc_templates
  FOR SELECT USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can manage own templates" ON public.doc_templates
  FOR ALL USING (auth.uid() = advisor_id);

-- Case documents policies
CREATE POLICY "Advisors can view case documents" ON public.case_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = case_documents.case_id AND cases.advisor_id = auth.uid())
  );

CREATE POLICY "Advisors can manage case documents" ON public.case_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = case_documents.case_id AND cases.advisor_id = auth.uid())
  );

-- Public policy for portal document access
CREATE POLICY "Portal access to documents" ON public.case_documents
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = case_documents.case_id AND cases.portal_enabled = true)
  );

CREATE POLICY "Portal can update documents" ON public.case_documents
  FOR UPDATE TO anon USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = case_documents.case_id AND cases.portal_enabled = true)
  );

-- Uploads policies
CREATE POLICY "Advisors can view uploads" ON public.uploads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = uploads.case_id AND cases.advisor_id = auth.uid())
  );

CREATE POLICY "Advisors can manage uploads" ON public.uploads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = uploads.case_id AND cases.advisor_id = auth.uid())
  );

-- Public policy for portal uploads
CREATE POLICY "Portal can view uploads" ON public.uploads
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = uploads.case_id AND cases.portal_enabled = true)
  );

CREATE POLICY "Portal can insert uploads" ON public.uploads
  FOR INSERT TO anon WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = uploads.case_id AND cases.portal_enabled = true)
  );

-- Email logs policies
CREATE POLICY "Advisors can view own email logs" ON public.email_logs
  FOR SELECT USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (auth.uid() = advisor_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default case types
INSERT INTO public.case_types (name) VALUES 
  ('מיחזור משכנתא'),
  ('משכנתא חדשה'),
  ('ביטוח');

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policies
CREATE POLICY "Anyone can view documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anonymous can upload to documents" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'documents');