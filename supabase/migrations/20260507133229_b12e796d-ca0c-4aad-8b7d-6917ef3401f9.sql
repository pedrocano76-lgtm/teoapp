DROP POLICY IF EXISTS "Delete photos for editable children" ON public.photos;
CREATE POLICY "Delete photos for editable children"
ON public.photos
FOR DELETE
TO authenticated
USING (public.can_edit_child(child_id));

DROP POLICY IF EXISTS "Users delete own photos in photos bucket" ON storage.objects;
CREATE POLICY "Users delete editable child photos in photos bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1
    FROM public.photos p
    WHERE (p.storage_path = storage.objects.name OR p.thumbnail_path = storage.objects.name)
      AND public.can_edit_child(p.child_id)
  )
);