
-- 1. Add UPDATE policy on family_shares scoped to owner
CREATE POLICY "Owner can update own shares"
ON public.family_shares
FOR UPDATE
TO authenticated
USING (auth.uid() = family_owner_id)
WITH CHECK (auth.uid() = family_owner_id);

-- 2. Fix storage delete policy: drop public, recreate as authenticated
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Fix handle_new_user to validate invite_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, relationship)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'relationship'
  );

  -- Auto-link pending invitations (only if invite_code matches)
  UPDATE public.family_shares
  SET shared_with_user_id = NEW.id
  WHERE shared_with_email = lower(NEW.email)
    AND shared_with_user_id IS NULL
    AND (
      invite_code IS NULL
      OR invite_code = (NEW.raw_user_meta_data->>'invite_code')
    );

  RETURN NEW;
END;
$function$;
