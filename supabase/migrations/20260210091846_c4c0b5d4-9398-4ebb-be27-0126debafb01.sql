-- Add document_type column to distinguish request vs signature documents
ALTER TABLE public.case_documents 
ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'request';

-- Set existing signature docs (those with declaration_statement or advisor uploads) 
UPDATE public.case_documents 
SET document_type = 'signature' 
WHERE declaration_statement IS NOT NULL;
