import { prisma } from "./prisma";
import {
  getAvailabilityInUtc,
  getDayBounds,
  getWeekBounds,
  toZoned,
} from "./timezone";
import { addHours, differenceInMinutes, startOfDay } from "date-fns";
import { format } from "date-fns-tz";

export type ConstraintSeverity = "block" | "override" | "warning";

export interface ConstraintViolation {
  rule: string;
  message: string;
  severity: ConstraintSeverity;
}

export interface AlternativeStaff {
  userId: string;
  name: string;
  skills: string[];
  weeklyHours: number;
  homeLocation: string;
}

export interface ConstraintResult {
  violations: ConstraintViolation[];
  alternatives?: AlternativeStaff[];
}

// ───── Individual checks ─────────────────────────────────────────────────────

export async function checkDoubleBooking(
  userId: string,
  startUtc: Date,
  endUtc: Date,
  excludeShiftId?: string
): Promise<ConstraintViolation | null> {
  const overlapping = await prisma.shiftAssignment.findFirst({
    where: {
      userId,
      status: "active",
      shift: {
        id: excludeShiftId ? { not: excludeShiftId } : undefined,
        AND: [{ startUtc: { lt: endUtc } }, { endUtc: { gt: startUtc } }],
      },
    },
    include: { shift: { include: { location: true } } },
  });

  if (!overlapping) return null;

  return {
    rule: "no_double_booking",
    message: `This staff member is already assigned to a shift at ${overlapping.shift.location.name} that overlaps with this time.`,
    severity: "block",
  };
}

export async function checkRestPeriod(
  userId: string,
  startUtc: Date,
  endUtc: Date,
  excludeShiftId?: string
): Promise<ConstraintViolation | null> {
  const tooClose = await prisma.shiftAssignment.findFirst({
    where: {
      userId,
      status: "active",
      shift: {
        id: excludeShiftId ? { not: excludeShiftId } : undefined,
        OR: [
          // Shift ending within 10h before new shift starts
          {
            endUtc: {
              gt: addHours(startUtc, -10),
              lt: startUtc,
            },
          },
          // Shift starting within 10h after new shift ends
          {
            startUtc: {
              gt: endUtc,
              lt: addHours(endUtc, 10),
            },
          },
        ],
      },
    },
    include: { shift: true },
  });

  if (!tooClose) return null;

  const shift = tooClose.shift;
  const gapHours =
    shift.endUtc < startUtc
      ? Math.round(differenceInMinutes(startUtc, shift.endUtc) / 60 * 10) / 10
      : Math.round(differenceInMinutes(shift.startUtc, endUtc) / 60 * 10) / 10;

  return {
    rule: "rest_period",
    message: `Only ${gapHours}h rest between shifts — minimum is 10h.`,
    severity: "block",
  };
}

export async function checkSkillMatch(
  userId: string,
  requiredSkillId: string
): Promise<ConstraintViolation | null> {
  const skill = await prisma.userSkill.findUnique({
    where: { userId_skillId: { userId, skillId: requiredSkillId } },
    include: { skill: true },
  });

  if (skill) return null;

  const requiredSkill = await prisma.skill.findUnique({
    where: { id: requiredSkillId },
  });

  return {
    rule: "skill_match",
    message: `Staff does not have the required skill: ${requiredSkill?.name ?? requiredSkillId}.`,
    severity: "block",
  };
}

export async function checkLocationCertification(
  userId: string,
  locationId: string
): Promise<ConstraintViolation | null> {
  const cert = await prisma.locationCertification.findUnique({
    where: { userId_locationId: { userId, locationId } },
    include: { location: true },
  });

  if (!cert) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    return {
      rule: "location_certification",
      message: `Staff is not certified to work at ${location?.name ?? locationId}.`,
      severity: "block",
    };
  }

  if (cert.revokedAt) {
    return {
      rule: "location_certification_revoked",
      message: `Staff's certification to work at ${cert.location.name} was revoked on ${cert.revokedAt.toLocaleDateString()}.`,
      severity: "block",
    };
  }

  return null;
}

export async function checkAvailability(
  userId: string,
  locationId: string,
  startUtc: Date,
  endUtc: Date
): Promise<ConstraintViolation | null> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { homeTimezone: true },
  });

  const homeTimezone = user.homeTimezone;
  const shiftDate = startUtc;

  // Check for full-day unavailability exception
  const dateStr = format(toZoned(shiftDate, homeTimezone), "yyyy-MM-dd", {
    timeZone: homeTimezone,
  });

  const fullDayException = await prisma.availabilityException.findFirst({
    where: { userId, date: dateStr, isUnavailable: true },
  });

  if (fullDayException) {
    return {
      rule: "availability",
      message: `Staff has marked themselves unavailable on ${dateStr}.`,
      severity: "block",
    };
  }

  // Check partial exceptions (additional availability windows)
  const partialException = await prisma.availabilityException.findFirst({
    where: { userId, date: dateStr, isUnavailable: false },
  });

  if (partialException && partialException.startTime && partialException.endTime) {
    const exceptionWindow = getAvailabilityInUtc(
      {
        dayOfWeek: new Date(dateStr).getDay(),
        startTime: partialException.startTime,
        endTime: partialException.endTime,
      },
      homeTimezone,
      shiftDate
    );

    if (startUtc >= exceptionWindow.startUtc && endUtc <= exceptionWindow.endUtc) {
      return null; // covered by exception
    }
  }

  // Check recurring availability
  const dayOfWeek = toZoned(startUtc, homeTimezone).getDay();
  const windows = await prisma.availabilityWindow.findMany({
    where: { userId, dayOfWeek },
  });

  if (windows.length === 0) {
    return {
      rule: "availability",
      message: `Staff has no availability set for this day of the week.`,
      severity: "block",
    };
  }

  // Check if shift fits within any availability window
  for (const window of windows) {
    const { startUtc: winStart, endUtc: winEnd } = getAvailabilityInUtc(
      window,
      homeTimezone,
      shiftDate
    );

    if (startUtc >= winStart && endUtc <= winEnd) {
      return null; // fits within this window
    }
  }

  return {
    rule: "availability",
    message: `Shift time falls outside staff's available hours for this day.`,
    severity: "block",
  };
}

export async function checkDailyHours(
  userId: string,
  shiftDate: Date,
  locationTimezone: string,
  additionalHours: number,
  excludeShiftId?: string
): Promise<ConstraintViolation | null> {
  const { start, end } = getDayBounds(shiftDate, locationTimezone);

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      userId,
      status: "active",
      shift: {
        id: excludeShiftId ? { not: excludeShiftId } : undefined,
        startUtc: { gte: start, lt: end },
      },
    },
    include: { shift: true },
  });

  const existingHours = assignments.reduce((sum, a) => {
    const hours =
      differenceInMinutes(a.shift.endUtc, a.shift.startUtc) / 60;
    return sum + hours;
  }, 0);

  const total = existingHours + additionalHours;

  if (total > 12) {
    return {
      rule: "daily_12h_cap",
      message: `Assigning this shift would bring total daily hours to ${total.toFixed(1)}h — maximum is 12h.`,
      severity: "block",
    };
  }

  if (total > 8) {
    return {
      rule: "daily_8h_warning",
      message: `Total daily hours would be ${total.toFixed(1)}h — over the 8h guideline.`,
      severity: "warning",
    };
  }

  return null;
}

export async function checkWeeklyHours(
  userId: string,
  shiftDate: Date,
  userTimezone: string,
  additionalHours: number,
  excludeShiftId?: string
): Promise<ConstraintViolation | null> {
  const { start, end } = getWeekBounds(shiftDate, userTimezone);

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      userId,
      status: "active",
      shift: {
        id: excludeShiftId ? { not: excludeShiftId } : undefined,
        startUtc: { gte: start, lte: end },
      },
    },
    include: { shift: true },
  });

  const existingHours = assignments.reduce((sum, a) => {
    return sum + differenceInMinutes(a.shift.endUtc, a.shift.startUtc) / 60;
  }, 0);

  const total = existingHours + additionalHours;

  if (total > 40) {
    return {
      rule: "weekly_40h_cap",
      message: `Assigning this shift would bring weekly hours to ${total.toFixed(1)}h — maximum is 40h (requires manager override with reason).`,
      severity: "override",
    };
  }

  if (total >= 35) {
    return {
      rule: "weekly_35h_warning",
      message: `Weekly hours would reach ${total.toFixed(1)}h — approaching the 40h limit.`,
      severity: "warning",
    };
  }

  return null;
}

export async function checkConsecutiveDays(
  userId: string,
  shiftDate: Date,
  userTimezone: string,
  excludeShiftId?: string
): Promise<ConstraintViolation | null> {
  // Check up to 6 days before the target date
  let consecutiveBefore = 0;
  for (let i = 1; i <= 6; i++) {
    const checkDate = new Date(shiftDate);
    checkDate.setUTCDate(checkDate.getUTCDate() - i);
    const { start, end } = getDayBounds(checkDate, userTimezone);

    const assignment = await prisma.shiftAssignment.findFirst({
      where: {
        userId,
        status: "active",
        shift: {
          id: excludeShiftId ? { not: excludeShiftId } : undefined,
          startUtc: { gte: start, lt: end },
        },
      },
    });

    if (assignment) {
      consecutiveBefore++;
    } else {
      break;
    }
  }

  const totalConsecutive = consecutiveBefore + 1; // +1 for the new shift's day

  if (totalConsecutive >= 7) {
    return {
      rule: "consecutive_7th_day",
      message: `This would be day ${totalConsecutive} in a row — 7th consecutive day requires manager override.`,
      severity: "override",
    };
  }

  if (totalConsecutive === 6) {
    return {
      rule: "consecutive_6th_day",
      message: `This would be the 6th consecutive working day.`,
      severity: "warning",
    };
  }

  return null;
}

export async function checkHeadcountAvailable(
  shiftId: string
): Promise<ConstraintViolation | null> {
  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId },
    include: {
      assignments: { where: { status: "active" } },
    },
  });

  if (shift.assignments.length >= shift.headcount) {
    return {
      rule: "headcount_cap",
      message: `This shift already has ${shift.assignments.length}/${shift.headcount} staff assigned.`,
      severity: "block",
    };
  }

  return null;
}

// ───── Run all constraints ────────────────────────────────────────────────────

export async function runAllConstraints(
  userId: string,
  shiftId: string,
  excludeShiftIdForRest?: string
): Promise<ConstraintResult> {
  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId },
    include: { location: true },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { homeTimezone: true },
  });

  const shiftHours =
    differenceInMinutes(shift.endUtc, shift.startUtc) / 60;

  const checks = await Promise.all([
    checkHeadcountAvailable(shiftId),
    checkDoubleBooking(userId, shift.startUtc, shift.endUtc, excludeShiftIdForRest),
    checkRestPeriod(userId, shift.startUtc, shift.endUtc, excludeShiftIdForRest),
    checkSkillMatch(userId, shift.requiredSkillId),
    checkLocationCertification(userId, shift.locationId),
    checkAvailability(userId, shift.locationId, shift.startUtc, shift.endUtc),
    checkDailyHours(userId, shift.startUtc, shift.location.timezone, shiftHours, excludeShiftIdForRest),
    checkWeeklyHours(userId, shift.startUtc, user.homeTimezone, shiftHours, excludeShiftIdForRest),
    checkConsecutiveDays(userId, shift.startUtc, user.homeTimezone, excludeShiftIdForRest),
  ]);

  const violations = checks.filter(Boolean) as ConstraintViolation[];

  const hasBlocks = violations.some((v) => v.severity === "block");
  const alternatives = hasBlocks
    ? await suggestAlternatives(shiftId, userId)
    : undefined;

  return { violations, alternatives };
}

// ───── Alternative suggestions ────────────────────────────────────────────────

export async function suggestAlternatives(
  shiftId: string,
  failedUserId: string
): Promise<AlternativeStaff[]> {
  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId },
    include: { location: true },
  });

  // Find staff with the right skill + active cert at this location (not the failed user)
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: failedUserId },
      role: "staff",
      isActive: true,
      skills: { some: { skillId: shift.requiredSkillId } },
      locationCertifications: {
        some: { locationId: shift.locationId, revokedAt: null },
      },
    },
    include: {
      skills: { include: { skill: true } },
      shiftAssignments: {
        where: {
          status: "active",
          shift: {
            startUtc: {
              gte: getWeekBoundsSync(shift.startUtc, shift.location.timezone).start,
              lte: getWeekBoundsSync(shift.startUtc, shift.location.timezone).end,
            },
          },
        },
        include: { shift: true },
      },
      locationCertifications: {
        where: { revokedAt: null },
        include: { location: true },
        take: 1,
      },
    },
    take: 10,
  });

  const results: AlternativeStaff[] = [];

  for (const candidate of candidates) {
    const result = await runAllConstraints(candidate.id, shiftId);
    const hasBlock = result.violations.some((v) => v.severity === "block");
    if (!hasBlock) {
      const weeklyHours = candidate.shiftAssignments.reduce((sum, a) => {
        return sum + differenceInMinutes(a.shift.endUtc, a.shift.startUtc) / 60;
      }, 0);

      results.push({
        userId: candidate.id,
        name: candidate.name,
        skills: candidate.skills.map((s) => s.skill.name),
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        homeLocation: candidate.locationCertifications[0]?.location.name ?? "—",
      });

      if (results.length >= 3) break;
    }
  }

  return results;
}

// Synchronous version for use in queries (avoids circular async)
function getWeekBoundsSync(date: Date, timezone: string) {
  const { toZonedTime: toZoned2, fromZonedTime: fromZoned2 } = require("date-fns-tz");
  const { addDays: add, startOfDay: sod, endOfDay: eod } = require("date-fns");
  const zoned = toZoned2(date, timezone);
  const dayOfWeek = zoned.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayZoned = add(sod(zoned), -daysFromMonday);
  const sundayZoned = add(mondayZoned, 6);
  return {
    start: fromZoned2(mondayZoned, timezone),
    end: fromZoned2(eod(sundayZoned), timezone),
  };
}
