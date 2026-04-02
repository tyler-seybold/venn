ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matching_paused_until timestamptz;
