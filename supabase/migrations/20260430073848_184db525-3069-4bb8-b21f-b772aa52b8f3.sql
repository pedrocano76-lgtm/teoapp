-- 1. Allow shared users to view their own share record
CREATE POLICY "Shared users view own share record"
ON public.family_shares
FOR SELECT
TO authenticated
USING (shared_with_user_id = auth.uid());

-- 2. Consolidate storage DELETE policies on the 'photos' bucket
DROP POLICY IF EXISTS "Authenticated users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

CREATE POLICY "Users delete own photos in photos bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.storage_path = storage.objects.name
      AND p.uploaded_by = auth.uid()
  )
);
