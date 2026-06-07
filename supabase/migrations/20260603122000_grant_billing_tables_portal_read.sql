-- Allow master portal (anon) to read billing & time data for portal-enabled cases.

-- 1) GRANTs
GRANT SELECT ON public.case_charges TO anon;
GRANT SELECT ON public.case_payments TO anon;
GRANT SELECT ON public.case_time_entries TO anon;

-- 2) RLS policies for portal read access
DROP POLICY IF EXISTS "Portal can view case charges" ON public.case_charges;
CREATE POLICY "Portal can view case charges"
  ON public.case_charges
  FOR SELECT
  TO anon
  USING (public.can_portal_access_case(case_id));

DROP POLICY IF EXISTS "Portal can view case payments" ON public.case_payments;
CREATE POLICY "Portal can view case payments"
  ON public.case_payments
  FOR SELECT
  TO anon
  USING (public.can_portal_access_case(case_id));

DROP POLICY IF EXISTS "Portal can view case time entries" ON public.case_time_entries;
CREATE POLICY "Portal can view case time entries"
  ON public.case_time_entries
  FOR SELECT
  TO anon
  USING (public.can_portal_access_case(case_id));
