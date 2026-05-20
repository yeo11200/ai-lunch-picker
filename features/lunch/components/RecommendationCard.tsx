import type { RestaurantCandidate } from '../types/lunch.types';

interface RecommendationCardProps {
  candidate: RestaurantCandidate;
  selected: boolean;
  disabled: boolean;
  onVote: (restaurantId: string) => void;
}

export function RecommendationCard({ candidate, selected, disabled, onVote }: RecommendationCardProps) {
  const priceTagClassName = candidate.isLikelyUnderBudget ? 'tag ok' : 'tag warn';
  const zeropayTagClassName = candidate.isZeropayLikely
    ? 'tag ok'
    : candidate.zeropayConfidence === 'LOW'
      ? 'tag warn'
      : 'tag';
  const zeropayLabel = candidate.isZeropayLikely
    ? '제로페이 가능성 ↑'
    : candidate.zeropayConfidence === 'LOW'
      ? '제로페이 어려움'
      : '제로페이 미확인';

  return (
    <article className="candidate-card">
      <div className="candidate-content">
        <div className="candidate-main">
          <div>
            <h3 className="candidate-title">{candidate.name}</h3>
            <p className="candidate-address">{candidate.address ?? candidate.roadAddress}</p>
          </div>

          <div className="candidate-meta">
            <span className="tag">{candidate.distanceMeters}m</span>
            <span className="tag">{candidate.category ?? '카테고리 없음'}</span>
            <span className="tag">가격 신뢰도 {candidate.priceConfidence}</span>
            <span className={zeropayTagClassName} title={candidate.zeropayReason ?? ''}>
              {zeropayLabel}
            </span>
            <span className="tag">점수 {candidate.score.toFixed(2)}</span>
          </div>

          <div className="candidate-copy">
            <p>
              <strong>추천 이유: </strong>
              {candidate.aiReason}
            </p>
            {candidate.description ? (
              <p className="muted">
                <strong>소개: </strong>
                {candidate.description}
              </p>
            ) : null}
            {candidate.caution ? (
              <p className="muted">
                <strong>주의: </strong>
                {candidate.caution}
              </p>
            ) : null}
            {candidate.phoneNumber || candidate.roadAddress ? (
              <div className="candidate-extra">
                {candidate.phoneNumber ? (
                  <a className="extra-chip" href={`tel:${candidate.phoneNumber.replace(/[^0-9+]/g, '')}`}>
                    📞 {candidate.phoneNumber}
                  </a>
                ) : null}
                {candidate.roadAddress ? <span className="extra-chip muted">📍 {candidate.roadAddress}</span> : null}
              </div>
            ) : null}
          </div>

          <div className="actions">
            <button className="button" disabled={disabled} onClick={() => onVote(candidate.id)}>
              {selected ? '내 선택' : '이 식당에 투표하기'}
            </button>
            {candidate.naverMapUrl ? (
              <a className="button secondary" href={candidate.naverMapUrl} target="_blank" rel="noreferrer">
                네이버 지도 열기
              </a>
            ) : null}
            {candidate.officialUrl ? (
              <a className="button secondary" href={candidate.officialUrl} target="_blank" rel="noreferrer">
                공식 사이트
              </a>
            ) : null}
          </div>
        </div>

        <div className="candidate-status">
          <span className={priceTagClassName}>{candidate.isLikelyUnderBudget ? '예산 적합 가능' : '가격 확인 필요'}</span>
        </div>
      </div>
    </article>
  );
}
