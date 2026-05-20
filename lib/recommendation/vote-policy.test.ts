import { describe, expect, it } from 'vitest';

import { handleBuildVoteState, handleIsVoteRevealed } from './vote-policy';

const revealAt = '2026-05-19T02:20:00.000Z';

describe('vote policy', () => {
  it('keeps other voter choices hidden before 11:20 Asia/Seoul', () => {
    const state = handleBuildVoteState({
      now: new Date('2026-05-19T02:19:59.000Z'),
      revealAt: new Date(revealAt),
      currentUserId: 'u1',
      votes: [
        { restaurantId: 'r1', restaurantName: '백반집', userId: 'u1', userName: '진섭' },
        { restaurantId: 'r2', restaurantName: '국밥집', userId: 'u2', userName: '민수' },
      ],
    });

    expect(state.isRevealed).toBe(false);
    expect(state.totalVoteCount).toBe(2);
    expect(state.myVote?.restaurantId).toBe('r1');
    expect('results' in state).toBe(false);
  });

  it('reveals vote counts and voter names at 11:20 Asia/Seoul', () => {
    expect(handleIsVoteRevealed(new Date('2026-05-19T02:20:00.000Z'), new Date(revealAt))).toBe(true);

    const state = handleBuildVoteState({
      now: new Date('2026-05-19T02:20:00.000Z'),
      revealAt: new Date(revealAt),
      currentUserId: 'u1',
      votes: [
        { restaurantId: 'r1', restaurantName: '백반집', userId: 'u1', userName: '진섭' },
        { restaurantId: 'r1', restaurantName: '백반집', userId: 'u2', userName: '민수' },
        { restaurantId: 'r2', restaurantName: '국밥집', userId: 'u3', userName: '지현' },
      ],
    });

    expect(state.isRevealed).toBe(true);

    if (!state.isRevealed) {
      throw new Error('revealed state expected');
    }

    expect(state.results[0]).toEqual({
      restaurantId: 'r1',
      restaurantName: '백반집',
      voteCount: 2,
      voters: ['진섭', '민수'],
    });
  });
});
