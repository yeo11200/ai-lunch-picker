import { describe, expect, it } from 'vitest';

import { handleCalculateDistanceMeters, handleIsWithinRadius } from './distance';

describe('distance policy', () => {
  it('calculates nearby restaurant distance in meters', () => {
    const distance = handleCalculateDistanceMeters(
      { latitude: 37.500736, longitude: 127.036377 },
      { latitude: 37.50342, longitude: 127.0372 },
    );

    expect(distance).toBeGreaterThan(290);
    expect(distance).toBeLessThan(320);
  });

  it('filters out restaurants beyond 450 meters', () => {
    expect(handleIsWithinRadius(449, 450)).toBe(true);
    expect(handleIsWithinRadius(451, 450)).toBe(false);
  });
});
