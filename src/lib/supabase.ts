import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type CaseType = Database['public']['Tables']['case_types']['Row'];
export type Case = Database['public']['Tables']['cases']['Row'];
export type DocTemplate = Database['public']['Tables']['doc_templates']['Row'];
export type CaseDocument = Database['public']['Tables']['case_documents']['Row'];
export type Upload = Database['public']['Tables']['uploads']['Row'];
export type EmailLog = Database['public']['Tables']['email_logs']['Row'];

export type CaseStatus = Database['public']['Enums']['case_status'];
export type SentStatus = Database['public']['Enums']['sent_status'];
export type ReviewStatus = Database['public']['Enums']['review_status'];
export type UploadedByType = Database['public']['Enums']['uploaded_by_type'];
export type EmailType = Database['public']['Enums']['email_type'];

export { supabase };
