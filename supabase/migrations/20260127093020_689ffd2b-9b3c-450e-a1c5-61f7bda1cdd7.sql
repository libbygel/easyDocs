-- Add 'נחתם' as a new valid value for review_status enum

ALTER TYPE public.review_status ADD VALUE IF NOT EXISTS 'נחתם';