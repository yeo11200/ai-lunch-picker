import { describe, expect, it } from 'vitest';

import { handleScoreCandidates } from './scoring-service';
import type { RestaurantCandidate } from '@/features/lunch/types/lunch.types';

const candidates: RestaurantCandidate[] = [
  {
    id: 'far-expensive',
    sessionId: 's1',
    name: '먼 오마카세',
    category: '일식 > 오마카세',
    address: '서울',
    roadAddress: '서울',
    latitude: 37.5,
    longitude: 127.03,
    distanceMeters: 440,
    naverMapUrl: 'https://map.naver.com',
    officialUrl: null,
    phoneNumber: null,
    description: null,
    source: 'naver',
    rawTitle: '먼 오마카세',
    rawCategory: '일식 > 오마카세',
    priceConfidence: 'LOW',
    isLikelyUnderBudget: false,
    priceReason: '고가 가능성이 높습니다.',
    isZeropayLikely: false,
    zeropayConfidence: 'LOW',
    zeropayReason: '프랜차이즈/고가 카테고리 추정',
    aiSummary: null,
    aiReason: null,
    caution: null,
    score: 0,
    isExcluded: false,
    excludeReason: null,
  },
  {
    id: 'near-friendly',
    sessionId: 's1',
    name: '가까운 백반',
    category: '한식 > 백반',
    address: '서울',
    roadAddress: '서울',
    latitude: 37.5,
    longitude: 127.03,
    distanceMeters: 120,
    naverMapUrl: 'https://map.naver.com',
    officialUrl: null,
    phoneNumber: null,
    description: null,
    source: 'naver',
    rawTitle: '가까운 백반',
    rawCategory: '한식 > 백반',
    priceConfidence: 'MEDIUM',
    isLikelyUnderBudget: true,
    priceReason: '점심 적합 카테고리입니다.',
    isZeropayLikely: true,
    zeropayConfidence: 'MEDIUM',
    zeropayReason: '소상공인 친화 카테고리',
    aiSummary: null,
    aiReason: null,
    caution: null,
    score: 0,
    isExcluded: false,
    excludeReason: null,
  },
];

describe('scoring service', () => {
  it('ranks close lunch-friendly restaurants above expensive candidates', () => {
    const scored = handleScoreCandidates(candidates, {
      radiusMeters: 450,
      recentlyVisitedNames: [],
      votePreferenceByRestaurantName: {},
    });

    expect(scored[0].id).toBe('near-friendly');
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
  });
});
