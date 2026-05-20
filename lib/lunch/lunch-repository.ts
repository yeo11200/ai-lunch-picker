import type { SupabaseClient } from '@supabase/supabase-js';

import type { LunchSession, LunchVote, RestaurantCandidate, VoteInput } from '@/features/lunch/types/lunch.types';
import { handleGetBaseLocation, handleGetMaxLunchPrice, handleGetSessionDate, handleGetVoteRevealAt } from '@/lib/config/lunch-policy';
import { handleCreateSupabaseAdmin } from '@/lib/supabase/admin';
import { handleEnsureSupabaseSchema } from '@/lib/supabase/ensure-schema';

interface VisitHistory {
  sessionId: string;
  restaurantId: string;
  restaurantName: string;
  category: string | null;
  visitedAt: string;
}

interface LunchMemoryStore {
  sessions: LunchSession[];
  candidates: RestaurantCandidate[];
  votes: LunchVote[];
  visitHistories: VisitHistory[];
  rejectedRestaurantNames: string[];
}

type SupabaseRecord = Record<string, unknown>;

const store: LunchMemoryStore = {
  sessions: [],
  candidates: [],
  votes: [],
  visitHistories: [],
  rejectedRestaurantNames: ['역삼오마카세'],
};

const handleNow = () => {
  return new Date().toISOString();
};

const handleCreateId = () => {
  return crypto.randomUUID();
};

const handleGetSupabase = () => {
  return handleCreateSupabaseAdmin();
};

// readiness probe — Supabase에 lunch_sessions 테이블이 실제로 존재하는지
// 짧은 TTL로 확인. SQL Editor에서 사용자가 schema 적용한 직후부터 즉시 Supabase 모드로 전환되도록 함.
// 네트워크 단절(DNS ENOTFOUND 등) 시에도 1.5초 안에 fail-fast 하도록 race-timeout을 건다.
let supabaseReadyAt = 0;
let supabaseReady = false;
const SUPABASE_READY_TTL_MS = 20_000;
const SUPABASE_PROBE_TIMEOUT_MS = 1500;

const handleRaceTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeoutHandle)), timeout]);
};

const handleProbeSupabase = async (supabase: SupabaseClient): Promise<boolean> => {
  try {
    const probe = await supabase.from('lunch_sessions').select('id').limit(1);
    // PGRST205 (table not found in schema cache) 또는 42P01 (relation does not exist) → schema 미적용
    if (probe.error && (probe.error.code === 'PGRST205' || probe.error.code === '42P01')) {
      return false;
    }
    // 네트워크/DNS 에러 등은 error.code가 없거나 fetch 자체가 throw → catch 흐름에서 false
    if (probe.error) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const handlePrepareSupabase = async (): Promise<SupabaseClient | null> => {
  const supabase = handleGetSupabase();

  if (!supabase) {
    return null;
  }

  if (Date.now() - supabaseReadyAt > SUPABASE_READY_TTL_MS) {
    // 자동 schema 적용 시도 (네트워크 도달 가능한 환경에서만 성공)
    await handleEnsureSupabaseSchema().catch(() => undefined);
    // probe에 1.5초 race-timeout — DNS ENOTFOUND 등 hang 시 fail-fast로 memory fallback
    supabaseReady = await handleRaceTimeout(handleProbeSupabase(supabase), SUPABASE_PROBE_TIMEOUT_MS, false);
    supabaseReadyAt = Date.now();
  }

  return supabaseReady ? supabase : null;
};

const handleMapSession = (record: SupabaseRecord): LunchSession => {
  return {
    id: String(record.id),
    sessionDate: String(record.session_date),
    basePlaceProvider: String(record.base_place_provider),
    basePlaceId: String(record.base_place_id),
    basePlaceName: String(record.base_place_name ?? ''),
    baseLatitude: Number(record.base_latitude),
    baseLongitude: Number(record.base_longitude),
    radiusMeters: Number(record.radius_meters),
    maxPrice: Number(record.max_price),
    status: record.status as LunchSession['status'],
    voteRevealAt: String(record.vote_reveal_at),
    selectedRestaurantId: record.selected_restaurant_id ? String(record.selected_restaurant_id) : null,
    createdAt: String(record.created_at),
    updatedAt: String(record.updated_at),
  };
};

const handleMapCandidate = (record: SupabaseRecord): RestaurantCandidate => {
  return {
    id: String(record.id),
    sessionId: String(record.session_id),
    name: String(record.name),
    category: record.category ? String(record.category) : null,
    address: record.address ? String(record.address) : null,
    roadAddress: record.road_address ? String(record.road_address) : null,
    latitude: record.latitude === null || record.latitude === undefined ? null : Number(record.latitude),
    longitude: record.longitude === null || record.longitude === undefined ? null : Number(record.longitude),
    distanceMeters: record.distance_meters === null || record.distance_meters === undefined ? null : Number(record.distance_meters),
    naverMapUrl: record.naver_map_url ? String(record.naver_map_url) : null,
    officialUrl: record.official_url ? String(record.official_url) : null,
    phoneNumber: record.phone_number ? String(record.phone_number) : null,
    description: record.description ? String(record.description) : null,
    source: String(record.source ?? 'naver'),
    rawTitle: record.raw_title ? String(record.raw_title) : null,
    rawCategory: record.raw_category ? String(record.raw_category) : null,
    priceMin: record.price_min === null || record.price_min === undefined ? null : Number(record.price_min),
    priceMax: record.price_max === null || record.price_max === undefined ? null : Number(record.price_max),
    priceConfidence: String(record.price_confidence).toUpperCase() as RestaurantCandidate['priceConfidence'],
    isLikelyUnderBudget: Boolean(record.is_likely_under_budget),
    priceReason: record.price_reason ? String(record.price_reason) : null,
    isZeropayLikely: Boolean(record.is_zeropay_likely),
    zeropayConfidence: (record.zeropay_confidence
      ? String(record.zeropay_confidence).toUpperCase()
      : 'UNKNOWN') as RestaurantCandidate['zeropayConfidence'],
    zeropayReason: record.zeropay_reason ? String(record.zeropay_reason) : null,
    aiSummary: record.ai_summary ? String(record.ai_summary) : null,
    aiReason: record.ai_reason ? String(record.ai_reason) : null,
    caution: record.caution ? String(record.caution) : null,
    score: Number(record.score ?? 0),
    isExcluded: Boolean(record.is_excluded),
    excludeReason: record.exclude_reason ? String(record.exclude_reason) : null,
  };
};

const handleMapVote = (record: SupabaseRecord): LunchVote => {
  return {
    id: String(record.id),
    sessionId: String(record.session_id),
    restaurantId: String(record.restaurant_id),
    userId: String(record.user_id),
    userName: String(record.user_name),
    createdAt: String(record.created_at),
    updatedAt: String(record.updated_at),
  };
};

const handleCandidateToRecord = (candidate: RestaurantCandidate) => {
  return {
    id: candidate.id,
    session_id: candidate.sessionId,
    name: candidate.name,
    category: candidate.category,
    address: candidate.address,
    road_address: candidate.roadAddress,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    distance_meters: candidate.distanceMeters,
    naver_map_url: candidate.naverMapUrl,
    official_url: candidate.officialUrl,
    phone_number: candidate.phoneNumber,
    description: candidate.description,
    source: candidate.source,
    raw_title: candidate.rawTitle,
    raw_category: candidate.rawCategory,
    price_min: candidate.priceMin ?? null,
    price_max: candidate.priceMax ?? null,
    price_confidence: candidate.priceConfidence,
    is_likely_under_budget: candidate.isLikelyUnderBudget,
    price_reason: candidate.priceReason,
    is_zeropay_likely: candidate.isZeropayLikely,
    zeropay_confidence: candidate.zeropayConfidence,
    zeropay_reason: candidate.zeropayReason,
    ai_summary: candidate.aiSummary,
    ai_reason: candidate.aiReason,
    caution: candidate.caution,
    score: candidate.score,
    is_excluded: candidate.isExcluded,
    exclude_reason: candidate.excludeReason,
  };
};

const handleCreateMemoryLunchSession = () => {
  const existing = store.sessions.find((session) => session.sessionDate === handleGetSessionDate() && session.status !== 'revealed');

  if (existing) {
    return existing;
  }

  const baseLocation = handleGetBaseLocation();
  const now = handleNow();
  const session: LunchSession = {
    id: handleCreateId(),
    sessionDate: handleGetSessionDate(),
    basePlaceProvider: baseLocation.provider,
    basePlaceId: baseLocation.placeId,
    basePlaceName: baseLocation.name,
    baseLatitude: baseLocation.latitude,
    baseLongitude: baseLocation.longitude,
    radiusMeters: baseLocation.radiusMeters,
    maxPrice: handleGetMaxLunchPrice(),
    status: 'draft',
    voteRevealAt: handleGetVoteRevealAt().toISOString(),
    selectedRestaurantId: null,
    createdAt: now,
    updatedAt: now,
  };

  store.sessions.unshift(session);
  return session;
};

const handleCreateSupabaseLunchSession = async (supabase: SupabaseClient) => {
  const sessionDate = handleGetSessionDate();
  const existing = await supabase
    .from('lunch_sessions')
    .select('*')
    .eq('session_date', sessionDate)
    .neq('status', 'revealed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    return handleMapSession(existing.data);
  }

  const baseLocation = handleGetBaseLocation();
  const inserted = await supabase
    .from('lunch_sessions')
    .insert({
      session_date: sessionDate,
      base_place_provider: baseLocation.provider,
      base_place_id: baseLocation.placeId,
      base_place_name: baseLocation.name,
      base_latitude: baseLocation.latitude,
      base_longitude: baseLocation.longitude,
      radius_meters: baseLocation.radiusMeters,
      max_price: handleGetMaxLunchPrice(),
      status: 'draft',
      vote_reveal_at: handleGetVoteRevealAt().toISOString(),
    })
    .select('*')
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  return handleMapSession(inserted.data);
};

const handleMarkSupabaseUnready = () => {
  supabaseReady = false;
  supabaseReadyAt = Date.now();
};

export const handleCreateLunchSession = async () => {
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    try {
      return await handleCreateSupabaseLunchSession(supabase);
    } catch (error) {
      console.warn('[lunch] supabase create-session failed, falling back to memory:', error);
      handleMarkSupabaseUnready();
    }
  }

  return handleCreateMemoryLunchSession();
};

export const handleGetLunchSession = async (sessionId: string) => {
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    try {
      const result = await supabase.from('lunch_sessions').select('*').eq('id', sessionId).maybeSingle();

      if (result.error) {
        throw result.error;
      }

      return result.data ? handleMapSession(result.data) : null;
    } catch (error) {
      console.warn('[lunch] supabase get-session failed, falling back to memory:', error);
      handleMarkSupabaseUnready();
    }
  }

  return store.sessions.find((session) => session.id === sessionId) ?? null;
};

export const handleSaveRestaurantCandidates = async (sessionId: string, candidates: RestaurantCandidate[]) => {
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    await supabase.from('restaurant_candidates').delete().eq('session_id', sessionId);
    const inserted = await supabase.from('restaurant_candidates').insert(candidates.map(handleCandidateToRecord));

    if (inserted.error) {
      throw inserted.error;
    }

    await supabase.from('lunch_sessions').update({ status: 'open', updated_at: handleNow() }).eq('id', sessionId);
    return candidates;
  }

  store.candidates = store.candidates.filter((candidate) => candidate.sessionId !== sessionId).concat(candidates);
  const session = await handleGetLunchSession(sessionId);

  if (session) {
    session.status = 'open';
    session.updatedAt = handleNow();
  }

  return candidates;
};

export const handleGetRestaurantCandidates = async (sessionId: string) => {
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    const result = await supabase
      .from('restaurant_candidates')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_excluded', false)
      .order('score', { ascending: false });

    if (result.error) {
      throw result.error;
    }

    return result.data.map(handleMapCandidate);
  }

  return store.candidates.filter((candidate) => candidate.sessionId === sessionId && !candidate.isExcluded);
};

export const handleUpsertVote = async (input: {
  sessionId: string;
  restaurantId: string;
  userId: string;
  userName: string;
}) => {
  const session = await handleGetLunchSession(input.sessionId);

  if (!session) {
    throw new Error('점심 세션을 찾을 수 없습니다.');
  }

  if (new Date().getTime() >= new Date(session.voteRevealAt).getTime()) {
    throw new Error('투표가 마감되었습니다.');
  }

  const supabase = handleGetSupabase();

  if (supabase) {
    await supabase.from('users').upsert({ id: input.userId, name: input.userName }, { onConflict: 'id' });
    const upserted = await supabase
      .from('votes')
      .upsert(
        {
          session_id: input.sessionId,
          restaurant_id: input.restaurantId,
          user_id: input.userId,
          user_name: input.userName,
          updated_at: handleNow(),
        },
        { onConflict: 'session_id,user_id' },
      )
      .select('*')
      .single();

    if (upserted.error) {
      throw upserted.error;
    }

    return handleMapVote(upserted.data);
  }

  const existing = store.votes.find((vote) => vote.sessionId === input.sessionId && vote.userId === input.userId);
  const now = handleNow();

  if (existing) {
    existing.restaurantId = input.restaurantId;
    existing.userName = input.userName;
    existing.updatedAt = now;
    return existing;
  }

  const vote: LunchVote = {
    id: handleCreateId(),
    sessionId: input.sessionId,
    restaurantId: input.restaurantId,
    userId: input.userId,
    userName: input.userName,
    createdAt: now,
    updatedAt: now,
  };

  store.votes.push(vote);
  return vote;
};

export const handleGetVoteInputs = async (sessionId: string): Promise<VoteInput[]> => {
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    const votes = await supabase.from('votes').select('*').eq('session_id', sessionId);

    if (votes.error) {
      throw votes.error;
    }

    const candidates = await handleGetRestaurantCandidates(sessionId);

    return votes.data.map((vote) => {
      const candidate = candidates.find((item) => item.id === vote.restaurant_id);

      return {
        restaurantId: String(vote.restaurant_id),
        restaurantName: candidate?.name ?? '알 수 없는 식당',
        userId: String(vote.user_id),
        userName: String(vote.user_name),
      };
    });
  }

  const candidates = await handleGetRestaurantCandidates(sessionId);

  return store.votes
    .filter((vote) => vote.sessionId === sessionId)
    .map((vote) => {
      const candidate = candidates.find((item) => item.id === vote.restaurantId);

      return {
        restaurantId: vote.restaurantId,
        restaurantName: candidate?.name ?? '알 수 없는 식당',
        userId: vote.userId,
        userName: vote.userName,
      };
    });
};

export const handleRevealLunchSession = async (sessionId: string) => {
  const session = await handleGetLunchSession(sessionId);

  if (!session) {
    throw new Error('점심 세션을 찾을 수 없습니다.');
  }

  const candidates = await handleGetRestaurantCandidates(sessionId);
  const voteInputs = await handleGetVoteInputs(sessionId);
  const counts = voteInputs.reduce<Record<string, number>>((accumulator, vote) => {
    accumulator[vote.restaurantId] = (accumulator[vote.restaurantId] ?? 0) + 1;
    return accumulator;
  }, {});
  const selectedRestaurantId = Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? candidates[0]?.id ?? null;
  const selected = candidates.find((candidate) => candidate.id === selectedRestaurantId) ?? null;
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    await supabase
      .from('lunch_sessions')
      .update({ status: 'revealed', selected_restaurant_id: selectedRestaurantId, updated_at: handleNow() })
      .eq('id', sessionId);

    if (selected) {
      await supabase.from('visit_histories').insert({
        session_id: sessionId,
        restaurant_id: selected.id,
        restaurant_name: selected.name,
        category: selected.category,
        visited_at: session.sessionDate,
      });
    }
  } else {
    session.status = 'revealed';
    session.selectedRestaurantId = selectedRestaurantId;
    session.updatedAt = handleNow();

    if (selected && !store.visitHistories.some((history) => history.sessionId === sessionId)) {
      store.visitHistories.unshift({
        sessionId,
        restaurantId: selected.id,
        restaurantName: selected.name,
        category: selected.category,
        visitedAt: session.sessionDate,
      });
    }
  }

  return {
    session: {
      ...session,
      status: 'revealed' as const,
      selectedRestaurantId,
    },
    selectedRestaurant: selected,
  };
};

export const handleGetRagContext = async () => {
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    const visits = await supabase.from('visit_histories').select('*').order('visited_at', { ascending: false }).limit(10);
    const rejected = await supabase.from('rejected_restaurants').select('restaurant_name');
    const votes = await supabase.from('votes').select('restaurant_id');
    const candidates = await supabase.from('restaurant_candidates').select('id,name');

    const votePreferenceByRestaurantName = (votes.data ?? []).reduce<Record<string, number>>((accumulator, vote) => {
      const candidate = (candidates.data ?? []).find((item) => item.id === vote.restaurant_id);

      if (candidate?.name) {
        accumulator[String(candidate.name)] = (accumulator[String(candidate.name)] ?? 0) + 1;
      }

      return accumulator;
    }, {});

    return {
      recentlyVisitedNames: (visits.data ?? []).map((history) => String(history.restaurant_name)),
      votePreferenceByRestaurantName,
      rejectedRestaurantNames: (rejected.data ?? []).map((item) => String(item.restaurant_name)),
      recentVisits: (visits.data ?? []).map((history) => ({
        sessionId: String(history.session_id),
        restaurantId: String(history.restaurant_id),
        restaurantName: String(history.restaurant_name),
        category: history.category ? String(history.category) : null,
        visitedAt: String(history.visited_at),
      })),
    };
  }

  const recentVisits = store.visitHistories.slice(0, 10);
  const votePreferenceByRestaurantName = store.votes.reduce<Record<string, number>>((accumulator, vote) => {
    const candidate = store.candidates.find((item) => item.id === vote.restaurantId);

    if (candidate) {
      accumulator[candidate.name] = (accumulator[candidate.name] ?? 0) + 1;
    }

    return accumulator;
  }, {});

  return {
    recentlyVisitedNames: recentVisits.map((history) => history.restaurantName),
    votePreferenceByRestaurantName,
    rejectedRestaurantNames: store.rejectedRestaurantNames,
    recentVisits,
  };
};

export const handleGetRecentResults = async () => {
  const supabase = await handlePrepareSupabase();

  if (supabase) {
    try {
      const result = await supabase.from('visit_histories').select('*').order('visited_at', { ascending: false }).limit(10);

      if (result.error) {
        throw result.error;
      }

      return result.data.map((history) => ({
        sessionId: String(history.session_id),
        restaurantId: String(history.restaurant_id),
        restaurantName: String(history.restaurant_name),
        category: history.category ? String(history.category) : null,
        visitedAt: String(history.visited_at),
      }));
    } catch (error) {
      console.warn('[lunch] supabase get-recent-results failed, falling back to memory:', error);
      handleMarkSupabaseUnready();
    }
  }

  return store.visitHistories.slice(0, 10);
};

export const handleCreateCandidateId = () => {
  return handleCreateId();
};
