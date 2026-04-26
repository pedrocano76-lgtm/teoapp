-- Restrict family_shares SELECT so guests/parents can only see their own share record,
-- preventing exposure of other invitees' email addresses to fellow shared users.
DROP POLICY IF EXISTS "View own share records" ON public.family_shares;

CREATE POLICY "View own share records"
  ON public.family_shares
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = family_owner_id
    OR auth.uid() = shared_with_user_id
  );