import type { RestaurantCandidate } from '@/features/lunch/types/lunch.types';
import { DINNER_LEANING_KEYWORDS, EXPENSIVE_KEYWORDS, LUNCH_FRIENDLY_KEYWORDS } from './price-estimator';

interface ScoreCandidatesOptions {
  radiusMeters: number;
  recentlyVisitedNames: string[];
  votePreferenceByRestaurantName: Record<string, number>;
}

const handleClamp = (value: number) => {
  return Math.max(0, Math.min(1, value));
};

const handleGetDistanceScore = (distanceMeters: number | null, radiusMeters: number) => {
  if (distanceMeters === null) {
    return 0;
  }

  return handleClamp(1 - distanceMeters / radiusMeters);
};

const handleGetPriceScore = (candidate: RestaurantCandidate) => {
  if (candidate.isLikelyUnderBudget && candidate.priceConfidence === 'HIGH') {
    return 1;
  }

  if (candidate.isLikelyUnderBudget && candidate.priceConfidence === 'MEDIUM') {
    return 0.82;
  }

  if (candidate.priceConfidence === 'LOW') {
    return 0.2;
  }

  return 0.35;
};

const handleGetCategoryScore = (candidate: RestaurantCandidate) => {
  const target = `${candidate.name} ${candidate.category ?? ''}`;

  // 최우선: 고가 키워드(한우/오마카세/스테이크/와인바) → 강감점
  if (EXPENSIVE_KEYWORDS.some((keyword) => target.includes(keyword))) {
    return 0.05;
  }

  // 그 다음: 저녁 편향 키워드(치킨/술집/곱창/삼겹살 등) → 점심에 부적합
  if (DINNER_LEANING_KEYWORDS.some((keyword) => target.includes(keyword))) {
    return 0.15;
  }

  // 점심 친화 키워드(한식/백반/돈까스/도시락/뷔페/런치 등)
  if (LUNCH_FRIENDLY_KEYWORDS.some((keyword) => target.includes(keyword))) {
    return 1;
  }

  return 0.45;
};

const handleGetNoveltyScore = (candidate: RestaurantCandidate, recentlyVisitedNames: string[]) => {
  const index = recentlyVisitedNames.indexOf(candidate.name);

  if (index === -1) {
    return 1;
  }

  // 최근 방문일수록 점수 강한 감점, 오래된 방문은 점진적 회복
  if (index < 3) {
    return 0.05;
  }

  if (index < 7) {
    return 0.35;
  }

  return 0.7;
};

const handleGetHistoryScore = (candidate: RestaurantCandidate, votePreferenceByRestaurantName: Record<string, number>) => {
  const preference = votePreferenceByRestaurantName[candidate.name] ?? 0;
  return handleClamp(preference / 10);
};

const handleGetZeropayBoost = (candidate: RestaurantCandidate) => {
  if (candidate.isZeropayLikely && candidate.zeropayConfidence === 'HIGH') {
    return 0.15;
  }

  if (candidate.isZeropayLikely && candidate.zeropayConfidence === 'MEDIUM') {
    return 0.1;
  }

  if (candidate.zeropayConfidence === 'LOW') {
    return -0.08;
  }

  return 0;
};

export const handleScoreCandidates = (
  candidates: RestaurantCandidate[],
  options: ScoreCandidatesOptions,
): RestaurantCandidate[] => {
  return [...candidates]
    .map((candidate) => {
      const distanceScore = handleGetDistanceScore(candidate.distanceMeters, options.radiusMeters);
      const priceScore = handleGetPriceScore(candidate);
      const categoryScore = handleGetCategoryScore(candidate);
      const noveltyScore = handleGetNoveltyScore(candidate, options.recentlyVisitedNames);
      const historyScore = handleGetHistoryScore(candidate, options.votePreferenceByRestaurantName);
      const baseScore =
        distanceScore * 0.3 + priceScore * 0.3 + categoryScore * 0.2 + noveltyScore * 0.1 + historyScore * 0.1;
      const zeropayBoost = handleGetZeropayBoost(candidate);
      const score = handleClamp(baseScore + zeropayBoost);

      return {
        ...candidate,
        score: Number(score.toFixed(4)),
      };
    })
    .sort((left, right) => right.score - left.score);
};
