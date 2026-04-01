-- Global matching settings (singleton row, id always = 1)
create table if not exists matching_settings (
  id              integer primary key default 1,
  matching_enabled boolean not null default true,
  match_frequency  text    not null default 'weekly',
  next_match_date  date,
  updated_at       timestamptz not null default now(),
  constraint singleton check (id = 1)
);

-- Seed the default row
insert into matching_settings (id, matching_enabled, match_frequency, next_match_date)
values (1, true, 'weekly', null)
on conflict (id) do nothing;

-- RLS: only service role can read/write by default
alter table matching_settings enable row level security;

-- Allow admins (is_admin = true) to read and update via the client
create policy "admins can read matching_settings"
  on matching_settings for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "admins can update matching_settings"
  on matching_settings for update
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.is_admin = true
    )
  );
