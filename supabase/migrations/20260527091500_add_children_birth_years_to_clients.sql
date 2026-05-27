ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS children_birth_years text[];
