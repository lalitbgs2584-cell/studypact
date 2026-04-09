import { NextResponse } from "next/server";
import { headers } from "next/headers";
import auth from "@/lib/auth/auth";
import { submitCheckInAction } from "@/lib/actions/studypact";
import { prisma } from "@/lib/db";
import { reportServerError } from "@/lib/monitoring";
import { startOfDay } from "@/lib/studypact";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const dayParam = searchParams.get("day");
    const parsedDay = dayParam ? new Date(dayParam) : undefined;
    if (parsedDay && Number.isNaN(parsedDay.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid day format. Use YYYY-MM-DD." },
        { status: 400 },
      );
    }
    const day = parsedDay ? startOfDay(parsedDay) : undefined;

    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: session.user.id,
        ...(groupId ? { groupId } : {}),
        ...(day ? { day } : {}),
      },
      include: {
        tasks: true,
        verifications: true,
        startFiles: true,
        endFiles: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      checkIns,
    });
  } catch (error) {
    await reportServerError("api:checkins:get", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not load check-ins",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      groupId?: string;
      reflection?: string;
      proofText?: string;
      proofLink?: string;
      startFileId?: string;
      endFileId?: string;
    };

    if (!body.groupId || !body.startFileId || !body.endFileId) {
      return NextResponse.json(
        {
          success: false,
          error: "groupId, startFileId, and endFileId are required",
        },
        { status: 400 },
      );
    }

    const result = await submitCheckInAction({
      groupId: body.groupId,
      reflection: body.reflection,
      proofText: body.proofText,
      proofLink: body.proofLink,
      startFileId: body.startFileId,
      endFileId: body.endFileId,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    await reportServerError("api:checkins:post", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not submit check-in",
      },
      { status: 500 },
    );
  }
}
