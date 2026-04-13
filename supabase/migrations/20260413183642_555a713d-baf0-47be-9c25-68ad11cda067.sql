ALTER TABLE public.photos ADD COLUMN location_lat DOUBLE PRECISION;
ALTER TABLE public.photos ADD COLUMN location_lng DOUBLE PRECISION;
ALTER TABLE public.photos ADD COLUMN location_name TEXT;