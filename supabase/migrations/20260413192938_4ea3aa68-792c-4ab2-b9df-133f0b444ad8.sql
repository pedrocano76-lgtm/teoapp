
-- Add relationship to profiles
ALTER TABLE public.profiles ADD COLUMN relationship text;

-- Update handle_new_user to store relationship
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, relationship)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'relationship'
  );
  RETURN NEW;
END;
$$;
