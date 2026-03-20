/**
 * Twilio API client for phone number provisioning.
 */

function getAuth() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return {
    sid,
    header: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
  };
}

/**
 * Search for available local phone numbers in a given area code.
 */
export async function searchAvailableNumbers(
  areaCode?: string,
  country: string = "US",
  limit: number = 5
): Promise<Array<{ phoneNumber: string; friendlyName: string; locality: string; region: string }>> {
  const { sid, header } = getAuth();
  const params = new URLSearchParams({ PageSize: String(limit) });
  if (areaCode) params.set("AreaCode", areaCode);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/AvailablePhoneNumbers/${country}/Local.json?${params}`,
    { headers: { Authorization: header } }
  );

  if (!res.ok) throw new Error(`Twilio search failed: ${res.status}`);
  const data = await res.json();

  return (data.available_phone_numbers ?? []).map((n: any) => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
    locality: n.locality,
    region: n.region,
  }));
}

/**
 * Purchase a phone number and configure webhooks.
 */
export async function purchasePhoneNumber(
  phoneNumber: string,
  webhookBaseUrl: string
): Promise<{ sid: string; phoneNumber: string }> {
  const { sid, header } = getAuth();

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json`,
    {
      method: "POST",
      headers: {
        Authorization: header,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        PhoneNumber: phoneNumber,
        VoiceUrl: `${webhookBaseUrl}/api/webhooks/twilio/voice`,
        VoiceMethod: "POST",
        SmsUrl: `${webhookBaseUrl}/api/webhooks/twilio/sms`,
        SmsMethod: "POST",
        StatusCallback: `${webhookBaseUrl}/api/webhooks/twilio/voice`,
        StatusCallbackMethod: "POST",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio purchase failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    sid: data.sid,
    phoneNumber: data.phone_number,
  };
}

/**
 * Release (delete) a phone number.
 */
export async function releasePhoneNumber(numberSid: string): Promise<void> {
  const { sid, header } = getAuth();
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers/${numberSid}.json`,
    {
      method: "DELETE",
      headers: { Authorization: header },
    }
  );

  if (!res.ok) throw new Error(`Twilio release failed: ${res.status}`);
}

/**
 * Send an SMS message.
 */
export async function sendSms(
  to: string,
  body: string,
  from?: string
): Promise<{ sid: string }> {
  const { sid, header } = getAuth();
  const fromNumber = from ?? process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) throw new Error("No from number");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: header,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: fromNumber, To: to, Body: body }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio SMS failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { sid: data.sid };
}
