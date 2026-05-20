interface Coordinate {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

const handleToRadians = (degrees: number) => {
  return (degrees * Math.PI) / 180;
};

export const handleCalculateDistanceMeters = (from: Coordinate, to: Coordinate) => {
  const latitudeDelta = handleToRadians(to.latitude - from.latitude);
  const longitudeDelta = handleToRadians(to.longitude - from.longitude);
  const fromLatitude = handleToRadians(from.latitude);
  const toLatitude = handleToRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
};

export const handleIsWithinRadius = (distanceMeters: number, radiusMeters: number) => {
  return distanceMeters <= radiusMeters;
};
