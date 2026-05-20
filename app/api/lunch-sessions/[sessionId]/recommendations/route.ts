import { handleGetRestaurantCandidates } from '@/lib/lunch/lunch-repository';
import { handleGenerateRecommendations } from '@/lib/recommendation/recommendation-service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const candidates = await handleGetRestaurantCandidates(sessionId);

  return Response.json({
    sessionId,
    recommendations: candidates.filter((candidate) => candidate.aiReason).slice(0, 4),
    browseCandidates: candidates.filter((candidate) => !candidate.aiReason),
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    const result = await handleGenerateRecommendations(sessionId, { force });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : '추천 후보 생성에 실패했습니다.',
      },
      { status: 400 },
    );
  }
}
