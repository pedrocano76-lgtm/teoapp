DROP POLICY IF EXISTS "View own shares" ON public.family_shares;

CREATE POLICY "View own share records"
ON public.family_shares
FOR SELECT
TO authenticated
USING (
  auth.uid() = family_owner_id
  OR auth.uid() = shared_by
  OR auth.uid() = shared_with_user_id
);

DROP POLICY IF EXISTS "Delete own photos" ON public.photos;

CREATE POLICY "Delete photos for editable children"
ON public.photos
FOR DELETE
TO authenticated
USING (
  auth.uid() = uploaded_by
  AND public.can_edit_child(child_id)
);