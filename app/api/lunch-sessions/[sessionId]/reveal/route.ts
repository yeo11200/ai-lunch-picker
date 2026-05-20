import { handleRevealLunchSession } from '@/lib/lunch/lunch-repository';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const { session, selectedRestaurant } = await handleRevealLunchSession(sessionId);

    return Response.json({
      sessionId: session.id,
      selectedRestaurantId: selectedRestaurant?.id ?? null,
      selectedRestaurantName: selectedRestaurant?.name ?? null,
      status: session.status,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : '결과 공개에 실패했습니다.',
      },
      { status: 400 },
    );
  }
}
