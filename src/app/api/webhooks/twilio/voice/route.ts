import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/lib/db";
import type { TwilioVoiceStatusCallback } from "@/types/twilio";

/**
 * POST /api/webhooks/twilio/voice
 * Handles Twilio voice call status callbacks (ringing, in-progress, completed, etc.)
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const payload = Object.fromEntries(formData) as unknown as TwilioVoiceStatusCallback;

  try {
    const callSid = payload.CallSid;
    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    // Find existing call log by Twilio SID
    const callLog = await db.callLog.findFirst({
      where: { twilioCallSid: callSid },
    });

    const statusMap: Record<string, string> = {
      completed: "COMPLETED",
      busy: "MISSED",
      failed: "FAILED",
      "no-answer": "MISSED",
      canceled: "MISSED",
    };

    const mappedStatus = statusMap[payload.CallStatus];

    if (callLog && mappedStatus) {
      await db.callLog.update({
        where: { id: callLog.id },
        data: {
          status: mappedStatus as any,
          duration: payload.Duration ? parseInt(payload.Duration, 10) : undefined,
          recordingUrl: payload.RecordingUrl || undefined,
        },
      });
    } else if (!callLog && payload.Direction === "inbound") {
      // Retell may not have created a record yet — find by company phone
      const company = await db.company.findFirst({
        where: { phone: payload.To },
      });

      if (company && mappedStatus === "MISSED") {
        // Create a missed call record
        await db.callLog.create({
          data: {
            companyId: company.id,
            twilioCallSid: callSid,
            channel: "PHONE",
            direction: "INBOUND",
            callerPhone: payload.From,
            status: "MISSED",
            duration: 0,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Twilio Voice Webhook Error]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
