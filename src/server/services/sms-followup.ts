import { db } from "@/server/lib/db";
import { QUOTE_DISCLAIMER } from "@/types/pricing";

/**
 * Queue and send SMS follow-up chain after a call.
 * In production, delayed messages use Trigger.dev scheduled tasks.
 * For MVP, immediate messages are sent synchronously.
 */
export async function sendFollowUpChain(callId: string): Promise<void> {
  const call = await db.callLog.findUnique({
    where: { id: callId },
    include: {
      company: {
        include: {
          smsTemplates: { where: { isActive: true } },
          teamMembers: true,
        },
      },
    },
  });

  if (!call || !call.callerPhone) return;

  const isSpanish = call.language === "es";
  const templates = call.company.smsTemplates;
  const techName = call.dispatchedTo.length > 0
    ? call.company.teamMembers.find((t) => t.id === call.dispatchedTo[0])?.name ?? "Your technician"
    : "Your technician";

  const vars: Record<string, string> = {
    "{{callerName}}": call.callerName ?? "there",
    "{{companyName}}": call.company.name,
    "{{quoteRange}}": call.quoteRangeLow && call.quoteRangeHigh
      ? `$${Number(call.quoteRangeLow).toLocaleString()}–$${Number(call.quoteRangeHigh).toLocaleString()}`
      : "pending",
    "{{techName}}": techName,
    "{{appointmentTime}}": call.appointmentTime
      ? new Date(call.appointmentTime).toLocaleString()
      : "TBD",
    "{{companyPhone}}": call.company.phone ?? "",
    "{{reviewLink}}": `https://blitzresponse.io/review/${call.company.slug}`,
  };

  // 1. Immediate: post-call confirmation
  const postCallTemplate = templates.find((t) => t.trigger === "POST_CALL_IMMEDIATE");
  if (postCallTemplate) {
    const body = interpolate(isSpanish && postCallTemplate.bodyEs ? postCallTemplate.bodyEs : postCallTemplate.body, vars);
    await sendSms(call.callerPhone, body);
  }

  // 2. Immediate: disclaimer acknowledgment request
  const disclaimerTemplate = templates.find((t) => t.trigger === "QUOTE_DISCLAIMER");
  if (disclaimerTemplate && call.quoteRangeLow && !call.disclaimerAcknowledged) {
    const body = interpolate(
      isSpanish && disclaimerTemplate.bodyEs ? disclaimerTemplate.bodyEs : disclaimerTemplate.body,
      vars
    );
    // Small delay to not overwhelm
    setTimeout(() => sendSms(call.callerPhone, body), 60_000);
  }

  // 3. Delayed: insurance tips (30 min)
  const insuranceTemplate = templates.find((t) => t.trigger === "INSURANCE_TIPS");
  if (insuranceTemplate) {
    const body = interpolate(
      isSpanish && insuranceTemplate.bodyEs ? insuranceTemplate.bodyEs : insuranceTemplate.body,
      vars
    );
    // In production: Trigger.dev scheduled task
    // await triggerdev.sendDelayed("sms-insurance-tips", { phone: call.callerPhone, body }, { delay: "30m" });
    console.log(`[SMS Chain] Insurance tips queued for ${call.callerPhone} in 30min`);
  }

  // 4. Pre-appointment reminder (1hr before)
  if (call.appointmentTime) {
    const preTemplate = templates.find((t) => t.trigger === "PRE_APPOINTMENT");
    if (preTemplate) {
      const body = interpolate(
        isSpanish && preTemplate.bodyEs ? preTemplate.bodyEs : preTemplate.body,
        vars
      );
      // In production: schedule based on appointmentTime - 1hr
      console.log(`[SMS Chain] Pre-appointment reminder queued for ${call.callerPhone}`);
    }
  }

  // 5. Post-service review (24hr after appointment)
  const reviewTemplate = templates.find((t) => t.trigger === "POST_SERVICE_REVIEW");
  if (reviewTemplate && call.appointmentTime) {
    console.log(`[SMS Chain] Review request queued for ${call.callerPhone} in 24hr`);
  }
}

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log(`[SMS] STUB → ${to}: ${body.substring(0, 80)}...`);
    return;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[SMS] Send failed (${res.status}):`, err);
    }
  } catch (err) {
    console.error(`[SMS] Send error:`, err);
  }
}
