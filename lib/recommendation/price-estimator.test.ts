import { describe, expect, it } from 'vitest';

import { handleEstimatePrice } from './price-estimator';

describe('price estimator', () => {
  it('marks lunch-friendly categories as medium confidence under budget', () => {
    const result = handleEstimatePrice({
      name: '역삼돈까스',
      category: '일식 > 돈까스',
      maxPrice: 14000,
    });

    expect(result.priceConfidence).toBe('MEDIUM');
    expect(result.isLikelyUnderBudget).toBe(true);
    expect(result.priceReason).toContain('점심');
  });

  it('penalizes expensive keywords', () => {
    const result = handleEstimatePrice({
      name: '역삼 오마카세',
      category: '일식 > 오마카세',
      maxPrice: 14000,
    });

    expect(result.priceConfidence).toBe('LOW');
    expect(result.isLikelyUnderBudget).toBe(false);
    expect(result.priceReason).toContain('고가');
  });
});
