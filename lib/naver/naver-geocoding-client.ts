const SAMPLE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  '서울 강남구 테헤란로 145': { latitude: 37.50195, longitude: 127.0371 },
  '서울 강남구 논현로 508': { latitude: 37.4999, longitude: 127.0344 },
  '서울 강남구 테헤란로 151': { latitude: 37.5026, longitude: 127.038 },
  '서울 강남구 언주로 427': { latitude: 37.4985, longitude: 127.0375 },
  '서울 강남구 테헤란로 180': { latitude: 37.5048, longitude: 127.0415 },
};

// Naver Cloud Maps Geocoding endpoints
// 2023-06 이후 신규 발급 키는 naveropenapi.apigw.ntruss.com 엔드포인트만 동작
const GEOCODING_ENDPOINTS = [
  'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode',
  'https://maps.apigw.ntruss.com/map-geocode/v2/geocode',
];

interface GeocodeResult {
  latitude: number;
  longitude: number;
  fallbackUsed: boolean;
}

const handleCallGeocodeEndpoint = async (
  endpoint: string,
  address: string,
  keyId: string,
  key: string,
): Promise<GeocodeResult | { error: string } | null> => {
  const url = new URL(endpoint);
  url.searchParams.set('query', address);

  const response = await fetch(url, {
    headers: {
      'x-ncp-apigw-api-key-id': keyId,
      'x-ncp-apigw-api-key': key,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return { error: `${endpoint} returned ${response.status}` };
  }

  const data = (await response.json()) as { addresses?: Array<{ x: string; y: string }> };
  const first = data.addresses?.[0];

  if (!first) {
    return null;
  }

  return {
    latitude: Number(first.y),
    longitude: Number(first.x),
    fallbackUsed: false,
  };
};

export const handleGeocodeAddress = async (
  address: string,
): Promise<GeocodeResult | null> => {
  const keyId = process.env.NAVER_MAPS_API_KEY_ID;
  const key = process.env.NAVER_MAPS_API_KEY;
  const sample = SAMPLE_COORDINATES[address];

  if (!keyId || !key) {
    return sample ? { ...sample, fallbackUsed: true } : null;
  }

  for (const endpoint of GEOCODING_ENDPOINTS) {
    try {
      const result = await handleCallGeocodeEndpoint(endpoint, address, keyId, key);

      if (result && 'latitude' in result) {
        return result;
      }

      if (result && 'error' in result) {
        continue;
      }

      return sample ? { ...sample, fallbackUsed: true } : null;
    } catch {
      continue;
    }
  }

  return sample ? { ...sample, fallbackUsed: true } : null;
};
