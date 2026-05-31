-- Secure portal helper: resolve advisor identity strictly from the case token.
-- This allows client-portal flows to send email only to the advisor attached to the case,
-- without exposing broad read access on profiles to anon.

CREATE OR REPLACE FUNCTION public.get_portal_case_context(p_portal_token text)
RETURNS TABLE (
  case_id uuid,
  advisor_id uuid,
  advisor_email text,
  advisor_name text,
  client_name text,
  case_title text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    c.id AS case_id,
    c.advisor_id,
    p.email AS advisor_email,
    COALESCE(NULLIF(p.sender_display_name, ''), NULLIF(p.name, ''), p.email) AS advisor_name,
    cl.full_name AS client_name,
    c.title AS case_title
  FROM public.cases c
  JOIN public.clients cl ON cl.id = c.client_id
  LEFT JOIN public.profiles p ON p.user_id = c.advisor_id
  WHERE c.portal_token = p_portal_token
    AND c.portal_enabled = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_portal_case_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portal_case_context(text) TO anon, authenticated, service_role;
