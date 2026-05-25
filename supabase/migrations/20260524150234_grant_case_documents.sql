-- Fix: "permission denied for table case_documents"
--
-- RLS policies were in place but the underlying PostgreSQL GRANT was missing.
-- Without GRANT, the privilege check fires before RLS is evaluated, causing
-- "permission denied" even for users who would satisfy an RLS policy.
--
-- Grants are intentionally broad (SELECT/INSERT/UPDATE/DELETE) so that RLS
-- policies remain the sole security gate.  service_role bypasses RLS by
-- design and already has superuser-equivalent access, but we grant it
-- explicitly for completeness.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_documents TO authenticated;
GRANT SELECT, UPDATE                 ON public.case_documents TO anon;
GRANT ALL                            ON public.case_documents TO service_role;

-- uploads was created in the same migration without grants — fix it here too.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.uploads TO anon;
GRANT ALL                            ON public.uploads TO service_role;
