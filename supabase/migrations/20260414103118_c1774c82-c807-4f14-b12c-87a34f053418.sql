
-- Cloud connections table
CREATE TABLE public.cloud_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'onedrive',
  folder_path TEXT,
  folder_name TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cloud_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cloud connections"
  ON public.cloud_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cloud connections"
  ON public.cloud_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cloud connections"
  ON public.cloud_connections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cloud connections"
  ON public.cloud_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_cloud_connections_updated_at
  BEFORE UPDATE ON public.cloud_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pending imports table
CREATE TABLE public.pending_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  cloud_connection_id UUID NOT NULL REFERENCES public.cloud_connections(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'onedrive',
  external_id TEXT NOT NULL,
  thumbnail_url TEXT,
  full_image_url TEXT,
  file_name TEXT,
  taken_at TIMESTAMP WITH TIME ZONE,
  confidence_score DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cloud_connection_id, external_id)
);

ALTER TABLE public.pending_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending imports"
  ON public.pending_imports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pending imports"
  ON public.pending_imports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending imports"
  ON public.pending_imports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending imports"
  ON public.pending_imports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_pending_imports_status ON public.pending_imports(user_id, status);
CREATE INDEX idx_pending_imports_child ON public.pending_imports(child_id);
