-- Prevent ownership transfer of children
DROP POLICY IF EXISTS "Users can update editable children" ON public.children;
CREATE POLICY "Users can update editable children" ON public.children FOR UPDATE TO authenticated
  USING (public.can_edit_child(id)) WITH CHECK (public.can_edit_child(id));

CREATE OR REPLACE FUNCTION public.prevent_child_owner_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS prevent_child_owner_change ON public.children;
CREATE TRIGGER prevent_child_owner_change BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.prevent_child_owner_change();

-- Display names only for self or family members
CREATE OR REPLACE FUNCTION public.get_display_name(_user_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.display_name FROM public.profiles p
  WHERE p.user_id = _user_id
    AND (
      _user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.family_shares fs
        WHERE (fs.family_owner_id = auth.uid() AND fs.shared_with_user_id = _user_id)
           OR (fs.family_owner_id = _user_id AND fs.shared_with_user_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM public.family_shares a JOIN public.family_shares b
        ON a.family_owner_id = b.family_owner_id
        WHERE a.shared_with_user_id = auth.uid() AND b.shared_with_user_id = _user_id)
    )
  LIMIT 1
$$;

-- Invitations only link with matching invite code
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, relationship)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'relationship');

  UPDATE public.family_shares
  SET shared_with_user_id = NEW.id
  WHERE shared_with_email = lower(NEW.email)
    AND shared_with_user_id IS NULL
    AND invite_code IS NOT NULL
    AND invite_code = (NEW.raw_user_meta_data->>'invite_code');
  RETURN NEW;
END;
$$;

-- Tags: predefined, own, or used on accessible photos
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
CREATE POLICY "Users view relevant tags" ON public.tags FOR SELECT TO authenticated
USING (
  is_predefined OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.photo_tags pt JOIN public.photos p ON p.id = pt.photo_id
             WHERE pt.tag_id = tags.id AND public.can_access_child(p.child_id))
);