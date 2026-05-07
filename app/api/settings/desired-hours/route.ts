import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/settings/desired-hours — upsert the current user's desired weekly hours
export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  const { hoursPerWeek } = await request.json();

  if (typeof hoursPerWeek !== "number" || hoursPerWeek < 0 || hoursPerWeek > 80) {
    return NextResponse.json({ error: "hoursPerWeek must be 0–80" }, { status: 400 });
  }

  const record = await prisma.desiredHours.upsert({
    where: { userId: user.id },
    create: { userId: user.id, hoursPerWeek },
    update: { hoursPerWeek },
  });

  return NextResponse.json(record);
}
