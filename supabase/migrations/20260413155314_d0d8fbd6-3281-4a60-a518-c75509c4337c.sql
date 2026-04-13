-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🏷️',
  color TEXT NOT NULL DEFAULT 'primary',
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Everyone can view tags
CREATE POLICY "Authenticated users can view tags"
  ON public.tags FOR SELECT TO authenticated
  USING (true);

-- Users can create custom tags
CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR is_predefined = false);

GRANT SELECT, INSERT ON public.tags TO authenticated;

-- Create photo_tags junction table
CREATE TABLE public.photo_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(photo_id, tag_id)
);

ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View photo tags for accessible photos"
  ON public.photo_tags FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.photos p WHERE p.id = photo_id AND can_access_child(p.child_id)
  ));

CREATE POLICY "Manage photo tags for editable photos"
  ON public.photo_tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.photos p WHERE p.id = photo_id AND can_edit_child(p.child_id)
  ));

CREATE POLICY "Delete photo tags for editable photos"
  ON public.photo_tags FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.photos p WHERE p.id = photo_id AND can_edit_child(p.child_id)
  ));

GRANT SELECT, INSERT, DELETE ON public.photo_tags TO authenticated;

-- Insert predefined tags
INSERT INTO public.tags (name, icon, color, is_predefined) VALUES
  ('Birthday', '🎂', 'primary', true),
  ('School', '🏫', 'sky', true),
  ('Vacation', '🏖️', 'peach', true),
  ('Party', '🎉', 'lavender', true),
  ('Family', '👨‍👩‍👧‍👦', 'sage', true),
  ('Outdoors', '🌳', 'sage', true),
  ('Holiday', '🎄', 'primary', true),
  ('Sports', '⚽', 'sky', true),
  ('Arts', '🎨', 'lavender', true);