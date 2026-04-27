-- 1. Add columns to children
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS profile_photo_path text;

-- 2. Activities table
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('sport', 'hobby', 'other')),
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View activities for accessible children"
  ON public.activities FOR SELECT
  TO authenticated
  USING (public.can_access_child(child_id));

CREATE POLICY "Insert activities for editable children"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_child(child_id));

CREATE POLICY "Update activities for editable children"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (public.can_edit_child(child_id));

CREATE POLICY "Delete activities for editable children"
  ON public.activities FOR DELETE
  TO authenticated
  USING (public.can_edit_child(child_id));

CREATE INDEX idx_activities_child ON public.activities(child_id);

-- 3. Birthday notification settings
CREATE TABLE public.birthday_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  notify_same_day boolean NOT NULL DEFAULT true,
  notify_day_before boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, child_id)
);

ALTER TABLE public.birthday_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own birthday settings"
  ON public.birthday_notification_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own birthday settings"
  ON public.birthday_notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own birthday settings"
  ON public.birthday_notification_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own birthday settings"
  ON public.birthday_notification_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_birthday_notification_settings_updated_at
  BEFORE UPDATE ON public.birthday_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();