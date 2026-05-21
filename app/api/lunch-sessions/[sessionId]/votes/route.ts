import { z } from 'zod';

import { handleGetLunchSession, handleGetVoteInputs, handleUpsertVote } from '@/lib/lunch/lunch-repository';
import { handleBuildVoteState } from '@/lib/recommendation/vote-policy';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const voteSchema = z.object({
  restaurantId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
});

export async function GET(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await handleGetLunchSession(sessionId);

  if (!session) {
    return Response.json({ error: '점심 세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  const url = new URL(request.url);
  const currentUserId = url.searchParams.get('userId') ?? '';

  return Response.json(
    handleBuildVoteState({
      now: new Date(),
      revealAt: new Date(session.voteRevealAt),
      forceRevealed: session.status === 'revealed',
      currentUserId,
      votes: await handleGetVoteInputs(sessionId),
    }),
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = voteSchema.parse(await request.json());

    await handleUpsertVote({
      sessionId,
      restaurantId: body.restaurantId,
      userId: body.userId,
      userName: body.userName,
    });

    return Response.json({
      success: true,
      message: '투표가 저장되었습니다.',
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '투표 저장에 실패했습니다.',
      },
      { status: 400 },
    );
  }
}
