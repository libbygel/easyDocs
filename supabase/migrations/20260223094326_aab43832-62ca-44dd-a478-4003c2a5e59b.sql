
-- Add portal password column to cases table
ALTER TABLE public.cases ADD COLUMN portal_password text DEFAULT null;
