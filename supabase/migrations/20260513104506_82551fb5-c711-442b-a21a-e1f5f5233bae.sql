
ALTER TABLE public.reminder_settings
ADD COLUMN IF NOT EXISTS notify_uploads_email boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_display_name(uuid) TO authenticated;
