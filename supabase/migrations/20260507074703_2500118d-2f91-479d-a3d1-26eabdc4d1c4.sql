-- Drop legacy permissive storage SELECT policy that bypasses is_shared
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;

-- Restrict SECURITY DEFINER helper functions to authenticated only
REVOKE EXECUTE ON FUNCTION public.can_access_child(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_child(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_parent_of_child(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_guest_of_child(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_guest_of_child(uuid) TO authenticated;