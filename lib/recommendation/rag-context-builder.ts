import type { RestaurantCandidate } from '@/features/lunch/types/lunch.types';

interface RagContextInput {
  candidates: RestaurantCandidate[];
  recentlyVisitedNames: string[];
  rejectedRestaurantNames: string[];
  votePreferenceByRestaurantName: Record<string, number>;
}

export const handleBuildRagContext = (input: RagContextInput) => {
  return JSON.stringify(
    {
      instruction: '후보 목록 안에서만 추천 후보 3개를 JSON 배열로 반환한다. 제로페이 가맹 추정(isZeropayLikely=true) 식당을 우선적으로 추천한다.',
      constraints: {
        radiusMeters: 450,
        maxPrice: 14000,
        priceUnknownMessage: '가격 확인 필요',
        preferZeropayLikely: true,
      },
      candidates: input.candidates.map((candidate) => ({
        restaurantId: candidate.id,
        name: candidate.name,
        category: candidate.category,
        distanceMeters: candidate.distanceMeters,
        priceConfidence: candidate.priceConfidence,
        isLikelyUnderBudget: candidate.isLikelyUnderBudget,
        isZeropayLikely: candidate.isZeropayLikely,
        zeropayConfidence: candidate.zeropayConfidence,
        score: candidate.score,
      })),
      recentlyVisitedNames: input.recentlyVisitedNames,
      rejectedRestaurantNames: input.rejectedRestaurantNames,
      votePreferenceByRestaurantName: input.votePreferenceByRestaurantName,
      outputSchema: [
        {
          restaurantId: 'string',
          rank: 1,
          summary: 'string',
          reason: 'string',
          caution: 'string',
        },
      ],
    },
    null,
    2,
  );
};
