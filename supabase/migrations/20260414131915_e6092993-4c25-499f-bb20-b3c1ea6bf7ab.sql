-- Allow users to update their own custom tags
CREATE POLICY "Users can update own tags"
ON public.tags
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND is_predefined = false)
WITH CHECK (created_by = auth.uid() AND is_predefined = false);

-- Allow users to delete their own custom tags
CREATE POLICY "Users can delete own tags"
ON public.tags
FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND is_predefined = false);