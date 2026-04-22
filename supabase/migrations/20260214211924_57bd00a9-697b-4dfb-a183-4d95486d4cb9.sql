
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enable_daily_reminders boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_urgent_alerts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_hour integer NOT NULL DEFAULT 18,
ADD COLUMN IF NOT EXISTS inactivity_days integer NOT NULL DEFAULT 2;
