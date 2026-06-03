-- Grant anon read access to case_types for portal resource embeddings.
-- Without this, PostgREST rejects any query that embeds case_types for the anon role.

GRANT SELECT ON public.case_types TO anon;

-- Add a permissive policy so anon can read case_types (for portal pages that
-- display the case type name). This is safe because case_types only contain
-- names/labels, no sensitive data.
DROP POLICY IF EXISTS "Portal can view case types" ON public.case_types;
CREATE POLICY "Portal can view case types"
  ON public.case_types FOR SELECT
  TO anon
  USING (true);
