import { db } from "@/server/lib/db";
import type { TeamMember } from "@prisma/client";

interface OnCallResult {
  current: TeamMember | null;
  next: TeamMember | null;
  nextShiftStart: Date | null;
  isAfterHours: boolean;
}

/**
 * Determine the current on-call team member for a company.
 *
 * Logic:
 * 1. Find all active team members with isOnCall=true
 * 2. Filter by today's day-of-week matching their onCallDays
 * 3. Filter by current time within their onCallStart..onCallEnd window
 * 4. Sort by dispatchPriority (lowest first)
 * 5. Optionally filter by specialty matching the emergency type
 *
 * If no one is currently on-call, find the next scheduled member.
 */
export async function getOnCallMember(
  companyId: string,
  options?: {
    timezone?: string;
    emergencyType?: string;
    asOf?: Date;
  }
): Promise<OnCallResult> {
  const tz = options?.timezone ?? "America/New_York";
  const now = options?.asOf ?? new Date();

  // Get current day/time in company's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  });

  const currentTime = formatter.format(now); // "14:30"
  const currentDayStr = dayFormatter.format(now); // "Mon"
  const currentDay = dayStringToNumber(currentDayStr);

  // Fetch all active on-call members
  const members = await db.teamMember.findMany({
    where: {
      companyId,
      isActive: true,
      isOnCall: true,
    },
    orderBy: { dispatchPriority: "asc" },
  });

  if (members.length === 0) {
    return { current: null, next: null, nextShiftStart: null, isAfterHours: true };
  }

  // Filter: who is on-call RIGHT NOW?
  const currentOnCall = members.filter((m) => {
    if (!m.onCallDays.includes(currentDay)) return false;
    if (!m.onCallStart || !m.onCallEnd) return true; // No time restriction = always on
    return isTimeInRange(currentTime, m.onCallStart, m.onCallEnd);
  });

  // Optionally prefer members whose specialties match the emergency
  let bestMatch: TeamMember | null = null;
  if (currentOnCall.length > 0 && options?.emergencyType) {
    const specialtyKey = emergencyTypeToSpecialty(options.emergencyType);
    const specialistMatch = currentOnCall.find((m) =>
      m.specialties.includes(specialtyKey)
    );
    bestMatch = specialistMatch ?? currentOnCall[0];
  } else {
    bestMatch = currentOnCall[0] ?? null;
  }

  // Find next on-call if nobody is available now
  let nextMember: TeamMember | null = null;
  let nextShiftStart: Date | null = null;

  if (!bestMatch) {
    const result = findNextOnCall(members, currentDay, currentTime, now, tz);
    nextMember = result.member;
    nextShiftStart = result.shiftStart;
  }

  return {
    current: bestMatch,
    next: bestMatch ? null : nextMember,
    nextShiftStart: bestMatch ? null : nextShiftStart,
    isAfterHours: !bestMatch,
  };
}

/**
 * Look ahead through the next 7 days to find the soonest on-call shift.
 */
function findNextOnCall(
  members: TeamMember[],
  currentDay: number,
  currentTime: string,
  now: Date,
  _tz: string
): { member: TeamMember | null; shiftStart: Date | null } {
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDay = (currentDay + dayOffset) % 7;

    for (const member of members) {
      if (!member.onCallDays.includes(checkDay)) continue;

      const startTime = member.onCallStart ?? "00:00";

      // If same day, only consider future start times
      if (dayOffset === 0 && startTime <= currentTime) continue;

      // Calculate the actual date/time of this shift
      const shiftDate = new Date(now);
      shiftDate.setDate(shiftDate.getDate() + dayOffset);
      const [hours, minutes] = startTime.split(":").map(Number);
      shiftDate.setHours(hours, minutes, 0, 0);

      return { member, shiftStart: shiftDate };
    }
  }

  return { member: null, shiftStart: null };
}

/**
 * Check if a time string "HH:MM" falls within a start..end range.
 * Handles overnight shifts (e.g., "22:00" to "06:00").
 */
function isTimeInRange(
  time: string,
  start: string,
  end: string
): boolean {
  if (start <= end) {
    // Normal range: 08:00 → 20:00
    return time >= start && time < end;
  } else {
    // Overnight: 22:00 → 06:00
    return time >= start || time < end;
  }
}

function dayStringToNumber(day: string): number {
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[day] ?? 0;
}

function emergencyTypeToSpecialty(type: string): string {
  const map: Record<string, string> = {
    WATER_DAMAGE: "water",
    FIRE_SMOKE: "fire",
    MOLD: "mold",
    STORM: "water",
    SEWAGE: "water",
    OTHER: "general",
  };
  return map[type] ?? "general";
}

/**
 * Get all members who should be notified for a dispatch.
 * Returns primary on-call + any backup members marked for the same shift.
 */
export async function getDispatchTargets(
  companyId: string,
  emergencyType?: string,
  timezone?: string
): Promise<TeamMember[]> {
  const { current, next, isAfterHours } = await getOnCallMember(companyId, {
    timezone,
    emergencyType,
  });

  // For true emergencies with no one on-call, fall back to ALL active members
  if (!current && !next) {
    return db.teamMember.findMany({
      where: { companyId, isActive: true },
      orderBy: { dispatchPriority: "asc" },
    });
  }

  const targets: TeamMember[] = [];
  if (current) targets.push(current);
  if (isAfterHours && next) targets.push(next);

  return targets;
}
