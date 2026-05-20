-- ai-lunch-picker MVP — RLS policies for publishable/anon key
-- 이미 schema.sql을 적용했지만 INSERT/UPDATE가 RLS로 막혀있다면 이 파일만 다시 한 번 실행하면 된다.
-- idempotent (drop policy if exists → create policy)

alter table users enable row level security;
alter table lunch_sessions enable row level security;
alter table restaurant_candidates enable row level security;
alter table votes enable row level security;
alter table visit_histories enable row level security;
alter table rejected_restaurants enable row level security;
alter table recommendation_logs enable row level security;

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
