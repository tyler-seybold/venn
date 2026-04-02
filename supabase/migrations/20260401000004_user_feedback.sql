CREATE TABLE IF NOT EXISTS user_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(user_id) on delete set null,
  category   text not null,
  message    text not null,
  created_at timestamptz not null default now()
);
