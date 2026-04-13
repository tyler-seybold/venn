ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS moderation_status text,
  ADD COLUMN IF NOT EXISTS moderation_flags  jsonb;

ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS moderation_status text,
  ADD COLUMN IF NOT EXISTS moderation_flags  jsonb;
