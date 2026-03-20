import { db } from "@/server/lib/db";
import { getDispatchTargets } from "@/server/services/on-call";
import { formatPhone } from "@/lib/utils";

interface DispatchResult {
  dispatched: boolean;
  targets: Array<{ name: string; phone: string }>;
  method: "sms" | "email" | "both";
}

/**
 * Dispatch notification to on-call technicians.
 * Sends SMS with job details + optional email.
 */
export async function dispatchTech(
  callId: string
): Promise<DispatchResult> {
  const call = await db.callLog.findUnique({
    where: { id: callId },
    include: { company: true },
  });

  if (!call) throw new Error(`Call not found: ${callId}`);

  const targets = await getDispatchTargets(
    call.companyId,
    call.emergencyType ?? undefined,
    call.company.timezone
  );

  if (targets.length === 0) {
    return { dispatched: false, targets: [], method: "sms" };
  }

  // Build dispatch message
  const message = buildDispatchSms(call, call.company.name);

  // Send SMS to each target
  for (const tech of targets) {
    await sendDispatchSms(tech.phone, message);
    if (tech.email) {
      await sendDispatchEmail(tech.email, call, call.company.name);
    }
  }

  // Update call record
  await db.callLog.update({
    where: { id: callId },
    data: {
      dispatchedAt: new Date(),
      dispatchedTo: targets.map((t) => t.id),
    },
  });

  return {
    dispatched: true,
    targets: targets.map((t) => ({ name: t.name, phone: t.phone })),
    method: targets.some((t) => t.email) ? "both" : "sms",
  };
}

function buildDispatchSms(call: any, companyName: string): string {
  const parts = [
    `🚨 ${companyName} DISPATCH`,
    "",
    `Type: ${(call.emergencyType ?? "Unknown").replace("_", " ")}`,
    `Caller: ${call.callerName ?? "Unknown"} ${formatPhone(call.callerPhone)}`,
  ];

  if (call.squareFootage) parts.push(`Area: ~${call.squareFootage} sq ft`);
  if (call.damageCategory) parts.push(`IICRC Cat: ${call.damageCategory}`);
  if (call.isEmergency) parts.push("⚠️ EMERGENCY — safety issues reported");

  if (call.safetyIssues?.length > 0) {
    parts.push(`Safety: ${call.safetyIssues.join(", ")}`);
  }

  if (call.appointmentTime) {
    parts.push(`Appt: ${new Date(call.appointmentTime).toLocaleString()}`);
  }

  if (call.quoteRangeLow && call.quoteRangeHigh) {
    parts.push(
      `Quote: $${Number(call.quoteRangeLow).toLocaleString()}–$${Number(call.quoteRangeHigh).toLocaleString()}`
    );
  }

  parts.push("", "Reply CONFIRM when en route.");

  return parts.join("\n");
}

async function sendDispatchSms(phone: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[Dispatch SMS] STUB → ${phone}:\n${message}`);
    return;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: phone,
        Body: message,
      }),
    });
  } catch (err) {
    console.error(`[Dispatch SMS] Failed to send to ${phone}:`, err);
  }
}

async function sendDispatchEmail(
  email: string,
  call: any,
  companyName: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "dispatch@blitzresponse.io";

  if (!apiKey) {
    console.log(`[Dispatch Email] STUB → ${email}`);
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `🚨 Dispatch: ${(call.emergencyType ?? "Emergency").replace("_", " ")} — ${call.callerName ?? call.callerPhone}`,
        text: buildDispatchSms(call, companyName),
      }),
    });
  } catch (err) {
    console.error(`[Dispatch Email] Failed to send to ${email}:`, err);
  }
}
