import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/monitoring";
import {
  cleanupAbandonedDraftProofs,
  syncMissedCheckInPenalties,
} from "@/lib/server/studypact";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [penaltySummary, cleanupSummary] = await Promise.all([
      syncMissedCheckInPenalties(),
      cleanupAbandonedDraftProofs(),
    ]);

    return NextResponse.json({
      success: true,
      completedAt: new Date().toISOString(),
      summary: {
        penalties: penaltySummary,
        cleanup: cleanupSummary,
      },
    });
  } catch (error) {
    await reportServerError("cron:check-missed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron execution failed",
      },
      { status: 500 },
    );
  }
}
