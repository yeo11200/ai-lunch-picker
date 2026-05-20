import type { BaseLocation } from '@/features/lunch/types/lunch.types';

const handleReadNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const handleGetBaseLocation = (): BaseLocation => {
  const latitude = handleReadNumber(process.env.BASE_LATITUDE, 37.500736);
  const longitude = handleReadNumber(process.env.BASE_LONGITUDE, 127.036377);
  const radiusMeters = handleReadNumber(process.env.BASE_RADIUS_METERS, 450);
  const placeId = process.env.BASE_PLACE_ID ?? '34354907';

  return {
    provider: process.env.BASE_PLACE_PROVIDER ?? 'naver',
    placeId,
    name: process.env.BASE_PLACE_NAME ?? '기준 장소',
    mapUrl: `https://map.naver.com/p/entry/place/${placeId}`,
    latitude,
    longitude,
    radiusMeters,
  };
};

export const handleGetMaxLunchPrice = () => {
  return handleReadNumber(process.env.MAX_LUNCH_PRICE, 14000);
};

export const handleGetVoteRevealAt = (date = new Date()) => {
  const revealTime = process.env.VOTE_REVEAL_TIME ?? '11:20';
  const [hours = '11', minutes = '20'] = revealTime.split(':');
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TIMEZONE ?? 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const sessionDate = formatter.format(date);

  return new Date(`${sessionDate}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00+09:00`);
};

export const handleGetSessionDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TIMEZONE ?? 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

// 검색어를 매일 다른 12개로 회전. 점심특화 + 카테고리 다양 + 가격 키워드 포함.
const SEARCH_QUERY_POOL = [
  // 점심특화 키워드 — 점심 영업/메뉴를 우선적으로 노출
  '역삼 점심특선',
  '역삼 점심메뉴',
  '역삼 런치',
  '역삼 직장인 점심',
  '역삼 점심 1만원',
  '역삼 가성비 점심',
  '역삼 한식뷔페',
  '역삼 점심 뷔페',
  // 한식 카테고리
  '역삼 한식',
  '역삼 백반',
  '역삼 국밥',
  '역삼 찌개',
  '역삼 비빔밥',
  '역삼 콩나물국밥',
  '역삼 해장국',
  '역삼 순두부',
  '역삼 분식',
  '역삼 김밥',
  '역삼 떡볶이',
  '역삼 김치찌개',
  // 일식 카테고리
  '역삼 돈까스',
  '역삼 일식',
  '역삼 라멘',
  '역삼 우동',
  '역삼 카레',
  '역삼 덮밥',
  '역삼 규동',
  // 중식·아시안
  '역삼 중식',
  '역삼 짬뽕',
  '역삼 마라탕',
  '역삼 쌀국수',
  '역삼 분짜',
  // 양식·기타
  '역삼 샐러드',
  '역삼 포케',
  '역삼 도시락',
  '역삼 샌드위치',
  '역삼 파스타',
  '강남 점심',
];

const DAILY_QUERY_COUNT = 12;

// 32-bit string hash (FNV-1a)
const handleHashString = (input: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

// 날짜 기반 시드로 풀에서 N개를 회전 선택. 매일 다른 조합이지만 같은 날 안에서는 안정적.
const handlePickDailyQueries = (date = new Date()): string[] => {
  const dayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TIMEZONE ?? 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const seed = handleHashString(dayKey);
  const indices = Array.from({ length: SEARCH_QUERY_POOL.length }, (_, index) => index);

  // 결정론적이지만 날짜마다 다른 순서로 섞기 (Fisher-Yates 변형, seed 기반)
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = handleHashString(`${dayKey}-${i}`) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, DAILY_QUERY_COUNT).map((index) => SEARCH_QUERY_POOL[index]);
};

// backward-compat — 호출 시점의 날짜 기준으로 매번 계산되므로 dev 재시작 없이 매일 다른 조합이 나옴.
export const getSearchQueriesForToday = () => handlePickDailyQueries();
export const SEARCH_QUERIES = new Proxy([] as string[], {
  get(_target, prop) {
    const queries = handlePickDailyQueries();
    return queries[prop as keyof string[]];
  },
});
