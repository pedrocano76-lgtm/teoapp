
-- Add invite_code column
ALTER TABLE public.family_shares
ADD COLUMN invite_code text UNIQUE;

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate code on insert
CREATE TRIGGER set_invite_code
BEFORE INSERT ON public.family_shares
FOR EACH ROW
EXECUTE FUNCTION public.generate_invite_code();

-- Function to auto-link user on signup if email matches a pending invite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, relationship)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'relationship'
  );

  -- Auto-link pending invitations
  UPDATE public.family_shares
  SET shared_with_user_id = NEW.id
  WHERE shared_with_email = lower(NEW.email)
    AND shared_with_user_id IS NULL;

  RETURN NEW;
END;
$$;

-- Recreate the trigger for handle_new_user (in case it doesn't exist yet)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
