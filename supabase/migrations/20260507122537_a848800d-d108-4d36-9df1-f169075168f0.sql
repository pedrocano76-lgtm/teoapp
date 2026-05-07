-- Restrict listing of avatars: bucket remains public (URLs accessible),
-- but SELECT via API is scoped to the owner's folder to prevent enumeration.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

CREATE POLICY "Users can view own avatar"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
