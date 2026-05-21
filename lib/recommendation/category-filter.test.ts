import { describe, expect, it } from 'vitest';

import { handleIsLunchCandidateCategory } from './category-filter';

describe('handleIsLunchCandidateCategory', () => {
  it('rejects non-restaurant search results even when the name contains lunch-like text', () => {
    expect(
      handleIsLunchCandidateCategory({
        name: '뷰런치',
        category: '쇼핑,유통 > 화장품,향수',
      }),
    ).toBe(false);
  });

  it('accepts restaurant categories from Naver local search', () => {
    expect(
      handleIsLunchCandidateCategory({
        name: '역삼 콩나물국밥',
        category: '음식점 > 한식 > 국밥',
      }),
    ).toBe(true);
  });

  it('accepts food-like names when the category is sparse', () => {
    expect(
      handleIsLunchCandidateCategory({
        name: '역삼 샐러드',
        category: '샐러드',
      }),
    ).toBe(true);
  });
});
