ALTER TABLE public.photos ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.photos DROP CONSTRAINT photos_uploaded_by_fkey;
ALTER TABLE public.photos ADD CONSTRAINT photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.account_deletion_files(target_user uuid)
RETURNS TABLE(bucket text, path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH owned AS (SELECT id FROM public.children WHERE owner_id = target_user),
  referenced AS (
    SELECT 'photos'::text AS bucket, p.storage_path AS path FROM public.photos p JOIN owned c ON c.id = p.child_id
    UNION SELECT 'photos', p.thumbnail_path FROM public.photos p JOIN owned c ON c.id = p.child_id WHERE p.thumbnail_path IS NOT NULL
    UNION SELECT 'photos', c.profile_photo_path FROM public.children c WHERE c.owner_id = target_user AND c.profile_photo_path IS NOT NULL
  )
  SELECT bucket, path FROM referenced WHERE path IS NOT NULL AND path <> ''
  UNION
  SELECT o.bucket_id, o.name FROM storage.objects o
  WHERE (o.bucket_id = 'avatars' AND split_part(o.name, '/', 1) = target_user::text)
    OR (o.bucket_id = 'photos' AND EXISTS (
      SELECT 1 FROM owned c WHERE split_part(o.name, '/', 2) = c.id::text
      OR (split_part(o.name, '/', 1) = 'profiles' AND split_part(o.name, '/', 3) LIKE c.id::text || '\_%' ESCAPE '\')
    ));
$$;
REVOKE ALL ON FUNCTION public.account_deletion_files(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_deletion_files(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_account_data(target_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE child_ids uuid[]; user_email text;
BEGIN
  -- Lock owned children against concurrent inserts/edits before the final file check.
  PERFORM id FROM public.children WHERE owner_id = target_user FOR UPDATE;
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO child_ids FROM public.children WHERE owner_id = target_user;
  SELECT email INTO user_email FROM auth.users WHERE id = target_user;
  IF user_email IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.account_deletion_files(target_user) f JOIN storage.objects o ON o.bucket_id = f.bucket AND o.name = f.path) THEN
    RAISE EXCEPTION 'Files remain in Storage; account was not deleted';
  END IF;
  DELETE FROM public.notifications WHERE user_id = target_user OR data->>'child_id' = ANY(SELECT unnest(child_ids)::text);
  DELETE FROM public.birthday_notification_settings WHERE user_id = target_user OR child_id = ANY(child_ids);
  DELETE FROM public.photo_tags WHERE photo_id IN (SELECT id FROM public.photos WHERE child_id = ANY(child_ids));
  DELETE FROM public.photos WHERE child_id = ANY(child_ids);
  DELETE FROM public.events WHERE child_id = ANY(child_ids);
  DELETE FROM public.activities WHERE child_id = ANY(child_ids);
  DELETE FROM public.family_shares WHERE family_owner_id = target_user OR shared_by = target_user OR shared_with_user_id = target_user OR (shared_with_user_id IS NULL AND lower(shared_with_email) = lower(user_email));
  DELETE FROM public.children WHERE owner_id = target_user;
  -- Tags still used by another family are retained, without the deleted user's reference.
  DELETE FROM public.tags WHERE created_by = target_user AND NOT is_predefined AND NOT EXISTS (SELECT 1 FROM public.photo_tags WHERE tag_id = tags.id);
  UPDATE public.tags SET created_by = NULL WHERE created_by = target_user;
  DELETE FROM public.reminder_settings WHERE user_id = target_user;
  DELETE FROM public.profiles WHERE user_id = target_user;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;
GRANT ALL ON public.children, public.photos, public.photo_tags, public.tags, public.events, public.activities, public.family_shares, public.notifications, public.birthday_notification_settings, public.reminder_settings, public.profiles TO service_role;