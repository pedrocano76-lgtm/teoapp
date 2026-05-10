-- Allow any user with edit access to a child to update its photos
-- (previously restricted to the original uploader, which silently broke
-- "Add photos to event" for parents/owners editing others' photos).
DROP POLICY IF EXISTS "Update own photos for editable children" ON public.photos;

CREATE POLICY "Update photos for editable children"
ON public.photos
FOR UPDATE
TO authenticated
USING (can_edit_child(child_id))
WITH CHECK (can_edit_child(child_id));