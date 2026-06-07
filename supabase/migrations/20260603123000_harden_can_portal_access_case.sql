-- Harden can_portal_access_case: require valid portal_token or client_id header.
-- Before: any anon request could access any portal-enabled case by case_id alone.
-- After: the request must also carry the matching x-portal-token or x-portal-client-id header.

CREATE OR REPLACE FUNCTION public.can_portal_access_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = p_case_id
      AND c.portal_enabled = true
      AND (
        -- ClientPortal: token in header matches case's portal_token
        c.portal_token = COALESCE(
          current_setting('request.headers', true)::json->>'x-portal-token', ''
        )
        OR
        -- ClientMasterPortal: client_id in header matches case's client_id
        c.client_id::text = COALESCE(
          current_setting('request.headers', true)::json->>'x-portal-client-id', ''
        )
      )
  );
$$;
