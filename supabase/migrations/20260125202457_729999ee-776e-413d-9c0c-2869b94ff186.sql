-- Add declaration_statement field to case_documents table for signature documents
ALTER TABLE public.case_documents ADD COLUMN IF NOT EXISTS declaration_statement text NULL;