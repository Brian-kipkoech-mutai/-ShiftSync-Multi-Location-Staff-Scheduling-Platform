import { createClient } from "./supabase-server";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  homeTimezone: string;
}

export async function getSessionUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email!, isActive: true },
    select: { id: true, email: true, name: true, role: true, homeTimezone: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  return dbUser;
}

export async function requireRole(
  allowedRoles: Role[],
  redirectTo = "/login"
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!allowedRoles.includes(user.role)) {
    redirect(redirectTo);
  }
  return user;
}
