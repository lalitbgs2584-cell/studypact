import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/monitoring";
import {
  cleanupAbandonedDraftProofs,
  generateWeeklyRecapAndHallOfFame,
  materializeAllGroupsForToday,
  syncMissedCheckInPenalties,
} from "@/lib/server/studypact";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isSunday = new Date().getDay() === 0;

    // Step 1: materialize today's recurring tasks for all members before enforcement
    const materializeSummary = await materializeAllGroupsForToday();

    // Step 2: enforce missed check-ins for yesterday
    const [penaltySummary, cleanupSummary] = await Promise.all([
      syncMissedCheckInPenalties(),
      cleanupAbandonedDraftProofs(),
    ]);

    if (isSunday) {
      await generateWeeklyRecapAndHallOfFame();
    }

    return NextResponse.json({
      success: true,
      completedAt: new Date().toISOString(),
      summary: {
        materialize: materializeSummary,
        penalties: penaltySummary,
        cleanup: cleanupSummary,
        weeklyRecapGenerated: isSunday,
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
