
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_id_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS clients_advisor_id_number_unique 
ON public.clients (advisor_id, id_number) 
WHERE id_number IS NOT NULL AND id_number != '';
