-- Add display_order column to case_documents for drag-and-drop ordering
ALTER TABLE public.case_documents 
ADD COLUMN display_order integer DEFAULT 0;

-- Update existing documents with sequential order based on creation date
WITH ordered_docs AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY case_id ORDER BY created_at) - 1 as new_order
  FROM public.case_documents
)
UPDATE public.case_documents 
SET display_order = ordered_docs.new_order
FROM ordered_docs 
WHERE public.case_documents.id = ordered_docs.id;