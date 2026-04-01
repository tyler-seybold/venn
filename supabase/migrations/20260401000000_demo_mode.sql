-- Add demo_mode flag to profiles.
-- When true (admin-only), the dashboard shows hardcoded demo match cards
-- instead of real matches, and displays a demo banner.

alter table profiles
  add column if not exists demo_mode boolean not null default false;
