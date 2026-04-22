
-- Fix ALL RLS policies to be PERMISSIVE instead of RESTRICTIVE
-- This is critical: RESTRICTIVE means ALL policies must pass (AND logic)
-- PERMISSIVE means ANY policy can grant access (OR logic)

-- ===== cases =====
DROP POLICY IF EXISTS "Advisors can view own cases" ON public.cases;
CREATE POLICY "Advisors can view own cases" ON public.cases FOR SELECT USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can insert own cases" ON public.cases;
CREATE POLICY "Advisors can insert own cases" ON public.cases FOR INSERT WITH CHECK (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can update own cases" ON public.cases;
CREATE POLICY "Advisors can update own cases" ON public.cases FOR UPDATE USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can delete own cases" ON public.cases;
CREATE POLICY "Advisors can delete own cases" ON public.cases FOR DELETE USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Portal access via token" ON public.cases;
CREATE POLICY "Portal access via token" ON public.cases FOR SELECT USING (portal_enabled = true);

-- ===== case_documents =====
DROP POLICY IF EXISTS "Advisors can manage case documents" ON public.case_documents;
CREATE POLICY "Advisors can manage case documents" ON public.case_documents FOR ALL USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_documents.case_id AND cases.advisor_id = auth.uid()));

DROP POLICY IF EXISTS "Advisors can view case documents" ON public.case_documents;
CREATE POLICY "Advisors can view case documents" ON public.case_documents FOR SELECT USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_documents.case_id AND cases.advisor_id = auth.uid()));

DROP POLICY IF EXISTS "Portal access to documents" ON public.case_documents;
CREATE POLICY "Portal access to documents" ON public.case_documents FOR SELECT USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_documents.case_id AND cases.portal_enabled = true));

DROP POLICY IF EXISTS "Portal can update documents" ON public.case_documents;
CREATE POLICY "Portal can update documents" ON public.case_documents FOR UPDATE USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_documents.case_id AND cases.portal_enabled = true));

-- ===== uploads =====
DROP POLICY IF EXISTS "Advisors can manage uploads" ON public.uploads;
CREATE POLICY "Advisors can manage uploads" ON public.uploads FOR ALL USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = uploads.case_id AND cases.advisor_id = auth.uid()));

DROP POLICY IF EXISTS "Advisors can view uploads" ON public.uploads;
CREATE POLICY "Advisors can view uploads" ON public.uploads FOR SELECT USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = uploads.case_id AND cases.advisor_id = auth.uid()));

DROP POLICY IF EXISTS "Portal can view uploads" ON public.uploads;
CREATE POLICY "Portal can view uploads" ON public.uploads FOR SELECT USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = uploads.case_id AND cases.portal_enabled = true));

DROP POLICY IF EXISTS "Portal can insert uploads" ON public.uploads;
CREATE POLICY "Portal can insert uploads" ON public.uploads FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = uploads.case_id AND cases.portal_enabled = true));

DROP POLICY IF EXISTS "Portal can delete uploads" ON public.uploads;
CREATE POLICY "Portal can delete uploads" ON public.uploads FOR DELETE USING ((EXISTS (SELECT 1 FROM cases WHERE cases.id = uploads.case_id AND cases.portal_enabled = true)) AND (uploaded_by = 'לקוח'::uploaded_by_type));

-- ===== case_activity_log =====
DROP POLICY IF EXISTS "Advisors can view activity logs for their cases" ON public.case_activity_log;
CREATE POLICY "Advisors can view activity logs for their cases" ON public.case_activity_log FOR SELECT USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_activity_log.case_id AND cases.advisor_id = auth.uid()));

DROP POLICY IF EXISTS "Allow inserts for case activity" ON public.case_activity_log;
CREATE POLICY "Allow inserts for case activity" ON public.case_activity_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can view activity logs" ON public.case_activity_log;
CREATE POLICY "Portal users can view activity logs" ON public.case_activity_log FOR SELECT USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_activity_log.case_id AND cases.portal_enabled = true));

-- ===== clients =====
DROP POLICY IF EXISTS "Advisors can view own clients" ON public.clients;
CREATE POLICY "Advisors can view own clients" ON public.clients FOR SELECT USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can insert own clients" ON public.clients;
CREATE POLICY "Advisors can insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can update own clients" ON public.clients;
CREATE POLICY "Advisors can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can delete own clients" ON public.clients;
CREATE POLICY "Advisors can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Portal can view client via case" ON public.clients;
CREATE POLICY "Portal can view client via case" ON public.clients FOR SELECT USING (EXISTS (SELECT 1 FROM cases WHERE cases.client_id = clients.id AND cases.portal_enabled = true));

-- ===== notifications =====
DROP POLICY IF EXISTS "Advisors can view own notifications" ON public.notifications;
CREATE POLICY "Advisors can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can update own notifications" ON public.notifications;
CREATE POLICY "Advisors can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can delete own notifications" ON public.notifications;
CREATE POLICY "Advisors can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ===== profiles =====
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ===== doc_templates =====
DROP POLICY IF EXISTS "Advisors can manage own templates" ON public.doc_templates;
CREATE POLICY "Advisors can manage own templates" ON public.doc_templates FOR ALL USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can view own templates" ON public.doc_templates;
CREATE POLICY "Advisors can view own templates" ON public.doc_templates FOR SELECT USING (auth.uid() = advisor_id);

-- ===== email_logs =====
DROP POLICY IF EXISTS "Advisors can view own email logs" ON public.email_logs;
CREATE POLICY "Advisors can view own email logs" ON public.email_logs FOR SELECT USING (auth.uid() = advisor_id);

DROP POLICY IF EXISTS "Advisors can insert email logs" ON public.email_logs;
CREATE POLICY "Advisors can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (auth.uid() = advisor_id);

-- ===== case_types =====
DROP POLICY IF EXISTS "Anyone can view case types" ON public.case_types;
CREATE POLICY "Anyone can view case types" ON public.case_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert case types" ON public.case_types;
CREATE POLICY "Authenticated users can insert case types" ON public.case_types FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()));
