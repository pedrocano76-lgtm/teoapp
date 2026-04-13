-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Children
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Family shares
CREATE TABLE public.family_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.family_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_shares ADD CONSTRAINT fk_family_shares_child
FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;

-- Helper: can user access child?
CREATE OR REPLACE FUNCTION public.can_access_child(child_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children WHERE id = child_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.family_shares
    WHERE child_id = child_uuid AND shared_with_user_id = auth.uid()
  )
$$;

-- Helper: can user edit child?
CREATE OR REPLACE FUNCTION public.can_edit_child(child_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children WHERE id = child_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.family_shares
    WHERE child_id = child_uuid AND shared_with_user_id = auth.uid() AND can_edit = true
  )
$$;

-- Children policies
CREATE POLICY "Users can view accessible children" ON public.children
FOR SELECT USING (public.can_access_child(id));
CREATE POLICY "Users can insert own children" ON public.children
FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update editable children" ON public.children
FOR UPDATE USING (public.can_edit_child(id));
CREATE POLICY "Users can delete own children" ON public.children
FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON public.children
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events/milestones
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⭐',
  date DATE NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View events for accessible children" ON public.events FOR SELECT USING (public.can_access_child(child_id));
CREATE POLICY "Insert events for editable children" ON public.events FOR INSERT WITH CHECK (public.can_edit_child(child_id));
CREATE POLICY "Update events for editable children" ON public.events FOR UPDATE USING (public.can_edit_child(child_id));
CREATE POLICY "Delete events for editable children" ON public.events FOR DELETE USING (public.can_edit_child(child_id));

-- Photos
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View photos for accessible children" ON public.photos FOR SELECT USING (public.can_access_child(child_id));
CREATE POLICY "Insert photos for editable children" ON public.photos FOR INSERT WITH CHECK (public.can_edit_child(child_id));
CREATE POLICY "Update photos for editable children" ON public.photos FOR UPDATE USING (public.can_edit_child(child_id));
CREATE POLICY "Delete own photos" ON public.photos FOR DELETE USING (auth.uid() = uploaded_by);

-- Family shares policies
CREATE POLICY "View own shares" ON public.family_shares FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with_user_id);
CREATE POLICY "Create shares for own children" ON public.family_shares FOR INSERT WITH CHECK (
  auth.uid() = shared_by AND EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND owner_id = auth.uid())
);
CREATE POLICY "Delete own shares" ON public.family_shares FOR DELETE USING (auth.uid() = shared_by);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
CREATE POLICY "Auth users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);