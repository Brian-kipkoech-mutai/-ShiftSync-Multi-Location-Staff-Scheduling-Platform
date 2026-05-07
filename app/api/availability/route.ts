import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// GET /api/availability — current user's availability windows + exceptions
export async function GET() {
  const user = await getSessionUser();

  const windows = await prisma.availabilityWindow.findMany({
    where: { userId: user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  const exceptions = await prisma.availabilityException.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ windows, exceptions });
}

// POST /api/availability — create a window or exception
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  const body = await request.json();

  if (body.type === "window") {
    const { dayOfWeek, startTime, endTime } = body;
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: "dayOfWeek, startTime, endTime required" }, { status: 400 });
    }
    const window = await prisma.availabilityWindow.create({
      data: { userId: user.id, dayOfWeek, startTime, endTime },
    });
    await logAudit({ entityType: "availability", entityId: window.id, action: "create", after: window, performedBy: user.id });
    return NextResponse.json(window, { status: 201 });
  }

  if (body.type === "exception") {
    const { date, startTime, endTime, isUnavailable } = body;
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
    const exception = await prisma.availabilityException.create({
      data: { userId: user.id, date, startTime: startTime ?? null, endTime: endTime ?? null, isUnavailable: !!isUnavailable },
    });
    await logAudit({ entityType: "availability", entityId: exception.id, action: "create", after: exception, performedBy: user.id });
    return NextResponse.json(exception, { status: 201 });
  }

  return NextResponse.json({ error: "type must be 'window' or 'exception'" }, { status: 400 });
}
