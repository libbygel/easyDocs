
-- Add template_file_url and declaration_statement to doc_templates for signature documents
ALTER TABLE public.doc_templates 
ADD COLUMN IF NOT EXISTS template_file_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS declaration_statement text DEFAULT NULL;
