'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { lunchApi } from '../api/lunchApi';

export const useVote = (sessionId: string | null, userId: string | null) => {
  const queryClient = useQueryClient();
  const voteQuery = useQuery({
    queryKey: ['votes', sessionId, userId],
    queryFn: () => lunchApi.handleGetVotes(sessionId ?? '', userId ?? ''),
    enabled: Boolean(sessionId && userId),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });
  const voteMutation = useMutation({
    mutationFn: (input: { restaurantId: string; userName: string }) =>
      lunchApi.handleVote({
        sessionId: sessionId ?? '',
        userId: userId ?? '',
        restaurantId: input.restaurantId,
        userName: input.userName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['votes', sessionId, userId] });
    },
  });
  const revealMutation = useMutation({
    mutationFn: () => lunchApi.handleReveal(sessionId ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['votes', sessionId, userId] });
      queryClient.invalidateQueries({ queryKey: ['lunch-session'] });
    },
  });

  return {
    voteQuery,
    voteMutation,
    revealMutation,
  };
};
