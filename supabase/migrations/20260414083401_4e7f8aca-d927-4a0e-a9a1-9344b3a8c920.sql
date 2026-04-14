
-- Fix photos DELETE policy to also require child access
DROP POLICY IF EXISTS "Delete own photos" ON public.photos;
CREATE POLICY "Delete own photos"
ON public.photos
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by AND can_access_child(child_id));
