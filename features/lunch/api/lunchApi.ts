import type { RecommendationResponse, RestaurantCandidate, VoteState } from '../types/lunch.types';

export const lunchApi = {
  handleGetSession: async () => {
    const response = await fetch('/api/lunch-sessions', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('세션 조회에 실패했습니다.');
    }

    return response.json();
  },
  handleCreateSession: async () => {
    const response = await fetch('/api/lunch-sessions', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('세션 생성에 실패했습니다.');
    }

    return response.json();
  },
  handleCreateRecommendations: async (sessionId: string, force = false): Promise<RecommendationResponse> => {
    const query = force ? '?force=true' : '';
    const response = await fetch(`/api/lunch-sessions/${sessionId}/recommendations${query}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('추천 후보 생성에 실패했습니다.');
    }

    return response.json();
  },
  handleGetRecommendations: async (
    sessionId: string,
  ): Promise<{ recommendations: RestaurantCandidate[]; browseCandidates: RestaurantCandidate[] }> => {
    const response = await fetch(`/api/lunch-sessions/${sessionId}/recommendations`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('추천 후보 조회에 실패했습니다.');
    }

    return response.json();
  },
  handleGetVotes: async (sessionId: string, userId: string): Promise<VoteState> => {
    const response = await fetch(`/api/lunch-sessions/${sessionId}/votes?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('투표 상태 조회에 실패했습니다.');
    }

    return response.json();
  },
  handleVote: async (input: { sessionId: string; restaurantId: string; userId: string; userName: string }) => {
    const response = await fetch(`/api/lunch-sessions/${input.sessionId}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: input.restaurantId,
        userId: input.userId,
        userName: input.userName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? '투표 저장에 실패했습니다.');
    }

    return data;
  },
  handleReveal: async (sessionId: string) => {
    const response = await fetch(`/api/lunch-sessions/${sessionId}/reveal`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('결과 공개에 실패했습니다.');
    }

    return response.json();
  },
};
