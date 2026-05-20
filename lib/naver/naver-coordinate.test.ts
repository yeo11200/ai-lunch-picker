import { describe, expect, it } from 'vitest';

import { handleParseNaverLocalCoordinate } from './naver-coordinate';

describe('naver local coordinate parser', () => {
  it('parses local search mapx and mapy values into longitude and latitude', () => {
    const result = handleParseNaverLocalCoordinate('1270363770', '375007360');

    expect(result).toEqual({
      latitude: 37.500736,
      longitude: 127.036377,
    });
  });

  it('returns null for missing local coordinates', () => {
    expect(handleParseNaverLocalCoordinate(undefined, '375007360')).toBeNull();
  });
});
