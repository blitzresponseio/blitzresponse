/**
 * Twilio webhook payload types.
 * Ref: https://www.twilio.com/docs/messaging/guides/webhook-request
 */

export interface TwilioSmsWebhookPayload {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string; // "0", "1", etc. — string from form data
  // Media URLs (when NumMedia > 0)
  MediaUrl0?: string;
  MediaContentType0?: string;
  MediaUrl1?: string;
  MediaContentType1?: string;
  MediaUrl2?: string;
  MediaContentType2?: string;
  // Location data (if available)
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

export interface TwilioVoiceStatusCallback {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer"
    | "canceled";
  Direction: "inbound" | "outbound-api" | "outbound-dial";
  Duration?: string; // seconds, as string
  RecordingUrl?: string;
  RecordingSid?: string;
  Timestamp?: string;
  CallDuration?: string;
}

/**
 * Helper to parse MMS media from a Twilio webhook.
 */
export function parseTwilioMedia(
  payload: TwilioSmsWebhookPayload
): Array<{ url: string; contentType: string }> {
  const numMedia = parseInt(payload.NumMedia, 10);
  const media: Array<{ url: string; contentType: string }> = [];

  for (let i = 0; i < numMedia; i++) {
    const url = (payload as Record<string, string>)[`MediaUrl${i}`];
    const contentType =
      (payload as Record<string, string>)[`MediaContentType${i}`];
    if (url && contentType) {
      media.push({ url, contentType });
    }
  }

  return media;
}
