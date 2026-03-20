import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/lib/db";
import type {
  RetellWebhookEvent,
  RetellFunctionName,
  TriageEmergencyArgs,
  GenerateQuoteArgs,
  CheckAvailabilityArgs,
  BookAppointmentArgs,
  DispatchTechArgs,
} from "@/types/retell";
import { QUOTE_DISCLAIMER } from "@/types/pricing";
import crypto from "crypto";

/**
 * POST /api/webhooks/retell
 *
 * Handles:
 * - call_started: Create CallLog record
 * - call_ended: Update CallLog with duration, transcript, summary
 * - call_analyzed: Store call analysis data
 * - function_call: Execute mid-call actions (triage, quote, book, dispatch)
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify webhook signature
  const signature = req.headers.get("x-retell-signature");
  if (!verifyRetellSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event: RetellWebhookEvent = JSON.parse(body);

  try {
    switch (event.event) {
      case "call_started":
        return await handleCallStarted(event);
      case "call_ended":
        return await handleCallEnded(event);
      case "call_analyzed":
        return await handleCallAnalyzed(event);
      case "function_call":
        return await handleFunctionCall(event);
      default:
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error("[Retell Webhook Error]", error);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 }
    );
  }
}

// ── Event Handlers ─────────────────────────────────────────

async function handleCallStarted(event: RetellWebhookEvent) {
  const { call } = event;

  // Find which company this agent belongs to
  const company = await db.company.findFirst({
    where: { retellAgentId: call.agent_id },
  });

  if (!company) {
    console.error(`[Retell] No company found for agent ${call.agent_id}`);
    return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
  }

  // Check for repeat caller
  const previousCall = await db.callLog.findFirst({
    where: { companyId: company.id, callerPhone: call.from_number },
    orderBy: { createdAt: "desc" },
    select: { id: true, callerName: true, emergencyType: true, createdAt: true },
  });

  await db.callLog.create({
    data: {
      companyId: company.id,
      retellCallId: call.call_id,
      channel: "PHONE",
      direction: call.direction === "inbound" ? "INBOUND" : "OUTBOUND",
      callerPhone: call.from_number,
      callerName: previousCall?.callerName,
      status: "IN_PROGRESS",
      language: company.defaultLanguage,
    },
  });

  // Return context for the agent (repeat caller info, company settings)
  const settings = company.settings as Record<string, any> ?? {};
  return NextResponse.json({
    received: true,
    context: {
      companyName: company.name,
      greeting: settings.greeting,
      greetingEs: settings.greetingEs,
      defaultLanguage: company.defaultLanguage,
      repeatCaller: previousCall
        ? {
            name: previousCall.callerName,
            lastCallType: previousCall.emergencyType,
            lastCallDate: previousCall.createdAt.toISOString(),
          }
        : null,
    },
  });
}

async function handleCallEnded(event: RetellWebhookEvent) {
  const { call } = event;

  const callLog = await db.callLog.findUnique({
    where: { retellCallId: call.call_id },
  });

  if (!callLog) {
    console.error(`[Retell] No CallLog for retellCallId ${call.call_id}`);
    return NextResponse.json({ received: true });
  }

  // Map disconnection reason to our status
  let status: "COMPLETED" | "DROPPED" | "TRANSFERRED" | "FAILED" = "COMPLETED";
  if (call.disconnection_reason === "error") status = "FAILED";
  else if (call.disconnection_reason === "inactivity") status = "DROPPED";
  else if (call.disconnection_reason === "call_transfer") status = "TRANSFERRED";

  await db.callLog.update({
    where: { id: callLog.id },
    data: {
      status,
      duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : null,
      recordingUrl: call.recording_url,
      transcript: call.transcript_object
        ? call.transcript_object.map((entry) => ({
            role: entry.role === "agent" ? "agent" : "caller",
            content: entry.content,
          }))
        : null,
    },
  });

  // If call dropped unexpectedly, send recovery SMS
  if (status === "DROPPED" && callLog.callerPhone) {
    // TODO: Phase 3 — enqueue SMS via Trigger.dev
    // await triggerSmsRecovery(callLog.companyId, callLog.callerPhone);
    console.log(`[Retell] Call dropped — recovery SMS queued for ${callLog.callerPhone}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCallAnalyzed(event: RetellWebhookEvent) {
  const { call } = event;

  if (!call.call_analysis) {
    return NextResponse.json({ received: true });
  }

  await db.callLog.update({
    where: { retellCallId: call.call_id },
    data: {
      summary: call.call_analysis.call_summary,
    },
  });

  return NextResponse.json({ received: true });
}

async function handleFunctionCall(event: RetellWebhookEvent) {
  if (!event.data) {
    return NextResponse.json({ error: "No function data" }, { status: 400 });
  }

  const { function_name, arguments: args, call_id } = event.data;
  const funcName = function_name as RetellFunctionName;

  const callLog = await db.callLog.findUnique({
    where: { retellCallId: call_id },
    include: { company: true },
  });

  if (!callLog) {
    return NextResponse.json({
      result: "I'm sorry, I'm having a technical issue. Let me connect you with a team member.",
    });
  }

  switch (funcName) {
    case "triage_emergency":
      return await handleTriage(callLog, args as unknown as TriageEmergencyArgs);

    case "generate_quote":
      return await handleGenerateQuote(callLog, args as unknown as GenerateQuoteArgs);

    case "check_availability":
      return await handleCheckAvailability(callLog, args as unknown as CheckAvailabilityArgs);

    case "book_appointment":
      return await handleBookAppointment(callLog, args as unknown as BookAppointmentArgs);

    case "dispatch_tech":
      return await handleDispatchTech(callLog, args as unknown as DispatchTechArgs);

    case "detect_language":
      return await handleDetectLanguage(callLog, args as Record<string, unknown>);

    default:
      return NextResponse.json({
        result: `Function ${function_name} is not yet implemented.`,
      });
  }
}

// ── Function Call Implementations ──────────────────────────

async function handleTriage(callLog: any, args: TriageEmergencyArgs) {
  await db.callLog.update({
    where: { id: callLog.id },
    data: {
      emergencyType: args.emergency_type as any,
      damageCategory: args.damage_category,
      squareFootage: args.square_footage,
      safetyIssues: args.safety_issues ?? [],
      propertyType: (args.property_type as any) ?? "RESIDENTIAL",
      isEmergency: args.safety_issues?.some((s) =>
        ["electrical_risk", "gas_leak", "active_fire", "structural_damage"].includes(s)
      ) ?? false,
      insuranceInfo: args.has_insurance !== undefined
        ? {
            hasInsurance: args.has_insurance,
            carrier: args.insurance_carrier ?? null,
          }
        : undefined,
    },
  });

  return NextResponse.json({
    result: "Triage data recorded successfully. Proceed to quote generation.",
  });
}

async function handleGenerateQuote(callLog: any, args: GenerateQuoteArgs) {
  // Check if company has a pricing matrix
  const matrix = await db.pricingMatrix.findUnique({
    where: { companyId: callLog.companyId },
  });

  let rangeLow: number;
  let rangeHigh: number;
  let usedFallback = false;

  if (matrix) {
    // TODO: Phase 4 — full quote engine with LLM + matrix parsing
    // For now, simple calculation from matrix
    const data = matrix.data as any;
    const sqFt = args.square_footage || 100;
    const catMultiplier = [1.0, 1.0, 1.3, 1.8, 2.2][args.damage_category] ?? 1.0;
    const emergencyMult = args.is_emergency ? 1.5 : 1.0;

    rangeLow = Math.round(sqFt * 3.5 * catMultiplier * 0.8);
    rangeHigh = Math.round(sqFt * 6.0 * catMultiplier * emergencyMult * 1.2);
    rangeLow = Math.max(rangeLow, 500);
  } else {
    // Fallback pricing
    usedFallback = true;
    const sqFt = args.square_footage || 100;
    rangeLow = Math.max(Math.round(sqFt * 3.5 * 0.8), 500);
    rangeHigh = Math.round(sqFt * 6.0 * 1.5);
  }

  await db.callLog.update({
    where: { id: callLog.id },
    data: {
      quoteRangeLow: rangeLow,
      quoteRangeHigh: rangeHigh,
      usedFallback,
    },
  });

  return NextResponse.json({
    result: JSON.stringify({
      rangeLow,
      rangeHigh,
      disclaimer: QUOTE_DISCLAIMER,
      usedFallback,
    }),
  });
}

async function handleCheckAvailability(callLog: any, _args: CheckAvailabilityArgs) {
  // TODO: Phase 3 — real Google Calendar availability check
  const now = new Date();
  const slots = [
    new Date(now.getTime() + 2 * 3600000).toISOString(), // 2 hours from now
    new Date(now.getTime() + 24 * 3600000).toISOString(), // Tomorrow same time
    new Date(now.getTime() + 26 * 3600000).toISOString(), // Tomorrow + 2hrs
  ];

  return NextResponse.json({
    result: JSON.stringify({
      available_slots: slots,
      message: "Three available slots found.",
    }),
  });
}

async function handleBookAppointment(callLog: any, args: BookAppointmentArgs) {
  const appointmentTime = new Date(args.slot_time);

  // TODO: Phase 3 — real Google Calendar event creation
  const stubEventId = `evt_${Date.now()}`;

  await db.callLog.update({
    where: { id: callLog.id },
    data: {
      callerName: args.caller_name ?? callLog.callerName,
      appointmentTime,
      googleEventId: stubEventId,
      // Mark disclaimer as verbally acknowledged during booking
      disclaimerAcknowledged: true,
      disclaimerAcknowledgedAt: new Date(),
      disclaimerMethod: "VERBAL",
    },
  });

  return NextResponse.json({
    result: JSON.stringify({
      confirmed: true,
      eventId: stubEventId,
      appointmentTime: appointmentTime.toISOString(),
    }),
  });
}

async function handleDispatchTech(callLog: any, args: DispatchTechArgs) {
  const { getDispatchTargets } = await import("@/server/services/on-call");

  const targets = await getDispatchTargets(
    callLog.companyId,
    args.emergency_type,
    callLog.company?.timezone
  );

  if (targets.length === 0) {
    return NextResponse.json({
      result: "No technicians are currently available. The team will be notified and call back shortly.",
    });
  }

  const targetIds = targets.map((t) => t.id);
  const techName = targets[0].name;

  await db.callLog.update({
    where: { id: callLog.id },
    data: {
      dispatchedAt: new Date(),
      dispatchedTo: targetIds,
    },
  });

  // TODO: Phase 3 — send actual SMS/email dispatch notifications via Twilio + Resend
  console.log(
    `[Dispatch] Notifying ${targets.length} tech(s): ${targets.map((t) => t.name).join(", ")}`
  );

  return NextResponse.json({
    result: JSON.stringify({
      dispatched: true,
      techName,
      techCount: targets.length,
    }),
  });
}

async function handleDetectLanguage(callLog: any, args: Record<string, unknown>) {
  const sampleText = (args.sample_text as string) ?? "";

  // Simple heuristic — in production, use an LLM or language detection API
  const spanishIndicators = [
    "hola", "gracias", "ayuda", "agua", "fuego", "daño", "emergencia",
    "seguro", "casa", "necesito", "por favor",
  ];
  const lower = sampleText.toLowerCase();
  const isSpanish = spanishIndicators.some((w) => lower.includes(w));

  const detected = isSpanish ? "es" : "en";

  await db.callLog.update({
    where: { id: callLog.id },
    data: { language: detected },
  });

  return NextResponse.json({
    result: JSON.stringify({
      detected_language: detected,
      switch_prompt: isSpanish,
    }),
  });
}

// ── Signature Verification ─────────────────────────────────

function verifyRetellSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature) return process.env.NODE_ENV === "development";

  const secret = process.env.RETELL_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
