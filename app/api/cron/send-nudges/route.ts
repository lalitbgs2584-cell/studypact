import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/monitoring";
import { sendPreDeadlineNudges } from "@/lib/server/studypact";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await sendPreDeadlineNudges();

    return NextResponse.json({
      success: true,
      completedAt: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    await reportServerError("cron:send-nudges", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron execution failed",
      },
      { status: 500 },
    );
  }
}
