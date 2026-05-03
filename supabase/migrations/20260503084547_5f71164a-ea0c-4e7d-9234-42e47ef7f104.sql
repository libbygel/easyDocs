DROP TRIGGER IF EXISTS trg_notify_advisor_approved ON public.profiles;

CREATE TRIGGER trg_notify_advisor_approved
AFTER UPDATE OF is_paid ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_advisor_approved_trigger();