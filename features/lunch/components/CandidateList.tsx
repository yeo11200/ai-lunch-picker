import type { RestaurantCandidate } from '../types/lunch.types';
import { RecommendationCard } from './RecommendationCard';

interface CandidateListProps {
  candidates: RestaurantCandidate[];
  myRestaurantId: string | null;
  votingDisabled: boolean;
  onVote: (restaurantId: string) => void;
}

export function CandidateList({ candidates, myRestaurantId, votingDisabled, onVote }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <div className="panel">
        <div className="panel-body">
          <p className="muted">아직 추천 후보가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="candidate-list">
      {candidates.map((candidate) => (
        <RecommendationCard
          key={candidate.id}
          candidate={candidate}
          selected={myRestaurantId === candidate.id}
          disabled={votingDisabled}
          onVote={onVote}
        />
      ))}
    </div>
  );
}
