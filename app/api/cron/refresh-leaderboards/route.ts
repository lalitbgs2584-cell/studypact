import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportServerError } from "@/lib/monitoring";
import { addDays, startOfDay } from "@/lib/studypact";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = startOfDay();
    const weekStart = addDays(today, -6);
    const groups = await prisma.group.findMany({
      include: {
        users: {
          include: {
            user: true,
          },
        },
        checkIns: {
          where: {
            day: {
              gte: weekStart,
              lte: today,
            },
          },
          select: {
            userId: true,
            status: true,
          },
        },
        penaltyEvents: {
          where: {
            createdAt: {
              gte: weekStart,
            },
          },
          select: {
            points: true,
          },
        },
      },
    });

    const summary = groups.map((group) => {
      const weeklyScores = new Map<string, number>();
      for (const checkIn of group.checkIns) {
        const current = weeklyScores.get(checkIn.userId) ?? 0;
        weeklyScores.set(
          checkIn.userId,
          current + (checkIn.status === "APPROVED" ? 3 : checkIn.status === "PENDING" ? 1 : 0),
        );
      }

      const leader = [...group.users]
        .sort((left, right) => {
          const rightScore = weeklyScores.get(right.userId) ?? 0;
          const leftScore = weeklyScores.get(left.userId) ?? 0;
          if (rightScore !== leftScore) {
            return rightScore - leftScore;
          }
          return right.points - left.points;
        })[0];

      return {
        groupId: group.id,
        groupName: group.name,
        leader: leader ? leader.user.name : null,
        weeklyPool: group.penaltyEvents.reduce((sum, penalty) => sum + penalty.points, 0),
      };
    });

    return NextResponse.json({
      success: true,
      completedAt: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    await reportServerError("cron:refresh-leaderboards", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron execution failed",
      },
      { status: 500 },
    );
  }
}
