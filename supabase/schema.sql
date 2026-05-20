create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists lunch_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  base_place_provider text not null default 'naver',
  base_place_id text not null,
  base_place_name text,
  base_latitude double precision not null,
  base_longitude double precision not null,
  radius_meters integer not null default 450,
  max_price integer not null default 14000,
  status text not null default 'draft',
  vote_reveal_at timestamptz not null,
  selected_restaurant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists restaurant_candidates (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lunch_sessions(id) on delete cascade,
  name text not null,
  category text,
  address text,
  road_address text,
  latitude double precision,
  longitude double precision,
  distance_meters integer,
  naver_map_url text,
  source text not null default 'naver',
  raw_title text,
  raw_category text,
  price_min integer,
  price_max integer,
  price_confidence text not null default 'UNKNOWN',
  is_likely_under_budget boolean not null default false,
  price_reason text,
  is_zeropay_likely boolean not null default false,
  zeropay_confidence text not null default 'UNKNOWN',
  zeropay_reason text,
  ai_summary text,
  ai_reason text,
  caution text,
  score numeric not null default 0,
  is_excluded boolean not null default false,
  exclude_reason text,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lunch_sessions(id) on delete cascade,
  restaurant_id uuid not null references restaurant_candidates(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  user_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists visit_histories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references lunch_sessions(id) on delete set null,
  restaurant_id uuid references restaurant_candidates(id) on delete set null,
  restaurant_name text not null,
  category text,
  visited_at date not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists rejected_restaurants (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null,
  reason text,
  rejected_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lunch_sessions(id) on delete cascade,
  model text,
  prompt jsonb,
  response jsonb,
  fallback_used boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

-- 이미 만들어진 테이블에는 위 create 가 무시되므로, 이후 추가된 컬럼들은 명시적으로 add column.
alter table restaurant_candidates add column if not exists is_zeropay_likely boolean not null default false;
alter table restaurant_candidates add column if not exists zeropay_confidence text not null default 'UNKNOWN';
alter table restaurant_candidates add column if not exists zeropay_reason text;
alter table restaurant_candidates add column if not exists official_url text;
alter table restaurant_candidates add column if not exists phone_number text;
alter table restaurant_candidates add column if not exists description text;

create index if not exists lunch_sessions_session_date_idx on lunch_sessions(session_date);
create index if not exists restaurant_candidates_session_id_idx on restaurant_candidates(session_id);
create index if not exists votes_session_id_idx on votes(session_id);
create index if not exists visit_histories_visited_at_idx on visit_histories(visited_at desc);

-- MVP: 사내 점심 추천이므로 publishable key(=anon)로도 모든 작업이 가능해야 한다.
-- Supabase는 RLS 비활성화를 권장하지 않으므로, RLS는 켜두되 anon/authenticated에 ALL 권한 정책을 둔다.
alter table users enable row level security;
alter table lunch_sessions enable row level security;
alter table restaurant_candidates enable row level security;
alter table votes enable row level security;
alter table visit_histories enable row level security;
alter table rejected_restaurants enable row level security;
alter table recommendation_logs enable row level security;

-- 기존 policy 가 있으면 새 정의로 교체 (idempotent)
drop policy if exists "open_access_users" on users;
drop policy if exists "open_access_lunch_sessions" on lunch_sessions;
drop policy if exists "open_access_restaurant_candidates" on restaurant_candidates;
drop policy if exists "open_access_votes" on votes;
drop policy if exists "open_access_visit_histories" on visit_histories;
drop policy if exists "open_access_rejected_restaurants" on rejected_restaurants;
drop policy if exists "open_access_recommendation_logs" on recommendation_logs;

create policy "open_access_users" on users for all to anon, authenticated using (true) with check (true);
create policy "open_access_lunch_sessions" on lunch_sessions for all to anon, authenticated using (true) with check (true);
create policy "open_access_restaurant_candidates" on restaurant_candidates for all to anon, authenticated using (true) with check (true);
create policy "open_access_votes" on votes for all to anon, authenticated using (true) with check (true);
create policy "open_access_visit_histories" on visit_histories for all to anon, authenticated using (true) with check (true);
create policy "open_access_rejected_restaurants" on rejected_restaurants for all to anon, authenticated using (true) with check (true);
create policy "open_access_recommendation_logs" on recommendation_logs for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on table users to anon, authenticated;
grant all on table lunch_sessions to anon, authenticated;
grant all on table restaurant_candidates to anon, authenticated;
grant all on table votes to anon, authenticated;
grant all on table visit_histories to anon, authenticated;
grant all on table rejected_restaurants to anon, authenticated;
grant all on table recommendation_logs to anon, authenticated;
