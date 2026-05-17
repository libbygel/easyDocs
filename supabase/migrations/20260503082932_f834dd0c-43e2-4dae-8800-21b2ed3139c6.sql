-- Trigger to call notify-advisor-approved edge function when profiles.is_paid flips to true
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_advisor_approved_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key text;
  function_url text := 'https://secsdczrrrdncibhpbhs.supabase.co/functions/v1/notify-advisor-approved';
BEGIN
  IF NEW.is_paid = true AND (OLD.is_paid IS DISTINCT FROM true) THEN
    -- Get service role key from vault if available, otherwise rely on header
    BEGIN
      SELECT decrypted_secret INTO service_key
      FROM vault.decrypted_secrets
      WHERE name = 'email_queue_service_role_key'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      service_key := NULL;
    END;

    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_is_paid_notify ON public.profiles;
CREATE TRIGGER profiles_is_paid_notify
AFTER UPDATE OF is_paid ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_advisor_approved_trigger();