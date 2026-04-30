-- Allow portal (anon) to read finance + time + activity for portal-enabled cases

CREATE POLICY "Portal can view case charges"
ON public.case_charges FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = case_charges.case_id AND cases.portal_enabled = true
));

CREATE POLICY "Portal can view case payments"
ON public.case_payments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = case_payments.case_id AND cases.portal_enabled = true
));

CREATE POLICY "Portal can view case time entries"
ON public.case_time_entries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = case_time_entries.case_id AND cases.portal_enabled = true
));