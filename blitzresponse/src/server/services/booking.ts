import { db } from "@/server/lib/db";

interface BookingSlot {
  start: string; // ISO datetime
  end: string;
  available: boolean;
}

interface BookingResult {
  confirmed: boolean;
  eventId: string | null;
  appointmentTime: string;
  techName: string | null;
}

/**
 * Check available appointment slots from Google Calendar.
 * Falls back to generated slots if Google Calendar is not connected.
 */
export async function checkAvailability(
  companyId: string,
  options?: { preferredDate?: string; preferredTime?: "morning" | "afternoon" | "evening" }
): Promise<BookingSlot[]> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { googleCalId: true, googleTokens: true, timezone: true },
  });

  if (company?.googleCalId && company?.googleTokens) {
    return await getGoogleCalendarSlots(company.googleCalId, company.googleTokens as any, company.timezone, options);
  }

  // Fallback: generate slots based on current time
  return generateDefaultSlots(company?.timezone ?? "America/New_York", options);
}

/**
 * Book an appointment — creates Google Calendar event or stores locally.
 */
export async function bookAppointment(
  companyId: string,
  callId: string,
  slotTime: string,
  callerName?: string,
  callerPhone?: string,
  notes?: string
): Promise<BookingResult> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { googleCalId: true, googleTokens: true, name: true, timezone: true },
  });

  let eventId: string | null = null;

  if (company?.googleCalId && company?.googleTokens) {
    eventId = await createGoogleCalendarEvent(
      company.googleCalId,
      company.googleTokens as any,
      {
        summary: `${company.name} — Site Visit: ${callerName ?? callerPhone ?? "Customer"}`,
        description: notes ?? "Restoration site inspection scheduled via BlitzResponse AI.",
        start: slotTime,
        durationMinutes: 60,
        timezone: company.timezone,
      }
    );
  } else {
    eventId = `local_${Date.now()}`;
  }

  const appointmentTime = new Date(slotTime);

  // Get assigned tech name
  const { getOnCallMember } = await import("@/server/services/on-call");
  const onCall = await getOnCallMember(companyId, {
    timezone: company?.timezone,
    asOf: appointmentTime,
  });
  const techName = onCall.current?.name ?? onCall.next?.name ?? null;

  // Update call record
  await db.callLog.update({
    where: { id: callId },
    data: {
      appointmentTime,
      googleEventId: eventId,
      callerName: callerName ?? undefined,
    },
  });

  return {
    confirmed: true,
    eventId,
    appointmentTime: appointmentTime.toISOString(),
    techName,
  };
}

// ── Google Calendar helpers ────────────────────────────────

async function getGoogleCalendarSlots(
  calendarId: string,
  tokens: { access_token: string; refresh_token: string },
  timezone: string,
  options?: { preferredDate?: string; preferredTime?: string }
): Promise<BookingSlot[]> {
  // TODO: implement real Google Calendar FreeBusy API call
  // For now, return generated slots
  return generateDefaultSlots(timezone, options);
}

async function createGoogleCalendarEvent(
  calendarId: string,
  tokens: { access_token: string; refresh_token: string },
  event: { summary: string; description: string; start: string; durationMinutes: number; timezone: string }
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log("[Booking] Google Calendar not configured — using local event ID");
    return `local_${Date.now()}`;
  }

  // TODO: implement real Google Calendar Events.insert API call
  // This requires token refresh logic and proper OAuth handling
  console.log(`[Booking] Would create Google Calendar event: ${event.summary} at ${event.start}`);
  return `gcal_${Date.now()}`;
}

function generateDefaultSlots(
  timezone: string,
  options?: { preferredDate?: string; preferredTime?: string }
): BookingSlot[] {
  const now = new Date();
  const slots: BookingSlot[] = [];

  // Generate slots for next 48 hours at business-appropriate times
  const times = [
    { hour: 9, label: "morning" },
    { hour: 13, label: "afternoon" },
    { hour: 16, label: "afternoon" },
  ];

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    for (const time of times) {
      const slotDate = new Date(now);
      slotDate.setDate(slotDate.getDate() + dayOffset);
      slotDate.setHours(time.hour, 0, 0, 0);

      // Skip past slots
      if (slotDate <= now) continue;

      const endDate = new Date(slotDate);
      endDate.setHours(endDate.getHours() + 1);

      slots.push({
        start: slotDate.toISOString(),
        end: endDate.toISOString(),
        available: true,
      });

      if (slots.length >= 3) return slots;
    }
  }

  return slots;
}
