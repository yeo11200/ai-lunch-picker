import type { VoteState } from '../types/lunch.types';

interface VotePanelProps {
  voteState: VoteState | null;
  revealAt: string | null;
  onReveal: () => void;
  revealLoading: boolean;
}

export function VotePanel({ voteState, revealAt, onReveal, revealLoading }: VotePanelProps) {
  const revealDate = revealAt ? new Date(revealAt) : null;
  const isRevealed = voteState?.isRevealed === true;
  const isRevealTimePassed = revealDate ? revealDate.getTime() <= Date.now() : false;
  const hasMyVote = Boolean(voteState?.myVote?.restaurantId);
  const totalVotes = voteState?.totalVoteCount ?? 0;
  const statusLabel = isRevealed ? '공개됨' : isRevealTimePassed ? '마감' : '마감 전 익명';
  const guidance = isRevealed
    ? totalVotes === 0
      ? '투표 마감 시각(11:20 KST)을 지났습니다. 이번 세션에는 투표가 없어 결과가 비어 있습니다.'
      : '투표가 공개되었습니다. 아래 결과 패널에서 후보별 득표 수와 투표자 목록을 확인하세요.'
    : '11:20(KST) 전까지는 본인의 선택만 확인할 수 있고, 11:20 이후 투표자와 선택 내역이 공개됩니다.';

  return (
    <section className="panel">
      <div className="panel-header">
        <strong>투표 상태</strong>
        <span className={`tag ${isRevealed ? 'ok' : ''}`}>{statusLabel}</span>
      </div>
      <div className="panel-body">
        <p className="muted">{guidance}</p>
        <p>
          <strong>전체 참여자 수: </strong>
          {totalVotes}
        </p>
        <p>
          <strong>내 선택: </strong>
          {hasMyVote ? '투표 완료' : isRevealed ? '미투표' : '아직 투표하지 않음'}
        </p>
        <p className="muted">
          공개 시간:{' '}
          {revealDate
            ? `${revealDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}${isRevealTimePassed ? ' (지남)' : ''}`
            : '-'}
        </p>
        {!isRevealed ? (
          <button className="button danger" disabled={revealLoading} onClick={onReveal}>
            {isRevealTimePassed ? '결과 공개하기' : '지금 결과 공개 (테스트용)'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
