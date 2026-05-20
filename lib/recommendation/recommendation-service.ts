import type { RecommendationResponse, RestaurantCandidate } from '@/features/lunch/types/lunch.types';
import { handleGetBaseLocation } from '@/lib/config/lunch-policy';
import {
  handleCreateCandidateId,
  handleGetLunchSession,
  handleGetRagContext,
  handleGetRestaurantCandidates,
  handleSaveRestaurantCandidates,
} from '@/lib/lunch/lunch-repository';
import { handleParseNaverLocalCoordinate } from '@/lib/naver/naver-coordinate';
import { handleGeocodeAddress } from '@/lib/naver/naver-geocoding-client';
import { handleSearchNaverLocalRestaurants, type NaverLocalSearchItem } from '@/lib/naver/naver-search-client';
import { handleGenerateAiRecommendations } from '@/lib/openrouter/open-router-client';
import { handleCalculateDistanceMeters, handleIsWithinRadius } from './distance';
import { handleSampleDiverseCandidates } from './diverse-sampler';
import { handleEstimatePrice } from './price-estimator';
import { handleBuildRagContext } from './rag-context-builder';
import { handleScoreCandidates } from './scoring-service';
import { handleEstimateZeropay } from './zeropay-estimator';

const handleBuildDedupeKey = (item: NaverLocalSearchItem) => {
  return `${item.title.trim()}::${(item.roadAddress || item.address).trim()}`;
};

// 네이버 지도 URL을 무조건 map.naver.com 도메인으로 생성한다.
// Naver Local Search 응답의 `link`는 식당이 등록한 외부 사이트(인스타/홈페이지)라 그걸 쓰면 안 됨.
const handleBuildNaverMapUrl = (item: NaverLocalSearchItem, coordinate: { latitude: number; longitude: number }) => {
  const query = encodeURIComponent(item.title);
  // mapx/mapy 좌표가 있으면 zoom + center를 같이 넘겨서 정확한 위치로 안내
  return `https://map.naver.com/p/search/${query}?c=${coordinate.longitude},${coordinate.latitude},17,0,0,0,dh`;
};

const handleIsNaverMapUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host.endsWith('map.naver.com') || host.endsWith('naver.me');
  } catch {
    return false;
  }
};

const handleBuildRuleBasedReason = (candidate: RestaurantCandidate) => {
  const caution = candidate.priceConfidence === 'UNKNOWN' || candidate.priceConfidence === 'LOW' ? '가격 확인 필요' : '실제 가격은 매장 기준 확인이 필요합니다.';

  return {
    aiSummary: `${candidate.distanceMeters ?? '-'}m 거리의 ${candidate.category ?? '점심'} 후보`,
    aiReason: `도보권에 있고 ${candidate.priceReason ?? '점심 후보로 검토할 수 있습니다.'}`,
    caution,
  };
};

interface GenerateOptions {
  force?: boolean;
}

export const handleGenerateRecommendations = async (
  sessionId: string,
  options: GenerateOptions = {},
): Promise<RecommendationResponse> => {
  const session = await handleGetLunchSession(sessionId);

  if (!session) {
    throw new Error('점심 세션을 찾을 수 없습니다.');
  }

  // 같은 세션에 이미 추천이 있고 force가 아니면 그대로 반환 (Naver/AI 재호출 방지)
  if (!options.force) {
    const existing = await handleGetRestaurantCandidates(sessionId);

    if (existing.length > 0) {
      return {
        sessionId,
        candidateCount: existing.length,
        filteredCount: existing.length,
        recommendations: existing.filter((candidate) => candidate.aiReason).slice(0, 4),
        browseCandidates: existing.filter((candidate) => !candidate.aiReason),
        fallbackUsed: false,
        messages: ['오늘 추천은 이미 생성되어 있습니다. 다시 뽑으려면 "다시 추천" 버튼을 사용하세요.'],
      };
    }
  }

  const baseLocation = handleGetBaseLocation();
  const searchResult = await handleSearchNaverLocalRestaurants();
  const dedupedItems = Array.from(
    new Map(searchResult.items.map((item) => [handleBuildDedupeKey(item), item])).values(),
  );
  const messages = searchResult.message ? [searchResult.message] : [];
  const candidates: RestaurantCandidate[] = [];

  let geocodingErrorCount = 0;

  for (const item of dedupedItems) {
    const address = item.roadAddress || item.address;
    const localCoordinate = handleParseNaverLocalCoordinate(item.mapx, item.mapy);
    const geocoded = localCoordinate ?? (await handleGeocodeAddress(address));

    if (!geocoded) {
      geocodingErrorCount += 1;
      continue;
    }

    const distanceMeters = handleCalculateDistanceMeters(baseLocation, geocoded);

    if (!handleIsWithinRadius(distanceMeters, baseLocation.radiusMeters)) {
      continue;
    }

    const price = handleEstimatePrice({
      name: item.title,
      category: item.category,
      maxPrice: session.maxPrice,
    });
    const zeropay = handleEstimateZeropay({
      name: item.title,
      category: item.category,
      address: item.address,
    });

    // item.link 가 map.naver.com/naver.me 이면 그걸 쓰고, 아니면 우리가 직접 만든 검색 URL을 쓴다.
    // 외부 사이트(인스타/홈페이지)는 officialUrl 에 별도 저장.
    const naverMapUrl = handleIsNaverMapUrl(item.link)
      ? item.link
      : handleBuildNaverMapUrl(item, geocoded);
    const officialUrl = item.link && !handleIsNaverMapUrl(item.link) ? item.link : null;

    candidates.push({
      id: handleCreateCandidateId(),
      sessionId,
      name: item.title,
      category: item.category,
      address: item.address,
      roadAddress: item.roadAddress,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      distanceMeters,
      naverMapUrl,
      officialUrl,
      phoneNumber: item.telephone ? item.telephone.trim() : null,
      description: item.description ? item.description.trim() : null,
      source: 'naver',
      rawTitle: item.title,
      rawCategory: item.category,
      priceConfidence: price.priceConfidence,
      isLikelyUnderBudget: price.isLikelyUnderBudget,
      priceReason: price.priceReason,
      isZeropayLikely: zeropay.isZeropayLikely,
      zeropayConfidence: zeropay.zeropayConfidence,
      zeropayReason: zeropay.zeropayReason,
      aiSummary: null,
      aiReason: null,
      caution: null,
      score: 0,
      isExcluded: false,
      excludeReason: null,
    });
  }

  const ragContext = await handleGetRagContext();
  const rejectedNames = new Set(ragContext.rejectedRestaurantNames);
  const availableCandidates = candidates.filter((candidate) => !rejectedNames.has(candidate.name));
  const scoredCandidates = handleScoreCandidates(availableCandidates, {
    radiusMeters: session.radiusMeters,
    recentlyVisitedNames: ragContext.recentlyVisitedNames,
    votePreferenceByRestaurantName: ragContext.votePreferenceByRestaurantName,
  });
  const topCandidates = handleSampleDiverseCandidates(scoredCandidates, {
    poolSize: 12,
    pickCount: 4,
    recentlyVisitedNames: ragContext.recentlyVisitedNames,
  });
  const aiResult = await handleGenerateAiRecommendations(
    topCandidates,
    handleBuildRagContext({
      candidates: topCandidates,
      recentlyVisitedNames: ragContext.recentlyVisitedNames,
      rejectedRestaurantNames: ragContext.rejectedRestaurantNames,
      votePreferenceByRestaurantName: ragContext.votePreferenceByRestaurantName,
    }),
  );
  const aiByCandidateId = new Map(aiResult.recommendations.map((recommendation) => [recommendation.restaurantId, recommendation]));
  const recommendations = topCandidates.map((candidate, index) => {
    const ai = aiByCandidateId.get(candidate.id);
    const fallback = handleBuildRuleBasedReason(candidate);

    return {
      ...candidate,
      aiSummary: ai?.summary ?? fallback.aiSummary,
      aiReason: ai?.reason ?? fallback.aiReason,
      caution: ai?.caution ?? fallback.caution,
      score: Number((candidate.score + (topCandidates.length - index) / 1000).toFixed(4)),
    };
  });

  // 추천 4개 외의 "둘러보기" 후보: 450m 통과한 나머지 후보 전부.
  // AI 호출 없이 점수/태그만 부여하므로 비용 0.
  const recommendedIds = new Set(recommendations.map((candidate) => candidate.id));
  const browseCandidates = scoredCandidates
    .filter((candidate) => !recommendedIds.has(candidate.id))
    .slice(0, 24)
    .map((candidate) => ({
      ...candidate,
      aiSummary: null,
      aiReason: null,
      caution: null,
    }));

  // 추천 Top 4만 저장 (투표 가능 후보). 둘러보기는 응답에만 포함시키는 ephemeral 데이터.
  await handleSaveRestaurantCandidates(sessionId, recommendations);

  if (aiResult.errorMessage) {
    messages.push(aiResult.errorMessage);
  }

  if (aiResult.modelUsed) {
    messages.push(`AI 모델: ${aiResult.modelUsed}`);
  }

  if (geocodingErrorCount > 0) {
    messages.push(`${geocodingErrorCount}개 식당은 좌표를 확인할 수 없어 제외했습니다.`);
  }

  if (recommendations.length < 3) {
    messages.push('450m 이내 후보가 부족합니다.');
  }

  return {
    sessionId,
    candidateCount: dedupedItems.length,
    filteredCount: recommendations.length + browseCandidates.length,
    recommendations,
    browseCandidates,
    fallbackUsed: searchResult.fallbackUsed || aiResult.fallbackUsed,
    messages,
  };
};
