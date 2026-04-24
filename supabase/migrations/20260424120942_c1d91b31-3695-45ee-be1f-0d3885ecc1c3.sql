CREATE INDEX IF NOT EXISTS idx_photos_child_taken 
  ON photos(child_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_taken 
  ON photos(taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_event 
  ON photos(event_id) WHERE event_id IS NOT NULL;