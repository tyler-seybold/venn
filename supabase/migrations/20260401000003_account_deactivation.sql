ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deactivated boolean not null default false;
