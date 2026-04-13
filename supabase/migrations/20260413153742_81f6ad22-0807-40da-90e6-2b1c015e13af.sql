-- Drop and recreate children policies targeting authenticated role
DROP POLICY IF EXISTS "Users can insert own children" ON public.children;
CREATE POLICY "Users can insert own children"
  ON public.children FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view accessible children" ON public.children;
CREATE POLICY "Users can view accessible children"
  ON public.children FOR SELECT TO authenticated
  USING (can_access_child(id));

DROP POLICY IF EXISTS "Users can update editable children" ON public.children;
CREATE POLICY "Users can update editable children"
  ON public.children FOR UPDATE TO authenticated
  USING (can_edit_child(id));

DROP POLICY IF EXISTS "Users can delete own children" ON public.children;
CREATE POLICY "Users can delete own children"
  ON public.children FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Insert events for editable children" ON public.events;
CREATE POLICY "Insert events for editable children"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (can_edit_child(child_id));

DROP POLICY IF EXISTS "View events for accessible children" ON public.events;
CREATE POLICY "View events for accessible children"
  ON public.events FOR SELECT TO authenticated
  USING (can_access_child(child_id));

DROP POLICY IF EXISTS "Update events for editable children" ON public.events;
CREATE POLICY "Update events for editable children"
  ON public.events FOR UPDATE TO authenticated
  USING (can_edit_child(child_id));

DROP POLICY IF EXISTS "Delete events for editable children" ON public.events;
CREATE POLICY "Delete events for editable children"
  ON public.events FOR DELETE TO authenticated
  USING (can_edit_child(child_id));

DROP POLICY IF EXISTS "Insert photos for editable children" ON public.photos;
CREATE POLICY "Insert photos for editable children"
  ON public.photos FOR INSERT TO authenticated
  WITH CHECK (can_edit_child(child_id));

DROP POLICY IF EXISTS "View photos for accessible children" ON public.photos;
CREATE POLICY "View photos for accessible children"
  ON public.photos FOR SELECT TO authenticated
  USING (can_access_child(child_id));

DROP POLICY IF EXISTS "Update photos for editable children" ON public.photos;
CREATE POLICY "Update photos for editable children"
  ON public.photos FOR UPDATE TO authenticated
  USING (can_edit_child(child_id));

DROP POLICY IF EXISTS "Delete own photos" ON public.photos;
CREATE POLICY "Delete own photos"
  ON public.photos FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Create shares for own children" ON public.family_shares;
CREATE POLICY "Create shares for own children"
  ON public.family_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shared_by AND EXISTS (
    SELECT 1 FROM children WHERE children.id = family_shares.child_id AND children.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "View own shares" ON public.family_shares;
CREATE POLICY "View own shares"
  ON public.family_shares FOR SELECT TO authenticated
  USING (auth.uid() = shared_by OR auth.uid() = shared_with_user_id);

DROP POLICY IF EXISTS "Delete own shares" ON public.family_shares;
CREATE POLICY "Delete own shares"
  ON public.family_shares FOR DELETE TO authenticated
  USING (auth.uid() = shared_by);