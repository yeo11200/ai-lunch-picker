export const handleParseNaverLocalCoordinate = (mapx?: string, mapy?: string) => {
  if (!mapx || !mapy) {
    return null;
  }

  const longitude = Number(mapx) / 10000000;
  const latitude = Number(mapy) / 10000000;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};
