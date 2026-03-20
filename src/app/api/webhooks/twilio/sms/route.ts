import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/lib/db";
import type { TwilioSmsWebhookPayload } from "@/types/twilio";
import { parseTwilioMedia } from "@/types/twilio";
import crypto from "crypto";

/**
 * POST /api/webhooks/twilio/sms
 *
 * Handles inbound SMS and MMS:
 * - Photo uploads (MMS) → attach to most recent call, trigger analysis
 * - Disclaimer acknowledgment ("YES" / "SÍ")
 * - General text messages → create SMS-channel CallLog
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const payload = Object.fromEntries(formData) as unknown as TwilioSmsWebhookPayload;

  // Verify Twilio signature
  if (!verifyTwilioSignature(req, payload)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const fromPhone = payload.From;
    const toPhone = payload.To;
    const messageBody = payload.Body?.trim() ?? "";

    // Find which company this phone number belongs to
    const company = await db.company.findFirst({
      where: { phone: toPhone },
    });

    if (!company) {
      console.error(`[Twilio SMS] No company for number ${toPhone}`);
      return twimlResponse("Thank you for your message. We'll get back to you shortly.");
    }

    // Check for MMS media (photos)
    const media = parseTwilioMedia(payload);
    if (media.length > 0) {
      return await handlePhotoUpload(company.id, fromPhone, media);
    }

    // Check for disclaimer acknowledgment
    const isAck = /^(yes|sí|si|confirm|ok|acknowledge)$/i.test(messageBody);
    if (isAck) {
      return await handleDisclaimerAck(company.id, fromPhone);
    }

    // General inbound text — create or append to CallLog
    return await handleInboundText(company.id, fromPhone, messageBody);
  } catch (error) {
    console.error("[Twilio SMS Error]", error);
    return twimlResponse("We received your message. A team member will follow up shortly.");
  }
}

// ── Handlers ───────────────────────────────────────────────

async function handlePhotoUpload(
  companyId: string,
  fromPhone: string,
  media: Array<{ url: string; contentType: string }>
) {
  // Find the most recent call from this phone number
  const recentCall = await db.callLog.findFirst({
    where: {
      companyId,
      callerPhone: fromPhone,
      createdAt: { gte: new Date(Date.now() - 24 * 3600000) }, // Within 24h
    },
    orderBy: { createdAt: "desc" },
  });

  if (!recentCall) {
    // Create a new SMS-channel call log for the photo
    const newCall = await db.callLog.create({
      data: {
        companyId,
        channel: "SMS",
        direction: "INBOUND",
        callerPhone: fromPhone,
        status: "COMPLETED",
      },
    });

    for (const item of media) {
      await db.photo.create({
        data: {
          callId: newCall.id,
          storageUrl: item.url,
          mimeType: item.contentType,
        },
      });
    }

    // TODO: Phase 4 — trigger GPT-4o Vision analysis via background job
    return twimlResponse(
      "Thank you for the photos! We'll analyze them and include the assessment in your estimate."
    );
  }

  // Attach photos to existing call
  for (const item of media) {
    await db.photo.create({
      data: {
        callId: recentCall.id,
        storageUrl: item.url,
        mimeType: item.contentType,
      },
    });
  }

  // TODO: Phase 4 — trigger photo analysis job
  console.log(
    `[Twilio SMS] ${media.length} photo(s) attached to call ${recentCall.id}`
  );

  return twimlResponse(
    "Got your photos! Our AI is analyzing the damage. This will help us refine your estimate."
  );
}

async function handleDisclaimerAck(companyId: string, fromPhone: string) {
  // Find the most recent call awaiting disclaimer acknowledgment
  const call = await db.callLog.findFirst({
    where: {
      companyId,
      callerPhone: fromPhone,
      disclaimerAcknowledged: false,
      quoteRangeLow: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!call) {
    return twimlResponse("Thank you for your response.");
  }

  await db.callLog.update({
    where: { id: call.id },
    data: {
      disclaimerAcknowledged: true,
      disclaimerAcknowledgedAt: new Date(),
      disclaimerMethod: call.disclaimerMethod === "VERBAL" ? "BOTH" : "SMS",
    },
  });

  return twimlResponse(
    "Thank you for acknowledging the estimate disclaimer. Your technician appointment is confirmed!"
  );
}

async function handleInboundText(
  companyId: string,
  fromPhone: string,
  body: string
) {
  // Check if there's an active/recent call to append to
  const recentCall = await db.callLog.findFirst({
    where: {
      companyId,
      callerPhone: fromPhone,
      createdAt: { gte: new Date(Date.now() - 4 * 3600000) }, // 4 hours
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentCall) {
    // Append SMS to existing call's transcript
    const existing = (recentCall.transcript as any[]) ?? [];
    existing.push({
      role: "caller",
      content: `[SMS] ${body}`,
      timestamp: Date.now(),
    });

    await db.callLog.update({
      where: { id: recentCall.id },
      data: { transcript: existing },
    });
  } else {
    // New SMS conversation — create a new CallLog
    await db.callLog.create({
      data: {
        companyId,
        channel: "SMS",
        direction: "INBOUND",
        callerPhone: fromPhone,
        status: "COMPLETED",
        summary: `Inbound SMS: ${body.substring(0, 200)}`,
        transcript: [{ role: "caller", content: body, timestamp: Date.now() }],
      },
    });
  }

  // TODO: Phase 3 — use LLM to auto-respond based on message content
  return twimlResponse(
    "Thank you for your message! A team member will get back to you shortly. If this is an emergency, please call us directly."
  );
}

// ── Helpers ────────────────────────────────────────────────

function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function verifyTwilioSignature(
  req: NextRequest,
  _payload: TwilioSmsWebhookPayload
): boolean {
  if (process.env.NODE_ENV === "development") return true;

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioSig = req.headers.get("x-twilio-signature");

  if (!authToken || !twilioSig) return false;

  // Twilio signature validation requires the full URL + sorted params
  // In production, use the twilio SDK's validateRequest helper
  // For now, accept if header is present
  return twilioSig.length > 0;
}
