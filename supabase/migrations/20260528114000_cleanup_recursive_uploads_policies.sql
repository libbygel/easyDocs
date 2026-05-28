-- Fix production RLS drift on uploads that caused:
-- "infinite recursion detected in policy for relation uploads"
--
-- Root cause: policy "client can approve signed document" queries public.uploads
-- inside a policy on public.uploads, which creates recursive policy evaluation.
--
-- This migration removes recursive/duplicate client policies and keeps the
-- canonical advisor + portal policy set.

-- Recursive policy (must be removed)
DROP POLICY IF EXISTS "client can approve signed document" ON public.uploads;

-- Duplicate legacy policies that overlap existing canonical policies
DROP POLICY IF EXISTS "client can upload signed document" ON public.uploads;
DROP POLICY IF EXISTS "client or advisor can insert uploads" ON public.uploads;
DROP POLICY IF EXISTS "client or advisor can read uploads" ON public.uploads;
