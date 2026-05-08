import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  const pref = await prisma.notificationPreference.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ emailSimulation: pref?.emailSimulation ?? true });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  const { emailSimulation } = await request.json();
  if (typeof emailSimulation !== "boolean") {
    return NextResponse.json({ error: "emailSimulation must be a boolean" }, { status: 400 });
  }

  const pref = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: { emailSimulation },
    create: { userId: user.id, inApp: true, emailSimulation },
  });

  return NextResponse.json({ emailSimulation: pref.emailSimulation });
}
