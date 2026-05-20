# AI Lunch Picker

Next.js + Supabase 기반 점심 추천 및 투표 MVP입니다.

## 구현 범위

- 네이버 지도 `placeId=34354907` 기준 반경 450m 정책
- 네이버 지역 검색 API, 네이버 Maps Geocoding API 클라이언트
- API 키가 없을 때 로컬 검증용 샘플 후보 fallback
- 14,000원 이하 가능성 추정과 가격 신뢰도 표시
- 거리, 가격, 카테고리, 최근 방문, 투표 선호도 기반 점수화
- OpenRouter 추천 이유 생성과 룰 기반 fallback
- 이름 + localStorage 기반 MVP 사용자 식별
- 11:20 전 익명, 11:20 이후 투표자 공개 정책
- 추천 후보, 투표, 결과 공개, 최근 결과 화면

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 연다.

## 환경변수

`.env.example`을 `.env.local`로 복사한 뒤 필요한 값을 채운다.

```bash
cp .env.example .env.local
```

외부 API 키가 없으면 샘플 후보와 룰 기반 추천으로 동작한다.

## Supabase

### 1) 스키마 적용 (1회만)

가장 확실한 방법:

1. Supabase Dashboard → 본인 프로젝트 → **SQL Editor** 열기
2. `supabase/schema.sql` 전체 내용 붙여넣고 실행
3. (또는 `npm run db:copy` 한 줄로 클립보드 복사 + SQL Editor 자동 오픈)

스크립트를 통한 자동 적용도 시도할 수 있다 (네트워크에서 Supabase pooler에 도달 가능할 때만):

```bash
npm run db:apply
```

> 무료 티어 Supabase는 direct DB가 IPv6 전용이라 일부 환경에서 도달이 안 된다. 그 경우 위 SQL Editor 방식이 안전하다.

### 2) 키 정책

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(또는 `..._ANON_KEY`)는 브라우저/서버 모두에서 사용 가능한 public 키다. 스키마에 `disable row level security`를 명시했기 때문에 publishable key로도 INSERT/UPDATE가 동작한다 (사내 점심 도구용 MVP 정책).
- 운영 단계에서는 `SUPABASE_SERVICE_ROLE_KEY`를 채워 admin 권한으로 호출하고, RLS 정책을 다시 enable 해야 한다.
- 키가 없거나 테이블이 아직 안 만들어졌으면 앱은 **자동으로 in-memory fallback**으로 동작한다 → 첫 데모/검증 시 DB가 없어도 UI가 막히지 않는다.

## 검증

```bash
npm run test
npm run build
```
