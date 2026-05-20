import { handleCreateLunchSession, handleGetRecentResults } from '@/lib/lunch/lunch-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await handleCreateLunchSession();

  return Response.json({
    session,
    recentResults: await handleGetRecentResults(),
  });
}

export async function POST() {
  const session = await handleCreateLunchSession();

  return Response.json({
    sessionId: session.id,
    status: session.status,
    session,
  });
}
