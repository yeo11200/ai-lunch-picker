import { getSearchQueriesForToday } from '@/lib/config/lunch-policy';

export interface NaverLocalSearchItem {
  title: string;
  category: string;
  address: string;
  roadAddress: string;
  link: string;
  telephone?: string;
  description?: string;
  mapx?: string;
  mapy?: string;
}

const SAMPLE_SEARCH_ITEMS: NaverLocalSearchItem[] = [
  {
    title: '역삼돈까스',
    category: '일식 > 돈까스',
    address: '서울 강남구 역삼동 736',
    roadAddress: '서울 강남구 테헤란로 145',
    link: 'https://map.naver.com/p/search/역삼돈까스',
    mapx: '1270371000',
    mapy: '375019500',
  },
  {
    title: '역삼백반',
    category: '한식 > 백반',
    address: '서울 강남구 역삼동 737',
    roadAddress: '서울 강남구 논현로 508',
    link: 'https://map.naver.com/p/search/역삼백반',
    mapx: '1270344000',
    mapy: '374999000',
  },
  {
    title: '강남쌀국수',
    category: '베트남음식 > 쌀국수',
    address: '서울 강남구 역삼동 738',
    roadAddress: '서울 강남구 테헤란로 151',
    link: 'https://map.naver.com/p/search/강남쌀국수',
    mapx: '1270380000',
    mapy: '375026000',
  },
  {
    title: '역삼샐러드',
    category: '샐러드',
    address: '서울 강남구 역삼동 739',
    roadAddress: '서울 강남구 언주로 427',
    link: 'https://map.naver.com/p/search/역삼샐러드',
    mapx: '1270375000',
    mapy: '374985000',
  },
  {
    title: '역삼오마카세',
    category: '일식 > 오마카세',
    address: '서울 강남구 역삼동 740',
    roadAddress: '서울 강남구 테헤란로 180',
    link: 'https://map.naver.com/p/search/역삼오마카세',
    mapx: '1270415000',
    mapy: '375048000',
  },
];

const NAVER_DISPLAY_PER_QUERY = 5;
const NAVER_CONCURRENCY = 4;
const NAVER_RETRY_LIMIT = 2;
const NAVER_RETRY_BASE_MS = 300;
const NAVER_PER_QUERY_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60_000;

interface CachedSearch {
  items: NaverLocalSearchItem[];
  fetchedAt: number;
}

const queryCache = new Map<string, CachedSearch>();

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
};

const handleDecodeHtmlEntities = (value: string) => {
  // 1) numeric entity 디코드: &#123; / &#x7B; 형태
  let decoded = value.replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)));

  // 2) named entity 디코드
  decoded = decoded.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (match) => HTML_ENTITY_MAP[match] ?? match);

  return decoded;
};

const handleStripHtml = (value: string) => {
  // Naver는 <b>매장명</b> 같이 태그 포함 + &amp; 같이 엔티티 포함된 채로 응답한다.
  const withoutTags = value.replace(/<[^>]*>/g, '');
  return handleDecodeHtmlEntities(withoutTags).trim();
};

const handleSleep = (ms: number) => {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
};

const handleReadCache = (query: string): NaverLocalSearchItem[] | null => {
  const cached = queryCache.get(query);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    queryCache.delete(query);
    return null;
  }

  return cached.items;
};

const handleWriteCache = (query: string, items: NaverLocalSearchItem[]) => {
  queryCache.set(query, { items, fetchedAt: Date.now() });
};

const handleFetchOneQueryRaw = async (
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<{ items: NaverLocalSearchItem[]; status: number | null; error: string | null }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('naver query timeout')), NAVER_PER_QUERY_TIMEOUT_MS);

  try {
    const url = new URL('https://openapi.naver.com/v1/search/local.json');
    url.searchParams.set('query', query);
    url.searchParams.set('display', String(NAVER_DISPLAY_PER_QUERY));
    url.searchParams.set('sort', 'random');

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { items: [], status: response.status, error: `${response.status}: ${text.slice(0, 120)}` };
    }

    const data = (await response.json()) as { items?: NaverLocalSearchItem[] };
    return { items: data.items ?? [], status: response.status, error: null };
  } catch (error) {
    return {
      items: [],
      status: null,
      error: error instanceof Error ? error.message : '네트워크 실패',
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleFetchOneQuery = async (
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<{ items: NaverLocalSearchItem[]; error: string | null; fromCache: boolean }> => {
  const cached = handleReadCache(query);

  if (cached) {
    return { items: cached, error: null, fromCache: true };
  }

  let lastError: string | null = null;

  for (let attempt = 0; attempt < NAVER_RETRY_LIMIT; attempt += 1) {
    const result = await handleFetchOneQueryRaw(query, clientId, clientSecret);

    if (result.items.length > 0 || (result.status && result.status >= 200 && result.status < 300)) {
      handleWriteCache(query, result.items);
      return { items: result.items, error: null, fromCache: false };
    }

    lastError = result.error;

    if (result.status === 429) {
      const backoff = NAVER_RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * 150;
      await handleSleep(backoff);
      continue;
    }

    break;
  }

  return {
    items: [],
    error: lastError ? `"${query}" ${lastError}` : `"${query}" 검색 실패`,
    fromCache: false,
  };
};

const handleRunWithConcurrency = async <T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  const handleWorker = async () => {
    while (true) {
      const taskIndex = cursor;
      cursor += 1;

      if (taskIndex >= tasks.length) {
        return;
      }

      results[taskIndex] = await tasks[taskIndex]();
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, handleWorker);
  await Promise.all(workers);
  return results;
};

export const handleSearchNaverLocalRestaurants = async (): Promise<{
  items: NaverLocalSearchItem[];
  fallbackUsed: boolean;
  message: string | null;
}> => {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      items: SAMPLE_SEARCH_ITEMS,
      fallbackUsed: true,
      message: '네이버 지역 검색 API 키가 없어 샘플 후보를 사용했습니다.',
    };
  }

  const queries = getSearchQueriesForToday();
  const tasks = queries.map(
    (query) => () => handleFetchOneQuery(query, clientId, clientSecret),
  );
  const responses = await handleRunWithConcurrency(tasks, NAVER_CONCURRENCY);

  const errors = responses.map((response) => response.error).filter((value): value is string => Boolean(value));
  const items = responses
    .flatMap((response) => response.items)
    .map((item) => ({
      ...item,
      title: handleStripHtml(item.title),
      category: handleStripHtml(item.category),
    }));

  if (items.length === 0) {
    return {
      items: SAMPLE_SEARCH_ITEMS,
      fallbackUsed: true,
      message:
        errors.length > 0
          ? `네이버 지역 검색이 모두 실패해 샘플 후보를 사용했습니다. (${errors[0]})`
          : '네이버 지역 검색 결과가 비어 샘플 후보를 사용했습니다.',
    };
  }

  return {
    items,
    fallbackUsed: false,
    message:
      errors.length > 0
        ? `${errors.length}개 쿼리에서 일시적 오류 (자동 재시도 후 일부 누락). 첫 메시지: ${errors[0]}`
        : null,
  };
};
