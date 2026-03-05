-- ============================================================
-- TYPES
-- ============================================================

create type startup_stage as enum (
  'Ideation',
  'MVP',
  'Beta Client/Pilot',
  'Revenue-generating'
);

-- ============================================================
-- TABLES
-- ============================================================

create table profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  email        text,
  bio          text,
  skills                  text[],
  industries_of_interest  text[],
  is_looking_for_startup  boolean not null default false,
  graduation_year         integer,
  degree_program          text,
  avatar_url              text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table startups (
  id                uuid primary key default gen_random_uuid(),
  founder_id        uuid not null references profiles (user_id) on delete cascade,
  startup_name      text not null,
  logo_url          text,
  founders_display  text,
  industry          text[],
  stage             startup_stage,
  description       text check (char_length(description) <= 200),
  website_url       text,
  current_ask       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger startups_updated_at
  before update on startups
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table startups  enable row level security;

-- profiles: any authenticated user can read
create policy "profiles: authenticated read"
  on profiles for select
  to authenticated
  using (true);

-- profiles: users can insert their own profile
create policy "profiles: insert own"
  on profiles for insert
  to authenticated
  with check (user_id = auth.uid());

-- profiles: users can update their own profile
create policy "profiles: update own"
  on profiles for update
  to authenticated
  using (user_id = auth.uid());

-- profiles: users can delete their own profile
create policy "profiles: delete own"
  on profiles for delete
  to authenticated
  using (user_id = auth.uid());

-- startups: any authenticated user can read
create policy "startups: authenticated read"
  on startups for select
  to authenticated
  using (true);

-- startups: users can insert startups linked to their profile
create policy "startups: insert own"
  on startups for insert
  to authenticated
  with check (founder_id = auth.uid());

-- startups: users can update their own startups
create policy "startups: update own"
  on startups for update
  to authenticated
  using (founder_id = auth.uid());

-- startups: users can delete their own startups
create policy "startups: delete own"
  on startups for delete
  to authenticated
  using (founder_id = auth.uid());
