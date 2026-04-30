-- Restrict guests' access to metadata tables and storage objects for non-shared photos

-- Helper: is the current user a guest (non-parent) for this child?
CREATE OR REPLACE FUNCTION public.is_guest_of_child(child_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.children c
    JOIN public.family_shares fs ON fs.family_owner_id = c.owner_id
    WHERE c.id = child_uuid
      AND fs.shared_with_user_id = auth.uid()
      AND fs.role = 'guest'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.children WHERE id = child_uuid AND owner_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.children c
    JOIN public.family_shares fs ON fs.family_owner_id = c.owner_id
    WHERE c.id = child_uuid
      AND fs.shared_with_user_id = auth.uid()
      AND fs.role = 'parent'
  );
$$;

-- EVENTS: guests can only see events tied to at least one shared photo for that child
DROP POLICY IF EXISTS "View events for accessible children" ON public.events;
CREATE POLICY "View events for accessible children"
ON public.events
FOR SELECT
TO authenticated
USING (
  can_access_child(child_id)
  AND (
    NOT public.is_guest_of_child(child_id)
    OR EXISTS (
      SELECT 1 FROM public.photos p
      WHERE p.event_id = events.id AND p.is_shared = true
    )
  )
);

-- ACTIVITIES: hide from guests entirely (activities are not photo-linked)
DROP POLICY IF EXISTS "View activities for accessible children" ON public.activities;
CREATE POLICY "View activities for accessible children"
ON public.activities
FOR SELECT
TO authenticated
USING (
  can_access_child(child_id)
  AND NOT public.is_guest_of_child(child_id)
);

-- PHOTO_TAGS: guests can only see tags attached to shared photos
DROP POLICY IF EXISTS "View photo tags for accessible photos" ON public.photo_tags;
CREATE POLICY "View photo tags for accessible photos"
ON public.photo_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_tags.photo_id
      AND can_access_child(p.child_id)
      AND (
        NOT public.is_guest_of_child(p.child_id)
        OR p.is_shared = true
      )
  )
);

-- STORAGE: tighten SELECT on photos bucket to mirror photos table SELECT logic
DROP POLICY IF EXISTS "Users can view photos in accessible bucket paths" ON storage.objects;
DROP POLICY IF EXISTS "View photos in accessible bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view accessible photos" ON storage.objects;
DROP POLICY IF EXISTS "View photos for accessible children storage" ON storage.objects;

CREATE POLICY "View photos storage for accessible children"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE (p.storage_path = storage.objects.name OR p.thumbnail_path = storage.objects.name)
      AND (
        public.is_parent_of_child(p.child_id)
        OR (p.is_shared = true AND public.can_access_child(p.child_id))
      )
  )
);
