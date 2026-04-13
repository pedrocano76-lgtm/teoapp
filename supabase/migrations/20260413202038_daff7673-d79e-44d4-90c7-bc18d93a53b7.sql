
-- Fix 1: Remove the overly permissive storage upload policy
DROP POLICY IF EXISTS "Auth users can upload photos" ON storage.objects;

-- Fix 2: Fix tags INSERT policy to prevent privilege escalation
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Authenticated users can create tags"
ON public.tags
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = created_by) AND (is_predefined = false));
