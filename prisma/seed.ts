/**
 * Seed script — creates Supabase Auth users + all DB data for ShiftSync demo.
 * Run with: pnpm prisma db seed
 *
 * Covers every scenario from TASKS.md:
 *  - Overtime warning (36h) and block (39h) staff
 *  - Pending swap + drop requests
 *  - No-Saturday-premium staff (fairness demo)
 *  - 5 consecutive days staff (consecutive-day warning demo)
 *  - Cross-timezone certifications
 *  - Overnight shift
 *  - Baked-in constraint violation (insufficient rest, flagged)
 *  - Historical 4 weeks + upcoming full week
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

// Seed uses the direct connection to avoid the pgbouncer connection_limit=1 constraint
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { fromZonedTime } from "date-fns-tz";
import { addDays, addWeeks, subWeeks, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay } from "date-fns";

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a UTC Date from a local wall-clock time in a timezone. */
function localToUtc(
  year: number,
  month: number, // 1-based
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const local = new Date(year, month - 1, day, hour, minute, 0, 0);
  return fromZonedTime(local, timezone);
}

/** Monday of a given date's ISO week. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function createAuthUser(email: string, password: string, name: string) {
  // Try to create; if already exists, look up and return existing user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    if (error.message.includes("already been registered") || error.message.includes("already exists")) {
      // Find existing
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === email);
      if (existing) return existing.id;
    }
    throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  }
  return data.user!.id;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding ShiftSync...\n");

  // ── 1. Wipe existing data (order matters for FK constraints) ──────────────
  console.log("Clearing existing data...");
  await prisma.swapRequest.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityWindow.deleteMany();
  await prisma.desiredHours.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.simulatedEmail.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.overtimeOverride.deleteMany();
  await prisma.locationCertification.deleteMany();
  await prisma.managerLocationAssignment.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.location.deleteMany();
  await prisma.systemSettings.deleteMany();
  console.log("  ✓ Cleared\n");

  // ── 2. System settings ────────────────────────────────────────────────────
  await prisma.systemSettings.createMany({
    data: [
      { key: "edit_cutoff_hours", value: "48" },
      { key: "premium_start_hour", value: "17" },
      { key: "premium_end_hour", value: "24" },
    ],
  });
  console.log("✓ System settings");

  // ── 3. Locations ─────────────────────────────────────────────────────────
  const pier = await prisma.location.create({ data: { name: "The Pier", address: "1 Pier Plaza, San Francisco, CA 94111", timezone: "America/Los_Angeles" } });
  const sunsetGrill = await prisma.location.create({ data: { name: "Sunset Grill", address: "9001 Sunset Blvd, Los Angeles, CA 90069", timezone: "America/Los_Angeles" } });
  const harborView = await prisma.location.create({ data: { name: "Harbor View", address: "100 Fulton St, New York, NY 10038", timezone: "America/New_York" } });
  const wharf = await prisma.location.create({ data: { name: "The Wharf", address: "290 Northern Ave, Boston, MA 02210", timezone: "America/New_York" } });
  console.log("✓ Locations");

  // ── 4. Skills ─────────────────────────────────────────────────────────────
  const bartender = await prisma.skill.create({ data: { name: "bartender" } });
  const lineCook = await prisma.skill.create({ data: { name: "line cook" } });
  const server = await prisma.skill.create({ data: { name: "server" } });
  const host = await prisma.skill.create({ data: { name: "host" } });
  const supervisor = await prisma.skill.create({ data: { name: "supervisor" } });
  console.log("✓ Skills");

  // ── 5. Auth users ─────────────────────────────────────────────────────────
  console.log("Creating Supabase auth users...");

  const authIds = await Promise.all([
    createAuthUser("admin@coastaleats.com", "Admin1234!", "Admin User"),
    createAuthUser("manager.sf@coastaleats.com", "Manager1234!", "Jordan Lee"),
    createAuthUser("manager.ny@coastaleats.com", "Manager1234!", "Taylor Nguyen"),
    createAuthUser("manager.cross@coastaleats.com", "Manager1234!", "Morgan Walsh"),
    // Staff
    createAuthUser("alex.chen@coastaleats.com", "Staff1234!", "Alex Chen"),
    createAuthUser("maria.santos@coastaleats.com", "Staff1234!", "Maria Santos"),
    createAuthUser("james.wilson@coastaleats.com", "Staff1234!", "James Wilson"),
    createAuthUser("sarah.johnson@coastaleats.com", "Staff1234!", "Sarah Johnson"),
    createAuthUser("mike.brown@coastaleats.com", "Staff1234!", "Mike Brown"),
    createAuthUser("emma.davis@coastaleats.com", "Staff1234!", "Emma Davis"),
    createAuthUser("carlos.rivera@coastaleats.com", "Staff1234!", "Carlos Rivera"),
    createAuthUser("priya.patel@coastaleats.com", "Staff1234!", "Priya Patel"),
    createAuthUser("david.kim@coastaleats.com", "Staff1234!", "David Kim"),
    createAuthUser("lisa.thompson@coastaleats.com", "Staff1234!", "Lisa Thompson"),
  ]);

  const [
    _adminAuthId, _sfAuthId, _nyAuthId, _crossAuthId,
    _alexAuthId, _mariaAuthId, _jamesAuthId, _sarahAuthId,
    _mikeAuthId, _emmaAuthId, _carlosAuthId, _priyaAuthId,
    _davidAuthId, _lisaAuthId,
  ] = authIds;

  console.log("  ✓ Auth users created");

  // ── 6. Prisma users ───────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: { email: "admin@coastaleats.com", name: "Admin User", role: "admin", homeTimezone: "America/Los_Angeles" },
  });

  const managerSf = await prisma.user.create({ data: { email: "manager.sf@coastaleats.com", name: "Jordan Lee", role: "manager", homeTimezone: "America/Los_Angeles" } });
  const managerNy = await prisma.user.create({ data: { email: "manager.ny@coastaleats.com", name: "Taylor Nguyen", role: "manager", homeTimezone: "America/New_York" } });
  const managerCross = await prisma.user.create({ data: { email: "manager.cross@coastaleats.com", name: "Morgan Walsh", role: "manager", homeTimezone: "America/Los_Angeles" } });

  // Staff
  // alex: bartender+server, cert: Pier + HarborView (cross-timezone)
  const alex = await prisma.user.create({
    data: { email: "alex.chen@coastaleats.com", name: "Alex Chen", role: "staff", homeTimezone: "America/Los_Angeles" },
  });
  // maria: server+host, cert: SunsetGrill + Wharf (cross-timezone)
  const maria = await prisma.user.create({
    data: { email: "maria.santos@coastaleats.com", name: "Maria Santos", role: "staff", homeTimezone: "America/Los_Angeles" },
  });
  // james: line cook, cert: Pier
  const james = await prisma.user.create({
    data: { email: "james.wilson@coastaleats.com", name: "James Wilson", role: "staff", homeTimezone: "America/Los_Angeles" },
  });
  // sarah: bartender+supervisor, cert: Pier + SunsetGrill
  const sarah = await prisma.user.create({
    data: { email: "sarah.johnson@coastaleats.com", name: "Sarah Johnson", role: "staff", homeTimezone: "America/Los_Angeles" },
  });
  // mike: server+host, cert: HarborView — AT 36h THIS WEEK (overtime warning)
  const mike = await prisma.user.create({
    data: { email: "mike.brown@coastaleats.com", name: "Mike Brown", role: "staff", homeTimezone: "America/New_York" },
  });
  // emma: bartender+line cook, cert: HarborView + Wharf — AT 39h THIS WEEK (block demo)
  const emma = await prisma.user.create({
    data: { email: "emma.davis@coastaleats.com", name: "Emma Davis", role: "staff", homeTimezone: "America/New_York" },
  });
  // carlos: host+server, cert: Wharf — HAS PENDING SWAP REQUEST
  const carlos = await prisma.user.create({
    data: { email: "carlos.rivera@coastaleats.com", name: "Carlos Rivera", role: "staff", homeTimezone: "America/New_York" },
  });
  // priya: line cook+supervisor, cert: Pier — HAS PENDING DROP REQUEST
  const priya = await prisma.user.create({
    data: { email: "priya.patel@coastaleats.com", name: "Priya Patel", role: "staff", homeTimezone: "America/Los_Angeles" },
  });
  // david: server, cert: SunsetGrill + HarborView (cross-tz) — NO SATURDAY EVENING SHIFTS (fairness demo)
  const david = await prisma.user.create({
    data: { email: "david.kim@coastaleats.com", name: "David Kim", role: "staff", homeTimezone: "America/Los_Angeles" },
  });
  // lisa: bartender, cert: Wharf — WORKING 5 CONSECUTIVE DAYS (Mon-Fri)
  const lisa = await prisma.user.create({
    data: { email: "lisa.thompson@coastaleats.com", name: "Lisa Thompson", role: "staff", homeTimezone: "America/New_York" },
  });

  console.log("✓ Users");

  // ── 7. Skills per user ────────────────────────────────────────────────────
  await prisma.userSkill.createMany({
    data: [
      { userId: alex.id, skillId: bartender.id },
      { userId: alex.id, skillId: server.id },
      { userId: maria.id, skillId: server.id },
      { userId: maria.id, skillId: host.id },
      { userId: james.id, skillId: lineCook.id },
      { userId: sarah.id, skillId: bartender.id },
      { userId: sarah.id, skillId: supervisor.id },
      { userId: mike.id, skillId: server.id },
      { userId: mike.id, skillId: host.id },
      { userId: emma.id, skillId: bartender.id },
      { userId: emma.id, skillId: lineCook.id },
      { userId: carlos.id, skillId: host.id },
      { userId: carlos.id, skillId: server.id },
      { userId: priya.id, skillId: lineCook.id },
      { userId: priya.id, skillId: supervisor.id },
      { userId: david.id, skillId: server.id },
      { userId: lisa.id, skillId: bartender.id },
    ],
  });
  console.log("✓ User skills");

  // ── 8. Location certifications ────────────────────────────────────────────
  await prisma.locationCertification.createMany({
    data: [
      // Alex — cross-timezone: PT + ET
      { userId: alex.id, locationId: pier.id },
      { userId: alex.id, locationId: harborView.id },
      // Maria — cross-timezone: PT + ET
      { userId: maria.id, locationId: sunsetGrill.id },
      { userId: maria.id, locationId: wharf.id },
      // James — PT only
      { userId: james.id, locationId: pier.id },
      // Sarah — PT both
      { userId: sarah.id, locationId: pier.id },
      { userId: sarah.id, locationId: sunsetGrill.id },
      // Mike — ET
      { userId: mike.id, locationId: harborView.id },
      // Emma — ET both
      { userId: emma.id, locationId: harborView.id },
      { userId: emma.id, locationId: wharf.id },
      // Carlos — ET
      { userId: carlos.id, locationId: wharf.id },
      // Priya — PT
      { userId: priya.id, locationId: pier.id },
      // David — cross-timezone: PT + ET
      { userId: david.id, locationId: sunsetGrill.id },
      { userId: david.id, locationId: harborView.id },
      // Lisa — ET
      { userId: lisa.id, locationId: wharf.id },
    ],
  });
  console.log("✓ Certifications");

  // ── 9. Manager → location assignments ────────────────────────────────────
  await prisma.managerLocationAssignment.createMany({
    data: [
      { managerId: managerSf.id, locationId: pier.id },
      { managerId: managerSf.id, locationId: sunsetGrill.id },
      { managerId: managerNy.id, locationId: harborView.id },
      { managerId: managerNy.id, locationId: wharf.id },
      { managerId: managerCross.id, locationId: pier.id },
      { managerId: managerCross.id, locationId: sunsetGrill.id },
      { managerId: managerCross.id, locationId: harborView.id },
      { managerId: managerCross.id, locationId: wharf.id },
    ],
  });
  console.log("✓ Manager assignments");

  // ── 10. Availability windows (recurring, Mon=1…Sun=0) ─────────────────────
  // Most staff: Mon–Fri 9am-10pm, Sat–Sun 10am-11pm (in their home tz)
  const ptStaff = [alex, james, sarah, priya, david, maria];
  const etStaff = [mike, emma, carlos, lisa];

  async function addWeeklyAvailability(userId: string, days: number[], start: string, end: string) {
    await prisma.availabilityWindow.createMany({
      data: days.map((d) => ({ userId, dayOfWeek: d, startTime: start, endTime: end })),
    });
  }

  for (const u of ptStaff) {
    await addWeeklyAvailability(u.id, [1, 2, 3, 4, 5], "09:00", "22:00"); // Mon-Fri
    await addWeeklyAvailability(u.id, [6, 0], "10:00", "23:00"); // Sat-Sun
  }
  for (const u of etStaff) {
    await addWeeklyAvailability(u.id, [1, 2, 3, 4, 5], "08:00", "22:00");
    await addWeeklyAvailability(u.id, [6, 0], "10:00", "23:00");
  }

  // One-off exceptions: Alex unavailable May 15 (next Friday)
  await prisma.availabilityException.create({
    data: { userId: alex.id, date: "2026-05-15", isUnavailable: true },
  });
  // Maria has extra availability on May 10 (Sunday) 8am-11pm
  await prisma.availabilityException.create({
    data: { userId: maria.id, date: "2026-05-10", startTime: "08:00", endTime: "23:00", isUnavailable: false },
  });

  console.log("✓ Availability windows + exceptions");

  // ── 11. Desired hours ─────────────────────────────────────────────────────
  await prisma.desiredHours.createMany({
    data: [
      { userId: alex.id, hoursPerWeek: 32 },
      { userId: maria.id, hoursPerWeek: 30 },
      { userId: james.id, hoursPerWeek: 40 },
      { userId: sarah.id, hoursPerWeek: 35 },
      { userId: mike.id, hoursPerWeek: 40 },
      { userId: emma.id, hoursPerWeek: 40 },
      { userId: carlos.id, hoursPerWeek: 28 },
      { userId: priya.id, hoursPerWeek: 35 },
      { userId: david.id, hoursPerWeek: 30 },
      { userId: lisa.id, hoursPerWeek: 38 },
    ],
  });
  console.log("✓ Desired hours");

  // ── 12. Notification preferences ─────────────────────────────────────────
  const allUsers = [admin, managerSf, managerNy, managerCross, alex, maria, james, sarah, mike, emma, carlos, priya, david, lisa];
  await prisma.notificationPreference.createMany({
    data: allUsers.map((u) => ({ userId: u.id, inApp: true, emailSimulation: true })),
  });
  console.log("✓ Notification preferences");

  // ── 13. Shifts ────────────────────────────────────────────────────────────
  // Reference dates — today is 2026-05-06 (Wednesday)
  // Current week: Mon May 4 – Sun May 10
  // Upcoming week: Mon May 11 – Sun May 17

  // Helper: create shift in location's local time
  async function mkShift(
    locationId: string,
    locationTimezone: string,
    skillId: string,
    year: number,
    month: number,
    day: number,
    startHour: number,
    endHour: number,
    headcount: number,
    status: "draft" | "published",
    createdById: string,
    endNextDay = false
  ) {
    const startUtc = localToUtc(year, month, day, startHour, 0, locationTimezone);
    const endDate = endNextDay ? day + 1 : day;
    const endUtc = localToUtc(year, month, endDate, endHour, 0, locationTimezone);

    // isPremium: Fri(5) or Sat(6) in location tz, 17:00–23:59
    const localStart = new Date(startUtc.getTime());
    // Convert to location time to check day/hour
    const tempDate = new Date(startUtc.toLocaleString("en-US", { timeZone: locationTimezone }));
    const localDow = tempDate.getDay();
    const localHour = tempDate.getHours();
    const isPremium = (localDow === 5 || localDow === 6) && localHour >= 17;
    const isOvernight = endNextDay || endHour < startHour;

    const shift = await prisma.shift.create({
      data: {
        locationId,
        startUtc,
        endUtc,
        requiredSkillId: skillId,
        headcount,
        status,
        isOvernight,
        isPremium,
        createdBy: createdById,
      },
    });
    await prisma.auditLog.create({
      data: {
        entityType: "shift",
        entityId: shift.id,
        action: "create",
        afterState: { locationId, startUtc, endUtc, requiredSkillId: skillId, headcount, status, isOvernight, isPremium },
        performedBy: createdById,
      },
    });
    return shift;
  }

  // ── UPCOMING WEEK (May 11–17) — draft + published mix ────────────────────
  // The Pier (SF, PT)
  const pierMon        = await mkShift(pier.id, "America/Los_Angeles", server.id,     2026, 5, 11, 9,  17, 2, "published", managerSf.id);
  const pierTue        = await mkShift(pier.id, "America/Los_Angeles", bartender.id,  2026, 5, 12, 11, 19, 1, "published", managerSf.id);
  const pierWed        = await mkShift(pier.id, "America/Los_Angeles", lineCook.id,   2026, 5, 13, 10, 18, 1, "published", managerSf.id);
  await                         mkShift(pier.id, "America/Los_Angeles", server.id,     2026, 5, 14, 11, 19, 2, "draft",     managerSf.id); // Thu draft
  const pierFriPremium = await mkShift(pier.id, "America/Los_Angeles", bartender.id,  2026, 5, 15, 17, 23, 1, "published", managerSf.id);
  await                         mkShift(pier.id, "America/Los_Angeles", supervisor.id, 2026, 5, 16, 17, 23, 1, "published", managerSf.id); // Sat PREMIUM
  await                         mkShift(pier.id, "America/Los_Angeles", server.id,     2026, 5, 16, 23,  3, 1, "published", managerSf.id, true); // OVERNIGHT

  // Sunset Grill (LA, PT)
  const sunsetMon      = await mkShift(sunsetGrill.id, "America/Los_Angeles", server.id,    2026, 5, 11, 10, 18, 2, "published", managerSf.id);
  await                         mkShift(sunsetGrill.id, "America/Los_Angeles", host.id,      2026, 5, 13, 11, 19, 1, "published", managerSf.id);
  const sunsetFriPremium = await mkShift(sunsetGrill.id, "America/Los_Angeles", server.id,  2026, 5, 15, 17, 23, 2, "published", managerSf.id);
  await                         mkShift(sunsetGrill.id, "America/Los_Angeles", bartender.id, 2026, 5, 16, 18, 23, 1, "draft",     managerSf.id); // Sat draft

  // Harbor View (NY, ET)
  const harborMon      = await mkShift(harborView.id, "America/New_York", server.id,    2026, 5, 11, 9,  17, 2, "published", managerNy.id);
  const harborTue      = await mkShift(harborView.id, "America/New_York", bartender.id, 2026, 5, 12, 11, 19, 1, "published", managerNy.id);
  await                         mkShift(harborView.id, "America/New_York", lineCook.id,  2026, 5, 13, 10, 18, 1, "published", managerNy.id);
  const harborFriPremium = await mkShift(harborView.id, "America/New_York", server.id,  2026, 5, 15, 17, 23, 2, "published", managerNy.id);
  const harborSatPremium = await mkShift(harborView.id, "America/New_York", bartender.id, 2026, 5, 16, 17, 23, 2, "published", managerNy.id);

  // The Wharf (Boston, ET)
  const wharfMon       = await mkShift(wharf.id, "America/New_York", host.id,      2026, 5, 11, 10, 18, 1, "published", managerNy.id);
  const wharfTue       = await mkShift(wharf.id, "America/New_York", server.id,    2026, 5, 12, 10, 18, 2, "published", managerNy.id);
  await                         mkShift(wharf.id, "America/New_York", bartender.id, 2026, 5, 14, 11, 19, 1, "published", managerNy.id);
  const wharfFriPremium  = await mkShift(wharf.id, "America/New_York", server.id,  2026, 5, 15, 17, 23, 2, "published", managerNy.id);
  const wharfSatPremium  = await mkShift(wharf.id, "America/New_York", bartender.id, 2026, 5, 16, 18, 23, 1, "published", managerNy.id);

  // ── CURRENT WEEK (May 4–10) — overtime demos, consecutive days ──────────
  // Mike Brown @ HarborView — 36h this week (warning demo)
  const mikeMon = await mkShift(harborView.id, "America/New_York", server.id,   2026, 5, 4, 9,  17, 2, "published", managerNy.id);
  const mikeTue = await mkShift(harborView.id, "America/New_York", server.id,   2026, 5, 5, 9,  17, 2, "published", managerNy.id);
  const mikeWed = await mkShift(harborView.id, "America/New_York", server.id,   2026, 5, 6, 12, 20, 2, "published", managerNy.id);
  const mikeThu = await mkShift(harborView.id, "America/New_York", server.id,   2026, 5, 7, 14, 21, 2, "published", managerNy.id);
  const mikeFri = await mkShift(harborView.id, "America/New_York", host.id,     2026, 5, 8, 17, 22, 2, "published", managerNy.id); // +5h = 36h

  // Emma Davis @ HarborView/Wharf — 39h this week (block demo)
  const emmaMon = await mkShift(harborView.id, "America/New_York", bartender.id, 2026, 5, 4, 8,  18, 2, "published", managerNy.id); // 10h
  const emmaTue = await mkShift(harborView.id, "America/New_York", bartender.id, 2026, 5, 5, 9,  18, 2, "published", managerNy.id); // 9h
  const emmaWed = await mkShift(harborView.id, "America/New_York", bartender.id, 2026, 5, 6, 9,  18, 2, "published", managerNy.id); // 9h
  const emmaThu = await mkShift(wharf.id,      "America/New_York", bartender.id, 2026, 5, 7, 9,  16, 2, "published", managerNy.id); // 7h = 35h
  const emmaFri = await mkShift(wharf.id,      "America/New_York", bartender.id, 2026, 5, 8, 18, 22, 2, "published", managerNy.id); // +4h = 39h

  // Lisa Thompson @ Wharf — 5 consecutive days (Mon–Fri)
  const lisaMon = await mkShift(wharf.id, "America/New_York", bartender.id, 2026, 5, 4, 10, 18, 2, "published", managerNy.id);
  const lisaTue = await mkShift(wharf.id, "America/New_York", bartender.id, 2026, 5, 5, 10, 18, 2, "published", managerNy.id);
  const lisaWed = await mkShift(wharf.id, "America/New_York", bartender.id, 2026, 5, 6, 10, 18, 2, "published", managerNy.id);
  const lisaThu = await mkShift(wharf.id, "America/New_York", bartender.id, 2026, 5, 7, 10, 18, 2, "published", managerNy.id);
  const lisaFri = await mkShift(wharf.id, "America/New_York", bartender.id, 2026, 5, 8, 17, 23, 2, "published", managerNy.id); // Fri PREMIUM

  // Carlos Rivera — pending swap
  const carlosFriShift = await mkShift(wharf.id, "America/New_York", server.id, 2026, 5, 8, 17, 23, 2, "published", managerNy.id);

  // Priya Patel — pending drop
  const priyaSatShift = await mkShift(pier.id, "America/Los_Angeles", lineCook.id, 2026, 5, 9, 10, 18, 2, "published", managerSf.id);

  // Alex Chen @ Pier
  const alexMon = await mkShift(pier.id, "America/Los_Angeles", bartender.id, 2026, 5, 4, 11, 19, 2, "published", managerSf.id);
  const alexFri = await mkShift(pier.id, "America/Los_Angeles", bartender.id, 2026, 5, 8, 17, 23, 2, "published", managerSf.id);
  const alexSat = await mkShift(pier.id, "America/Los_Angeles", bartender.id, 2026, 5, 9, 17, 23, 2, "published", managerSf.id);

  console.log("✓ Shifts (current + upcoming weeks)");

  // ── HISTORICAL 4 WEEKS (Apr 6 – May 3) ───────────────────────────────────
  // Enough data for fairness analytics. David Kim gets NO Saturday evening shifts.
  // Others get a mix. We'll batch-create for efficiency.

  const historicalShiftData: Parameters<typeof mkShift>[] = [];

  for (let w = 0; w < 4; w++) {
    const weekOffset = -(w + 1); // weeks back: -1, -2, -3, -4
    // Base Monday for week w (going back from May 4)
    const baseMon = addWeeks(new Date(2026, 4, 4), weekOffset); // May 4 - w weeks

    function wd(weekMon: Date, dayOffset: number) {
      const d = addDays(weekMon, dayOffset);
      return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
    }

    const mon = wd(baseMon, 0);
    const tue = wd(baseMon, 1);
    const wed = wd(baseMon, 2);
    const thu = wd(baseMon, 3);
    const fri = wd(baseMon, 4);
    const sat = wd(baseMon, 5);
    const sun = wd(baseMon, 6);

    // Pier weekday + weekend shifts
    historicalShiftData.push(
      [pier.id, "America/Los_Angeles", server.id, mon.y, mon.m, mon.d, 9, 17, 2, "published", managerSf.id],
      [pier.id, "America/Los_Angeles", server.id, wed.y, wed.m, wed.d, 9, 17, 2, "published", managerSf.id],
      [pier.id, "America/Los_Angeles", bartender.id, fri.y, fri.m, fri.d, 17, 23, 2, "published", managerSf.id, false], // Fri premium
      [pier.id, "America/Los_Angeles", bartender.id, sat.y, sat.m, sat.d, 17, 23, 2, "published", managerSf.id, false], // Sat premium
      // Sunset Grill
      [sunsetGrill.id, "America/Los_Angeles", server.id, tue.y, tue.m, tue.d, 10, 18, 2, "published", managerSf.id],
      [sunsetGrill.id, "America/Los_Angeles", host.id, sat.y, sat.m, sat.d, 17, 23, 2, "published", managerSf.id, false], // Sat premium
      // Harbor View
      [harborView.id, "America/New_York", server.id, mon.y, mon.m, mon.d, 9, 17, 2, "published", managerNy.id],
      [harborView.id, "America/New_York", bartender.id, fri.y, fri.m, fri.d, 17, 23, 2, "published", managerNy.id, false], // Fri premium
      [harborView.id, "America/New_York", bartender.id, sat.y, sat.m, sat.d, 17, 23, 2, "published", managerNy.id, false], // Sat premium
      // Wharf
      [wharf.id, "America/New_York", host.id, thu.y, thu.m, thu.d, 10, 18, 2, "published", managerNy.id],
      [wharf.id, "America/New_York", server.id, sat.y, sat.m, sat.d, 17, 23, 2, "published", managerNy.id, false], // Sat premium
    );
  }

  const historicalShifts: Awaited<ReturnType<typeof mkShift>>[] = [];
  for (const args of historicalShiftData) {
    historicalShifts.push(await mkShift(...args));
  }
  console.log(`✓ Historical shifts (${historicalShifts.length} total)`);

  // ── 14. Shift assignments ─────────────────────────────────────────────────
  const assignmentData: {
    shiftId: string;
    userId: string;
    assignedBy: string;
  }[] = [
    // Mike's current-week shifts (he manages his own hours to 36h)
    { shiftId: mikeMon.id, userId: mike.id, assignedBy: managerNy.id },
    { shiftId: mikeTue.id, userId: mike.id, assignedBy: managerNy.id },
    { shiftId: mikeWed.id, userId: mike.id, assignedBy: managerNy.id },
    { shiftId: mikeThu.id, userId: mike.id, assignedBy: managerNy.id },
    { shiftId: mikeFri.id, userId: mike.id, assignedBy: managerNy.id },

    // Emma's current-week shifts (39h)
    { shiftId: emmaMon.id, userId: emma.id, assignedBy: managerNy.id },
    { shiftId: emmaTue.id, userId: emma.id, assignedBy: managerNy.id },
    { shiftId: emmaWed.id, userId: emma.id, assignedBy: managerNy.id },
    { shiftId: emmaThu.id, userId: emma.id, assignedBy: managerNy.id },
    { shiftId: emmaFri.id, userId: emma.id, assignedBy: managerNy.id },

    // Lisa's consecutive days (Mon–Fri)
    { shiftId: lisaMon.id, userId: lisa.id, assignedBy: managerNy.id },
    { shiftId: lisaTue.id, userId: lisa.id, assignedBy: managerNy.id },
    { shiftId: lisaWed.id, userId: lisa.id, assignedBy: managerNy.id },
    { shiftId: lisaThu.id, userId: lisa.id, assignedBy: managerNy.id },
    { shiftId: lisaFri.id, userId: lisa.id, assignedBy: managerNy.id },

    // Carlos — assigned to the Fri shift (will have pending swap)
    { shiftId: carlosFriShift.id, userId: carlos.id, assignedBy: managerNy.id },

    // Priya — assigned to Sat shift at Pier (will have pending drop)
    { shiftId: priyaSatShift.id, userId: priya.id, assignedBy: managerSf.id },

    // Alex — current week
    { shiftId: alexMon.id, userId: alex.id, assignedBy: managerSf.id },
    { shiftId: alexFri.id, userId: alex.id, assignedBy: managerSf.id },
    { shiftId: alexSat.id, userId: alex.id, assignedBy: managerSf.id },

    // Upcoming week — partial assignment to show X/Y on cards
    { shiftId: pierMon.id, userId: alex.id, assignedBy: managerSf.id }, // 1/2 assigned
    { shiftId: pierTue.id, userId: alex.id, assignedBy: managerSf.id }, // 1/1
    { shiftId: pierWed.id, userId: james.id, assignedBy: managerSf.id }, // 1/1
    { shiftId: pierFriPremium.id, userId: alex.id, assignedBy: managerSf.id }, // 1/1
    { shiftId: sunsetMon.id, userId: maria.id, assignedBy: managerSf.id }, // 1/2
    { shiftId: sunsetFriPremium.id, userId: maria.id, assignedBy: managerSf.id }, // 1/2
    { shiftId: harborMon.id, userId: mike.id, assignedBy: managerNy.id }, // 1/2
    { shiftId: harborTue.id, userId: emma.id, assignedBy: managerNy.id }, // 1/1
    { shiftId: harborFriPremium.id, userId: mike.id, assignedBy: managerNy.id }, // 1/2 — needs 2nd staff
    { shiftId: harborSatPremium.id, userId: emma.id, assignedBy: managerNy.id }, // 1/2 — needs 2nd staff
    { shiftId: wharfMon.id, userId: carlos.id, assignedBy: managerNy.id }, // 1/1
    { shiftId: wharfTue.id, userId: lisa.id, assignedBy: managerNy.id }, // 1/2
    { shiftId: wharfFriPremium.id, userId: carlos.id, assignedBy: managerNy.id }, // 1/2
    { shiftId: wharfSatPremium.id, userId: lisa.id, assignedBy: managerNy.id }, // 1/1
  ];

  // Also assign David to a few upcoming premium shifts (but NOT Sat evening — for fairness demo)
  assignmentData.push(
    { shiftId: sunsetFriPremium.id, userId: david.id, assignedBy: managerSf.id }, // David gets Fri but not Sat
    { shiftId: harborMon.id, userId: david.id, assignedBy: managerNy.id },
  );

  // Historical assignments — fill them in for the premium shift fairness data
  // Sarah and Alex get most Sat premiums, David gets NONE
  for (let i = 0; i < historicalShifts.length; i++) {
    const shift = historicalShifts[i];
    if (!shift.isPremium) {
      // Assign regular historical shifts to relevant staff
      if (shift.locationId === pier.id) {
        assignmentData.push({ shiftId: shift.id, userId: alex.id, assignedBy: managerSf.id });
      } else if (shift.locationId === sunsetGrill.id) {
        assignmentData.push({ shiftId: shift.id, userId: maria.id, assignedBy: managerSf.id });
      } else if (shift.locationId === harborView.id) {
        assignmentData.push({ shiftId: shift.id, userId: mike.id, assignedBy: managerNy.id });
      } else if (shift.locationId === wharf.id) {
        assignmentData.push({ shiftId: shift.id, userId: carlos.id, assignedBy: managerNy.id });
      }
    } else {
      // Premium shifts — give to sarah/alex/emma/lisa but NOT david
      if (shift.locationId === pier.id) {
        assignmentData.push({ shiftId: shift.id, userId: sarah.id, assignedBy: managerSf.id });
      } else if (shift.locationId === sunsetGrill.id) {
        assignmentData.push({ shiftId: shift.id, userId: maria.id, assignedBy: managerSf.id });
      } else if (shift.locationId === harborView.id) {
        assignmentData.push({ shiftId: shift.id, userId: emma.id, assignedBy: managerNy.id });
      } else if (shift.locationId === wharf.id) {
        assignmentData.push({ shiftId: shift.id, userId: lisa.id, assignedBy: managerNy.id });
      }
    }
  }

  // Create all assignments sequentially with audit logs
  const assignments: Awaited<ReturnType<typeof prisma.shiftAssignment.create>>[] = [];
  for (const a of assignmentData) {
    const assignment = await prisma.shiftAssignment.create({
      data: { shiftId: a.shiftId, userId: a.userId, assignedBy: a.assignedBy, status: "active" },
    });
    assignments.push(assignment);
    await prisma.auditLog.create({
      data: {
        entityType: "assignment",
        entityId: assignment.id,
        action: "create",
        afterState: { shiftId: a.shiftId, userId: a.userId, status: "active" },
        performedBy: a.assignedBy,
      },
    });
  }
  console.log(`✓ Shift assignments (${assignments.length})`);

  // ── 15. Pending swap request — Carlos wants to swap his Fri shift ─────────
  // Find Carlos's assignment on the Fri Wharf shift
  const carlosAssignment = assignments.find(
    (a) => a.shiftId === carlosFriShift.id && a.userId === carlos.id
  )!;

  const swapRequest = await prisma.swapRequest.create({
    data: {
      shiftAssignmentId: carlosAssignment.id,
      requesterId: carlos.id,
      targetUserId: lisa.id, // Carlos wants to swap with Lisa
      type: "swap",
      status: "pending",
    },
  });

  // ── 16. Pending drop request — Priya dropping her Sat shift ──────────────
  const priyaAssignment = assignments.find(
    (a) => a.shiftId === priyaSatShift.id && a.userId === priya.id
  )!;

  const dropRequest = await prisma.swapRequest.create({
    data: {
      shiftAssignmentId: priyaAssignment.id,
      requesterId: priya.id,
      type: "drop",
      status: "pending",
    },
  });

  console.log("✓ Swap/drop requests");

  // ── 17. Baked-in constraint violation ─────────────────────────────────────
  // James Wilson: two historical shifts with only 8h rest (minimum is 10h).
  // Shift A ends at midnight, Shift B starts at 8am — only 8h gap. Allowed in
  // historical data but flagged in the per-shift audit trail as a rest violation.
  // Apr 15 4pm–midnight PT, then Apr 16 8am–4pm PT = only 8h rest (minimum is 10h)
  const violationShiftA = await mkShift(pier.id, "America/Los_Angeles", lineCook.id, 2026, 4, 15, 16, 0, 1, "published", managerSf.id, true);  // 4pm–midnight
  const violationShiftB = await mkShift(pier.id, "America/Los_Angeles", lineCook.id, 2026, 4, 16,  8, 16, 1, "published", managerSf.id, false); // 8am–4pm next day
  await prisma.shiftAssignment.createMany({
    data: [
      { shiftId: violationShiftA.id, userId: james.id, status: "active", assignedBy: managerSf.id },
      { shiftId: violationShiftB.id, userId: james.id, status: "active", assignedBy: managerSf.id },
    ],
  });
  await prisma.auditLog.create({ data: { entityType: "shift", entityId: violationShiftB.id, action: "constraint-violation-baked-in", afterState: { note: "8h rest gap — James Wilson assigned to back-to-back shifts with only 8h rest. Minimum is 10h." }, performedBy: managerSf.id } });
  console.log("✓ Baked-in constraint violation noted in historical data (8h rest gap for James)");

  // ── 18. Sample notifications ──────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: managerNy.id,
        type: "swap_request_pending",
        title: "Swap request needs approval",
        body: `Carlos Rivera wants to swap their Friday shift at The Wharf with Lisa Thompson. Review and approve or reject.`,
        read: false,
        metadata: { deepLink: "/manager/swaps", swapRequestId: swapRequest.id },
      },
      {
        userId: managerSf.id,
        type: "drop_request_pending",
        title: "Drop request needs approval",
        body: `Priya Patel has dropped their Saturday shift at The Pier. A qualified replacement has been notified.`,
        read: false,
        metadata: { deepLink: "/manager/swaps", swapRequestId: dropRequest.id },
      },
      {
        userId: lisa.id,
        type: "swap_requested",
        title: "Swap request from Carlos Rivera",
        body: `Carlos Rivera wants to swap their Friday evening shift at The Wharf with you. Review and accept or decline.`,
        read: false,
        metadata: { deepLink: "/staff/swaps", swapRequestId: swapRequest.id },
      },
      {
        userId: priya.id,
        type: "schedule_published",
        title: "Schedule published for May 11–17",
        body: "Your schedule for the week of May 11 has been published. Check your shifts.",
        read: true,
        metadata: { deepLink: "/staff", week: "2026-05-11" },
      },
      {
        userId: mike.id,
        type: "overtime_warning",
        title: "Approaching overtime this week",
        body: "You currently have 36 hours scheduled this week. Adding more shifts will require manager override.",
        read: false,
        metadata: { deepLink: "/staff" },
      },
    ],
  });
  console.log("✓ Sample notifications");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed complete!

Login credentials:
  Admin:          admin@coastaleats.com / Admin1234!
  Manager (SF):   manager.sf@coastaleats.com / Manager1234!
  Manager (NY):   manager.ny@coastaleats.com / Manager1234!
  Manager (All):  manager.cross@coastaleats.com / Manager1234!
  Staff (sample): alex.chen@coastaleats.com / Staff1234!
                  mike.brown@coastaleats.com / Staff1234!  ← 36h this week
                  emma.davis@coastaleats.com / Staff1234!  ← 39h this week
                  carlos.rivera@coastaleats.com / Staff1234!  ← pending swap
                  priya.patel@coastaleats.com / Staff1234!  ← pending drop
                  lisa.thompson@coastaleats.com / Staff1234!  ← 5 consec. days

Demo scenarios:
  Overtime warning:  assign any shift to Mike Brown (36h)
  Overtime block:    assign any shift to Emma Davis (39h)
  Consecutive days:  assign Sat shift to Lisa Thompson (5 days)
  Pending swap:      manager.ny → /manager/swaps
  Pending drop:      manager.sf → /manager/swaps
  Fairness:          David Kim has 0 Sat premium shifts last 4 weeks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
