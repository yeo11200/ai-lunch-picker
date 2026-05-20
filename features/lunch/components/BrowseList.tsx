import type { RestaurantCandidate } from '../types/lunch.types';

interface BrowseListProps {
  candidates: RestaurantCandidate[];
}

export function BrowseList({ candidates }: BrowseListProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <section className="panel side-recommendations">
      <div className="panel-header">
        <strong>사이드 추천</strong>
        <span className="tag">{candidates.length}개</span>
      </div>
      <div className="panel-body">
        <p className="muted" style={{ marginTop: 0 }}>
          메인 4개에는 들지 않았지만 거리, 예산, 제로페이 가능성을 기준으로 같이 볼 만한 식당입니다.
        </p>
        <ul className="browse-list">
          {candidates.map((candidate) => {
            const zeropayClass = candidate.isZeropayLikely
              ? 'tag ok'
              : candidate.zeropayConfidence === 'LOW'
                ? 'tag warn'
                : 'tag';
            const zeropayLabel = candidate.isZeropayLikely
              ? '제로페이 ↑'
              : candidate.zeropayConfidence === 'LOW'
                ? '제로페이 ↓'
                : '제로페이 ?';
            const priceClass = candidate.isLikelyUnderBudget ? 'tag ok' : 'tag warn';
            const priceLabel = candidate.isLikelyUnderBudget ? '예산 적합' : '가격 확인';

            return (
              <li className="browse-row" key={candidate.id}>
                <div className="browse-main">
                  <strong className="browse-name">{candidate.name}</strong>
                  <span className="muted browse-category">{candidate.category ?? '카테고리 없음'}</span>
                </div>
                <div className="browse-tags">
                  <span className="tag">{candidate.distanceMeters}m</span>
                  <span className={priceClass}>{priceLabel}</span>
                  <span className={zeropayClass} title={candidate.zeropayReason ?? ''}>
                    {zeropayLabel}
                  </span>
                  <span className="tag">점수 {candidate.score.toFixed(2)}</span>
                </div>
                <div className="browse-links">
                  {candidate.naverMapUrl ? (
                    <a className="button secondary browse-link" href={candidate.naverMapUrl} target="_blank" rel="noreferrer">
                      지도
                    </a>
                  ) : null}
                  {candidate.officialUrl ? (
                    <a className="button secondary browse-link" href={candidate.officialUrl} target="_blank" rel="noreferrer">
                      사이트
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
