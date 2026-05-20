'use client';

import { useEffect, useMemo, useState } from 'react';

import { BrowseList } from './BrowseList';
import { CandidateList } from './CandidateList';
import { LunchSessionHeader } from './LunchSessionHeader';
import { ResultPanel } from './ResultPanel';
import { VotePanel } from './VotePanel';
import { useLunchSession } from '../hooks/useLunchSession';
import { useRecommendations } from '../hooks/useRecommendations';
import { useVote } from '../hooks/useVote';
import type { RestaurantCandidate } from '../types/lunch.types';

const USER_ID_KEY = 'ai-lunch-picker-user-id';
const USER_NAME_KEY = 'ai-lunch-picker-user-name';

const handleCreateUserId = () => {
  return crypto.randomUUID();
};

export function LunchApp() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const { sessionQuery, createSessionMutation } = useLunchSession();
  const session = sessionQuery.data?.session ?? null;
  const sessionId = session?.id ?? null;
  const { recommendationsQuery, createRecommendationsMutation } = useRecommendations(sessionId);
  const { voteQuery, voteMutation, revealMutation } = useVote(sessionId, userId);
  // 서버 응답이 빈 배열일 때 화면이 깜빡 비지 않도록 마지막 성공 응답을 보존한다.
  // (dev 재시작이나 sessionId 교체 같은 edge case로 인한 UX 충돌 방지)
  const [stickyRecs, setStickyRecs] = useState<RestaurantCandidate[]>([]);
  const [stickyBrowse, setStickyBrowse] = useState<RestaurantCandidate[]>([]);
  const candidates = recommendationsQuery.data?.recommendations?.length
    ? recommendationsQuery.data.recommendations
    : stickyRecs;
  const browseCandidates = recommendationsQuery.data?.browseCandidates?.length
    ? recommendationsQuery.data.browseCandidates
    : stickyBrowse;

  useEffect(() => {
    const incoming = recommendationsQuery.data?.recommendations;
    if (incoming && incoming.length > 0) {
      setStickyRecs(incoming);
    }
  }, [recommendationsQuery.data?.recommendations]);

  useEffect(() => {
    const incoming = recommendationsQuery.data?.browseCandidates;
    if (incoming && incoming.length > 0) {
      setStickyBrowse(incoming);
    }
  }, [recommendationsQuery.data?.browseCandidates]);
  const voteState = voteQuery.data ?? null;
  const myRestaurantId = voteState?.myVote?.restaurantId ?? null;
  const canVote = Boolean(userId && userName.trim() && sessionId && candidates.length > 0 && !voteState?.isRevealed);
  const isLoading = sessionQuery.isLoading || createSessionMutation.isPending || createRecommendationsMutation.isPending;
  const statusLabel = useMemo(() => {
    if (!session) {
      return '세션 준비 중';
    }

    if (voteState?.isRevealed) {
      return '결과 공개';
    }

    if (candidates.length > 0) {
      return '투표 진행 중';
    }

    return '추천 전';
  }, [candidates.length, session, voteState?.isRevealed]);

  useEffect(() => {
    const storedUserId = localStorage.getItem(USER_ID_KEY) ?? handleCreateUserId();
    const storedUserName = localStorage.getItem(USER_NAME_KEY) ?? '';

    localStorage.setItem(USER_ID_KEY, storedUserId);
    setUserId(storedUserId);
    setUserName(storedUserName);
  }, []);

  const handleChangeUserName = (value: string) => {
    setUserName(value);
    localStorage.setItem(USER_NAME_KEY, value);
  };

  const handleCreateSession = async () => {
    setMessages([]);
    const data = await createSessionMutation.mutateAsync();
    const result = await createRecommendationsMutation.mutateAsync({ sessionId: data.sessionId, force: false });
    setStickyRecs(result.recommendations);
    setStickyBrowse(result.browseCandidates);
    setMessages(result.messages);
    voteQuery.refetch();
  };

  const handleForceRefresh = async () => {
    if (!sessionId) {
      return;
    }

    const result = await createRecommendationsMutation.mutateAsync({ sessionId, force: true });
    setStickyRecs(result.recommendations);
    setStickyBrowse(result.browseCandidates);
    setMessages(result.messages);
    voteQuery.refetch();
  };

  const handleVote = async (restaurantId: string) => {
    if (!canVote) {
      setMessages(['이름을 입력한 뒤 투표할 수 있습니다.']);
      return;
    }

    await voteMutation.mutateAsync({
      restaurantId,
      userName: userName.trim(),
    });
  };

  const handleReveal = async () => {
    if (!sessionId) {
      return;
    }

    await revealMutation.mutateAsync();
  };

  return (
    <main className="app-shell">
      <div className="app-container">
        <LunchSessionHeader session={session} userName={userName} onChangeUserName={handleChangeUserName} />

        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            <strong>현재 세션 상태: {statusLabel}</strong>
            <span className="tag">{session?.status ?? 'draft'}</span>
          </div>
          <div className="panel-body">
            <div className="actions">
              <button
                className="button"
                disabled={isLoading || candidates.length > 0}
                onClick={handleCreateSession}
                title={candidates.length > 0 ? '오늘 추천이 이미 생성되어 있습니다.' : ''}
              >
                {candidates.length > 0 ? '오늘 추천 이미 생성됨 ✓' : '오늘 점심 추천 생성'}
              </button>
              <button
                className="button secondary"
                disabled={!sessionId || candidates.length === 0 || createRecommendationsMutation.isPending}
                onClick={handleForceRefresh}
                title="기존 추천을 지우고 새로 뽑습니다"
              >
                다시 추천 뽑기
              </button>
              <button className="button secondary" disabled={recommendationsQuery.isFetching} onClick={() => recommendationsQuery.refetch()}>
                진행 중 투표 보기
              </button>
            </div>
            {candidates.length > 0 ? (
              <p className="muted" style={{ marginTop: 8 }}>
                ℹ️ 오늘 추천이 이미 있습니다. 다른 사람이 이미 만든 추천을 함께 보고 있어요. 새로 뽑고 싶으면 "다시 추천 뽑기"를 누르세요.
              </p>
            ) : null}

            {isLoading ? <p className="muted">처리 중입니다.</p> : null}
            {createRecommendationsMutation.error ? (
              <p className="message">{createRecommendationsMutation.error.message}</p>
            ) : null}
            {voteMutation.error ? <p className="message">{voteMutation.error.message}</p> : null}
            {messages.length > 0 ? (
              <ul className="message-list">
                {messages.map((message) => (
                  <li className="message" key={message}>
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <div className="grid">
          <section>
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-header">
                <strong>추천 후보</strong>
                <span className="tag">{candidates.length}개</span>
              </div>
            </div>
            <CandidateList candidates={candidates} myRestaurantId={myRestaurantId} votingDisabled={!canVote} onVote={handleVote} />
          </section>

          <aside style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <BrowseList candidates={browseCandidates} />
            <VotePanel
              voteState={voteState}
              revealAt={session?.voteRevealAt ?? null}
              onReveal={handleReveal}
              revealLoading={revealMutation.isPending}
            />
            <ResultPanel voteState={voteState} />
            <section className="panel">
              <div className="panel-header">
                <strong>최근 결과</strong>
              </div>
              <div className="panel-body">
                {sessionQuery.data?.recentResults?.length ? (
                  <div className="result-list">
                    {sessionQuery.data.recentResults.map(
                      (result: { sessionId: string; restaurantName: string; visitedAt: string; category: string | null }) => (
                        <div className="result-row" key={result.sessionId}>
                          <span>{result.visitedAt}</span>
                          <strong>{result.restaurantName}</strong>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="muted">아직 방문 이력이 없습니다.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
