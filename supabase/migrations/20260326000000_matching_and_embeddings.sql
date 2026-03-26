-- ============================================================
-- MIGRATION: matching engine + embeddings
-- ============================================================
-- Adds matching fields to profiles and startups, creates the
-- matches table, enables pgvector, and wires up RLS + indexes.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

create extension if not exists vector;


-- ============================================================
-- 1. PROFILES — new matching + embedding columns
-- ============================================================
-- Note: skills text[] and industries text[] already exist; skipped here.

alter table profiles
  add column if not exists industry_openness    text
    check (industry_openness in ('strong_preferences', 'some_preferences', 'open_to_anything')),
  add column if not exists role_orientation     text[],
  add column if not exists cofounder_interest   boolean,
  add column if not exists looking_for          text,
  add column if not exists intent_tags          text[],
  add column if not exists personality_quiz     jsonb,
  add column if not exists completeness_score   integer not null default 0,
  add column if not exists matching_opt_in      boolean not null default false,
  add column if not exists cadence_preference   text not null default 'weekly',
  add column if not exists embedding            vector(1536);


-- ============================================================
-- 2. STARTUPS — new matching + embedding columns
-- ============================================================

alter table startups
  add column if not exists problem_statement    text,
  add column if not exists skills_needed        text[],
  add column if not exists open_to_interns      boolean not null default false,
  add column if not exists open_to_cofounders   boolean not null default false,
  add column if not exists embedding            vector(1536);


-- ============================================================
-- 3. MATCHES TABLE
-- ============================================================
-- user_id_1 / user_id_2 are intentionally untyped uuids:
--   people_people   → both reference profiles.user_id
--   people_startup  → user_id_1 = profiles.user_id, user_id_2 = startups.id
--   startup_startup → both reference startups.id
-- Foreign keys are omitted to support all three match types.

create table if not exists matches (
  id                  uuid        primary key default gen_random_uuid(),
  user_id_1           uuid        not null,
  user_id_2           uuid        not null,
  match_type          text        not null
    check (match_type in ('people_people', 'people_startup', 'startup_startup')),
  match_score         float,
  blurb               text,
  week_of             date,
  feedback_1          text check (feedback_1 in ('up', 'down')),
  feedback_1_reason   text,
  feedback_2          text check (feedback_2 in ('up', 'down')),
  feedback_2_reason   text,
  created_at          timestamptz not null default now()
);


-- ============================================================
-- 4. RLS — matches
-- ============================================================

alter table matches enable row level security;

-- Users can read any match they appear in (covers people_people;
-- startup members should rely on service-role reads for other types).
create policy "matches: read own"
  on matches for select
  to authenticated
  using (user_id_1 = auth.uid() or user_id_2 = auth.uid());

-- Users can update feedback fields on their own matches.
create policy "matches: update own feedback"
  on matches for update
  to authenticated
  using  (user_id_1 = auth.uid() or user_id_2 = auth.uid())
  with check (user_id_1 = auth.uid() or user_id_2 = auth.uid());

-- Match rows are created by the service role (background job);
-- no authenticated-user insert policy is granted here.


-- ============================================================
-- 5. VECTOR INDEXES (HNSW — fast approximate nearest-neighbour)
-- ============================================================

create index if not exists profiles_embedding_hnsw_idx
  on profiles using hnsw (embedding vector_cosine_ops);

create index if not exists startups_embedding_hnsw_idx
  on startups using hnsw (embedding vector_cosine_ops);
