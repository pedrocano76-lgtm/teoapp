ALTER TABLE public.events RENAME COLUMN date TO start_date;
ALTER TABLE public.events ADD COLUMN end_date date;
ALTER TABLE public.events ADD CONSTRAINT events_end_after_start_check CHECK (end_date IS NULL OR end_date >= start_date);