import type { RestaurantCandidate } from '@/features/lunch/types/lunch.types';

interface DiverseSampleOptions {
  poolSize?: number;
  pickCount?: number;
  recentlyVisitedNames?: string[];
  recentlyShownNames?: string[];
  // 같은 카테고리(첫 토큰 기준) 최대 K개로 제한
  maxPerCategory?: number;
}

const DEFAULT_POOL_SIZE = 12;
const DEFAULT_PICK_COUNT = 5;
const DEFAULT_MAX_PER_CATEGORY = 2;

// "음식점>일식>돈가스" → "일식", "한식>해물,생선요리" → "한식"
const handleGetCategoryBucket = (candidate: RestaurantCandidate): string => {
  const raw = (candidate.category ?? '').replace(/^음식점\s*[>·]\s*/, '');
  const head = raw.split(/[>·,]/)[0]?.trim();
  return head || '기타';
};

const handleAdjustedWeight = (
  candidate: RestaurantCandidate,
  recentlyVisited: Set<string>,
  recentlyShown: Set<string>,
) => {
  const base = Math.max(0.05, candidate.score);
  let weight = base;

  if (recentlyVisited.has(candidate.name)) {
    weight *= 0.25;
  }

  if (recentlyShown.has(candidate.name)) {
    weight *= 0.45;
  }

  // 카테고리가 같은 식당이 풀에 몰리면 자연스럽게 약간씩 다양해지도록 미세 노이즈
  weight *= 0.7 + Math.random() * 0.6;
  return weight;
};

const handleWeightedPick = (pool: Array<{ candidate: RestaurantCandidate; weight: number }>) => {
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    return pool[Math.floor(Math.random() * pool.length)]?.candidate ?? null;
  }

  let cursor = Math.random() * totalWeight;

  for (const item of pool) {
    cursor -= item.weight;

    if (cursor <= 0) {
      return item.candidate;
    }
  }

  return pool[pool.length - 1]?.candidate ?? null;
};

export const handleSampleDiverseCandidates = (
  scored: RestaurantCandidate[],
  options: DiverseSampleOptions = {},
): RestaurantCandidate[] => {
  const poolSize = options.poolSize ?? DEFAULT_POOL_SIZE;
  const pickCount = options.pickCount ?? DEFAULT_PICK_COUNT;
  const maxPerCategory = options.maxPerCategory ?? DEFAULT_MAX_PER_CATEGORY;
  const recentlyVisited = new Set(options.recentlyVisitedNames ?? []);
  const recentlyShown = new Set(options.recentlyShownNames ?? []);

  if (scored.length <= pickCount) {
    return scored;
  }

  const pool = scored.slice(0, Math.min(poolSize, scored.length)).map((candidate) => ({
    candidate,
    weight: handleAdjustedWeight(candidate, recentlyVisited, recentlyShown),
  }));

  const picked: RestaurantCandidate[] = [];
  const categoryCount = new Map<string, number>();
  const remaining = [...pool];

  while (picked.length < pickCount && remaining.length > 0) {
    // 카테고리 다양성 제약: 이미 maxPerCategory 도달한 버킷은 후보에서 제외
    const eligible = remaining.filter((item) => {
      const bucket = handleGetCategoryBucket(item.candidate);
      return (categoryCount.get(bucket) ?? 0) < maxPerCategory;
    });

    // 모든 후보가 제약에 걸리면 제약 무시하고 채움
    const pickFrom = eligible.length > 0 ? eligible : remaining;
    const chosen = handleWeightedPick(pickFrom);

    if (!chosen) {
      break;
    }

    picked.push(chosen);
    const bucket = handleGetCategoryBucket(chosen);
    categoryCount.set(bucket, (categoryCount.get(bucket) ?? 0) + 1);
    const index = remaining.findIndex((item) => item.candidate.id === chosen.id);

    if (index !== -1) {
      remaining.splice(index, 1);
    }
  }

  return picked.sort((left, right) => right.score - left.score);
};
