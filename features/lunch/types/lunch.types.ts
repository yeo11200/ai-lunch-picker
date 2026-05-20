export type PriceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type ZeropayConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type LunchSessionStatus = 'draft' | 'open' | 'closed' | 'revealed';

export interface BaseLocation {
  provider: string;
  placeId: string;
  name: string;
  mapUrl: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface LunchSession {
  id: string;
  sessionDate: string;
  basePlaceProvider: string;
  basePlaceId: string;
  basePlaceName: string;
  baseLatitude: number;
  baseLongitude: number;
  radiusMeters: number;
  maxPrice: number;
  status: LunchSessionStatus;
  voteRevealAt: string;
  selectedRestaurantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantCandidate {
  id: string;
  sessionId: string;
  name: string;
  category: string | null;
  address: string | null;
  roadAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  naverMapUrl: string | null;
  officialUrl: string | null;
  phoneNumber: string | null;
  description: string | null;
  source: string;
  rawTitle: string | null;
  rawCategory: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  priceConfidence: PriceConfidence;
  isLikelyUnderBudget: boolean;
  priceReason: string | null;
  isZeropayLikely: boolean;
  zeropayConfidence: ZeropayConfidence;
  zeropayReason: string | null;
  aiSummary: string | null;
  aiReason: string | null;
  caution: string | null;
  score: number;
  isExcluded: boolean;
  excludeReason: string | null;
}

export interface LunchVote {
  id: string;
  sessionId: string;
  restaurantId: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoteInput {
  restaurantId: string;
  restaurantName: string;
  userId: string;
  userName: string;
}

export interface RevealedVoteResult {
  restaurantId: string;
  restaurantName: string;
  voteCount: number;
  voters: string[];
}

export type VoteState =
  | {
      isRevealed: false;
      totalVoteCount: number;
      myVote: { restaurantId: string } | null;
    }
  | {
      isRevealed: true;
      totalVoteCount: number;
      myVote: { restaurantId: string } | null;
      results: RevealedVoteResult[];
    };

export interface RecommendationResponse {
  sessionId: string;
  candidateCount: number;
  filteredCount: number;
  recommendations: RestaurantCandidate[];
  browseCandidates: RestaurantCandidate[];
  fallbackUsed: boolean;
  messages: string[];
}
