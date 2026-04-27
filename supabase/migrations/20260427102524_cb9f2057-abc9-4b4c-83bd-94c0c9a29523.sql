-- 1) Restrict family_shares SELECT: split owner-vs-invitee visibility
DROP POLICY IF EXISTS "View own share records" ON public.family_shares;

-- Owner sees full row (including invite_code)
CREATE POLICY "Owner views own share records"
ON public.family_shares
FOR SELECT
TO authenticated
USING (auth.uid() = family_owner_id);

-- Create a safe view for invitees that excludes invite_code
CREATE OR REPLACE VIEW public.my_family_memberships
WITH (security_invoker = true)
AS
SELECT
  id,
  family_owner_id,
  shared_by,
  shared_with_email,
  shared_with_user_id,
  role,
  relationship,
  can_edit,
  created_at
FROM public.family_shares
WHERE shared_with_user_id = auth.uid();

GRANT SELECT ON public.my_family_memberships TO authenticated;

-- Invitees can still SELECT their own row directly (needed for app queries),
-- but invite_code remains technically readable via direct select.
-- To fully hide it, null it from invitee perspective by limiting select to the view only.
-- We add a SELECT policy so invitees can read their own row WITHOUT exposing invite_code
-- by relying on the app to use the view OR by trimming via a column-level approach:
-- Postgres lacks per-column RLS, so we keep direct select for invitees disabled and
-- require the app to use the view.
-- (Owner policy above remains.)


-- 2) Photos UPDATE: require uploader match (parity with DELETE)
DROP POLICY IF EXISTS "Update photos for editable children" ON public.photos;

CREATE POLICY "Update own photos for editable children"
ON public.photos
FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by AND can_edit_child(child_id))
WITH CHECK (auth.uid() = uploaded_by AND can_edit_child(child_id));


-- 3) photo_tags: add explicit restrictive UPDATE policy (deny all updates)
CREATE POLICY "No updates allowed on photo_tags"
ON public.photo_tags
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);


-- 4) Lock down SECURITY DEFINER helper functions: revoke from anon/public
REVOKE EXECUTE ON FUNCTION public.can_edit_child(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_access_child(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_parent_of_child(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public, authenticated;

-- Ensure authenticated users can still call the RLS helpers (used by policies)
GRANT EXECUTE ON FUNCTION public.can_edit_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of_child(uuid) TO authenticated;
