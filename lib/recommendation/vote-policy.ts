import type { RevealedVoteResult, VoteInput, VoteState } from '@/features/lunch/types/lunch.types';

interface BuildVoteStateInput {
  now: Date;
  revealAt: Date;
  forceRevealed?: boolean;
  currentUserId: string;
  votes: VoteInput[];
}

export const handleIsVoteRevealed = (now: Date, revealAt: Date) => {
  return now.getTime() >= revealAt.getTime();
};

const handleBuildRevealedResults = (votes: VoteInput[]): RevealedVoteResult[] => {
  const grouped = votes.reduce<Record<string, RevealedVoteResult>>((accumulator, vote) => {
    const current = accumulator[vote.restaurantId] ?? {
      restaurantId: vote.restaurantId,
      restaurantName: vote.restaurantName,
      voteCount: 0,
      voters: [],
    };

    current.voteCount += 1;
    current.voters.push(vote.userName);
    accumulator[vote.restaurantId] = current;
    return accumulator;
  }, {});

  return Object.values(grouped).sort((left, right) => right.voteCount - left.voteCount);
};

export const handleBuildVoteState = (input: BuildVoteStateInput): VoteState => {
  const myVote = input.votes.find((vote) => vote.userId === input.currentUserId) ?? null;
  const isRevealed = input.forceRevealed === true || handleIsVoteRevealed(input.now, input.revealAt);
  const totalVoteCount = input.votes.length;
  const currentUserVote = myVote ? { restaurantId: myVote.restaurantId } : null;

  if (!isRevealed) {
    return {
      isRevealed: false,
      totalVoteCount,
      myVote: currentUserVote,
    };
  }

  return {
    isRevealed: true,
    totalVoteCount,
    myVote: currentUserVote,
    results: handleBuildRevealedResults(input.votes),
  };
};
