'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { lunchApi } from '../api/lunchApi';

export const useLunchSession = () => {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ['lunch-session'],
    queryFn: lunchApi.handleGetSession,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
  const createSessionMutation = useMutation({
    mutationFn: lunchApi.handleCreateSession,
    onSuccess: (data) => {
      queryClient.setQueryData(['lunch-session'], {
        session: data.session,
        recentResults: [],
      });
    },
  });

  return {
    sessionQuery,
    createSessionMutation,
  };
};
