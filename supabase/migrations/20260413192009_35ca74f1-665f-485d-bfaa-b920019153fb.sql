
-- Add shareable flag to photos
ALTER TABLE public.photos ADD COLUMN is_shared boolean NOT NULL DEFAULT true;

-- Add role and relationship to family_shares
ALTER TABLE public.family_shares ADD COLUMN role text NOT NULL DEFAULT 'guest';
ALTER TABLE public.family_shares ADD COLUMN relationship text;

-- Helper: check if user is owner or parent (not guest)
CREATE OR REPLACE FUNCTION public.is_parent_of_child(child_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children WHERE id = child_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.family_shares
    WHERE child_id = child_uuid AND shared_with_user_id = auth.uid() AND role = 'parent'
  )
$$;

-- Update photos SELECT policy: guests only see shared photos
DROP POLICY "View photos for accessible children" ON public.photos;
CREATE POLICY "View photos for accessible children" ON public.photos
FOR SELECT TO authenticated
USING (
  public.is_parent_of_child(child_id)
  OR (
    is_shared = true
    AND EXISTS (
      SELECT 1 FROM public.family_shares
      WHERE child_id = photos.child_id
        AND shared_with_user_id = auth.uid()
        AND role = 'guest'
    )
  )
);

-- Update can_edit_child to only allow parents (not guests)
CREATE OR REPLACE FUNCTION public.can_edit_child(child_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_parent_of_child(child_uuid)
$$;
