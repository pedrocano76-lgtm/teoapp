
-- Step 1: Add family_owner_id
ALTER TABLE public.family_shares ADD COLUMN family_owner_id uuid;

-- Step 2: Populate from children table
UPDATE public.family_shares fs
SET family_owner_id = c.owner_id
FROM public.children c
WHERE fs.child_id = c.id;

-- Step 3: Set default for any orphaned rows and make NOT NULL
UPDATE public.family_shares SET family_owner_id = shared_by WHERE family_owner_id IS NULL;
ALTER TABLE public.family_shares ALTER COLUMN family_owner_id SET NOT NULL;

-- Step 4: Drop ALL policies that reference child_id on family_shares
DROP POLICY IF EXISTS "Create shares for own children" ON public.family_shares;
DROP POLICY IF EXISTS "Create shares for own family" ON public.family_shares;
DROP POLICY IF EXISTS "View own shares" ON public.family_shares;
DROP POLICY IF EXISTS "Delete own shares" ON public.family_shares;

-- Step 5: Drop policy on photos that references family_shares.child_id
DROP POLICY IF EXISTS "View photos for accessible children" ON public.photos;

-- Step 6: Drop child_id
ALTER TABLE public.family_shares DROP COLUMN child_id;

-- Step 7: Add unique constraint
ALTER TABLE public.family_shares ADD CONSTRAINT family_shares_owner_email_unique UNIQUE (family_owner_id, shared_with_email);

-- Step 8: Recreate family_shares policies
CREATE POLICY "Create shares for own family" ON public.family_shares
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = family_owner_id);

CREATE POLICY "View own shares" ON public.family_shares
FOR SELECT TO authenticated
USING (auth.uid() = family_owner_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Delete own shares" ON public.family_shares
FOR DELETE TO authenticated
USING (auth.uid() = family_owner_id);

-- Step 9: Update helper functions
CREATE OR REPLACE FUNCTION public.can_access_child(child_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children WHERE id = child_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.children c
    JOIN public.family_shares fs ON fs.family_owner_id = c.owner_id
    WHERE c.id = child_uuid AND fs.shared_with_user_id = auth.uid()
  )
$$;

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
    SELECT 1 FROM public.children c
    JOIN public.family_shares fs ON fs.family_owner_id = c.owner_id
    WHERE c.id = child_uuid AND fs.shared_with_user_id = auth.uid() AND fs.role = 'parent'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_child(child_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_parent_of_child(child_uuid)
$$;

-- Step 10: Recreate photos SELECT policy
CREATE POLICY "View photos for accessible children" ON public.photos
FOR SELECT TO authenticated
USING (
  public.is_parent_of_child(child_id)
  OR (
    is_shared = true
    AND EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.family_shares fs ON fs.family_owner_id = c.owner_id
      WHERE c.id = photos.child_id
        AND fs.shared_with_user_id = auth.uid()
        AND fs.role = 'guest'
    )
  )
);
