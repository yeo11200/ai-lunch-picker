-- 카드 정보 보강용 신규 컬럼 추가 (idempotent)
alter table restaurant_candidates add column if not exists official_url text;
alter table restaurant_candidates add column if not exists phone_number text;
alter table restaurant_candidates add column if not exists description text;
