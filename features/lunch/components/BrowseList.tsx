import type { RestaurantCandidate } from '../types/lunch.types';

interface BrowseListProps {
  candidates: RestaurantCandidate[];
}

export function BrowseList({ candidates }: BrowseListProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-header">
        <strong>더 둘러보기 (450m 이내 전체)</strong>
        <span className="tag">{candidates.length}개</span>
      </div>
      <div className="panel-body">
        <p className="muted" style={{ marginTop: 0 }}>
          AI 추천 이유 없이 점수/태그만 매겨진 후보입니다. 다시 추천을 누르면 이 중에서 4개가 뽑힐 수 있습니다.
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
