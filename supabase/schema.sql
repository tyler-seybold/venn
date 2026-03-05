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

create table startup_members (
  id           uuid primary key default gen_random_uuid(),
  startup_id   uuid not null references startups (id) on delete cascade,
  user_id      uuid not null references profiles (user_id) on delete cascade,
  role         text not null check (role in ('primary', 'co-founder')),
  created_at   timestamptz not null default now(),
  unique (startup_id, user_id)
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
alter table startup_members enable row level security;

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

-- startups: primary founder or any co-founder can update
create policy "startups: update as member"
  on startups for update
  to authenticated
  using (
    founder_id = auth.uid()
    or exists (
      select 1 from startup_members
      where startup_id = id
      and user_id = auth.uid()
    )
  );

-- startups: users can delete their own startups
create policy "startups: delete own"
  on startups for delete
  to authenticated
  using (founder_id = auth.uid());

-- startup_members: any authenticated user can read
create policy "startup_members: authenticated read"
  on startup_members for select
  to authenticated
  using (true);

-- startup_members: only the primary founder can add members
create policy "startup_members: primary founder insert"
  on startup_members for insert
  to authenticated
  with check (
    exists (
      select 1 from startups
      where id = startup_id
      and founder_id = auth.uid()
    )
  );

-- startup_members: primary founder can remove any member; members can remove themselves
create policy "startup_members: delete"
  on startup_members for delete
  to authenticated
  using (
    exists (
      select 1 from startups
      where id = startup_id
      and founder_id = auth.uid()
    )
    or user_id = auth.uid()
  );
