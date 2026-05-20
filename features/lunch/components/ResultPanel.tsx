import type { VoteState } from '../types/lunch.types';

interface ResultPanelProps {
  voteState: VoteState | null;
}

export function ResultPanel({ voteState }: ResultPanelProps) {
  if (!voteState?.isRevealed) {
    return (
      <section className="panel">
        <div className="panel-header">
          <strong>결과 공개</strong>
        </div>
        <div className="panel-body">
          <p className="muted">11:20 이후 후보별 득표 수와 투표자 목록이 공개됩니다.</p>
        </div>
      </section>
    );
  }

  const winner = voteState.results[0];
  const hasAnyVote = voteState.results.length > 0;

  return (
    <section className="panel">
      <div className="panel-header">
        <strong>오늘의 점심</strong>
        <span className={`tag ${hasAnyVote ? 'ok' : 'warn'}`}>
          {hasAnyVote ? (winner?.restaurantName ?? '선정 전') : '투표 없음'}
        </span>
      </div>
      <div className="panel-body result-list">
        {hasAnyVote ? (
          voteState.results.map((result, index) => (
            <div className="result-row" key={result.restaurantId}>
              <div>
                <strong>
                  {index + 1}위 {result.restaurantName} - {result.voteCount}표
                </strong>
                <p className="muted">{result.voters.join(', ')}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            이번 세션에는 투표가 한 건도 들어오지 않아 선정된 식당이 없습니다. 다음 추천에서 다시 투표해 보세요.
          </p>
        )}
      </div>
    </section>
  );
}
