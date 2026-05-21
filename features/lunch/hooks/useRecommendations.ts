'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { lunchApi } from '../api/lunchApi';

export const useRecommendations = (sessionId: string | null) => {
  const queryClient = useQueryClient();
  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', sessionId],
    queryFn: () => lunchApi.handleGetRecommendations(sessionId ?? ''),
    enabled: Boolean(sessionId),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 60_000,
  });
  const createRecommendationsMutation = useMutation({
    mutationFn: (input?: { sessionId?: string; force?: boolean; requestedByName?: string }) =>
      lunchApi.handleCreateRecommendations(
        input?.sessionId ?? sessionId ?? '',
        input?.force ?? false,
        input?.requestedByName ?? '',
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(['recommendations', data.sessionId], {
        recommendations: data.recommendations,
        browseCandidates: data.browseCandidates,
      });
    },
  });

  return {
    recommendationsQuery,
    createRecommendationsMutation,
  };
};
