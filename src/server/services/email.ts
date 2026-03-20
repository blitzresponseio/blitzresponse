/**
 * Email service using Resend API.
 * Sends transactional emails for onboarding, billing, and operations.
 */

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "BlitzResponse <hello@blitzresponse.io>";

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ id: string } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Email] STUB → ${opts.to}: ${opts.subject}`);
    return null;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo ?? "support@blitzresponse.io",
      }),
    });

    if (!res.ok) {
      console.error(`[Email] Send failed (${res.status}):`, await res.text());
      return null;
    }

    return res.json();
  } catch (err) {
    console.error("[Email] Error:", err);
    return null;
  }
}

// ── Email Templates ────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://blitzresponse.io/logo.png" alt="BlitzResponse" style="height:48px;width:auto;" />
    </div>
    <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e4e4e7;">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;color:#a1a1aa;font-size:12px;">
      <p>BlitzResponse.io — AI Emergency Dispatch for Restoration Pros</p>
      <p>Questions? Reply to this email or reach us at support@blitzresponse.io</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Welcome email — sent after checkout is complete.
 */
export async function sendWelcomeEmail(opts: {
  to: string;
  companyName: string;
  plan: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `Welcome to BlitzResponse — let's get ${opts.companyName} live`,
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Welcome to BlitzResponse!</h2>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
        You're signed up for the <strong>${opts.plan}</strong> plan. Here's what happens next:
      </p>
      <ol style="color:#52525b;line-height:1.8;padding-left:20px;margin:0 0 24px;">
        <li><strong>Upload your pricing matrix</strong> — CSV or manual entry in your dashboard</li>
        <li><strong>Add your team</strong> — Names, phones, and on-call schedule</li>
        <li><strong>Connect Google Calendar</strong> — For appointment booking</li>
        <li><strong>We configure your AI agent</strong> — Usually within 2 hours of signup</li>
        <li><strong>Forward your business line</strong> — We'll send you the number to forward to</li>
      </ol>
      <p style="color:#52525b;line-height:1.6;margin:0 0 24px;">
        Most companies are <strong>fully live within 30 minutes</strong> of completing setup. The sooner you upload your pricing and team info, the sooner we can get your AI agent answering calls.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://blitzresponse.io/dashboard/onboarding" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Start Setup →</a>
      </div>
      <p style="color:#a1a1aa;font-size:13px;margin:16px 0 0;">
        Remember: You're covered by our 14-day money-back guarantee. If we don't capture a job for you, full refund — no questions asked.
      </p>
    `),
  });
}

/**
 * Agent live email — sent after provisioning is complete.
 */
export async function sendAgentLiveEmail(opts: {
  to: string;
  companyName: string;
  phoneNumber: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `🟢 Your AI agent is LIVE — ${opts.companyName}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Your AI dispatch agent is live!</h2>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
        Your dedicated BlitzResponse number is:
      </p>
      <div style="text-align:center;background:#eff6ff;border-radius:8px;padding:16px;margin:0 0 16px;">
        <p style="font-size:28px;font-weight:700;color:#1d4ed8;margin:0;">${opts.phoneNumber}</p>
      </div>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
        <strong>To start answering calls:</strong> Forward your existing business line to this number. On most carriers, dial <code>*72${opts.phoneNumber.replace(/\D/g, "")}</code> from your business phone.
      </p>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
        Or you can advertise this number directly on Google, your website, and business cards.
      </p>
      <p style="color:#52525b;line-height:1.6;margin:0 0 24px;">
        <strong>Test it now:</strong> Call the number from your cell phone. You'll hear your AI agent greet you by your company name, ask triage questions, generate a quote, and offer to book a tech.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://blitzresponse.io/dashboard" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View Your Dashboard →</a>
      </div>
    `),
  });
}

/**
 * Onboarding nudge — sent 24h after signup if they haven't completed setup.
 */
export async function sendOnboardingNudge(opts: {
  to: string;
  companyName: string;
  missingSteps: string[];
}): Promise<void> {
  const stepsList = opts.missingSteps.map((s) => `<li>${s}</li>`).join("");

  await sendEmail({
    to: opts.to,
    subject: `${opts.companyName} — finish setup to go live`,
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">You're almost there!</h2>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
        Just a few more steps and your AI agent will be answering calls for ${opts.companyName}:
      </p>
      <ul style="color:#52525b;line-height:1.8;padding-left:20px;margin:0 0 24px;">
        ${stepsList}
      </ul>
      <p style="color:#52525b;line-height:1.6;margin:0 0 24px;">
        Need help? Just reply to this email — we'll walk you through it.
      </p>
      <div style="text-align:center;">
        <a href="https://blitzresponse.io/dashboard/onboarding" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Complete Setup →</a>
      </div>
    `),
  });
}

/**
 * Guarantee reminder — sent at day 10 of the 14-day guarantee period.
 */
export async function sendGuaranteeReminder(opts: {
  to: string;
  companyName: string;
  jobsCaptured: number;
  estimatedValue: number;
}): Promise<void> {
  const hasJobs = opts.jobsCaptured > 0;

  await sendEmail({
    to: opts.to,
    subject: hasJobs
      ? `${opts.companyName} — ${opts.jobsCaptured} jobs captured so far!`
      : `${opts.companyName} — your guarantee period update`,
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">
        ${hasJobs ? `BlitzResponse has captured ${opts.jobsCaptured} job${opts.jobsCaptured > 1 ? "s" : ""} for you!` : "Your 14-day guarantee update"}
      </h2>
      ${hasJobs ? `
        <div style="background:#ecfdf5;border-radius:8px;padding:16px;margin:0 0 16px;text-align:center;">
          <p style="font-size:14px;color:#059669;margin:0 0 4px;">Estimated value captured</p>
          <p style="font-size:32px;font-weight:700;color:#047857;margin:0;">$${opts.estimatedValue.toLocaleString()}</p>
        </div>
        <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
          That's a ${Math.round(opts.estimatedValue / 597)}x return on your investment already. Your AI agent is working.
        </p>
      ` : `
        <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
          Your 14-day money-back guarantee ends in 4 days. If you haven't seen results yet, make sure your business line is forwarding to your BlitzResponse number.
        </p>
        <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
          If you'd like a refund, just reply to this email before the guarantee period ends. No questions asked.
        </p>
      `}
      <div style="text-align:center;margin:24px 0;">
        <a href="https://blitzresponse.io/dashboard/analytics" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View Your Dashboard →</a>
      </div>
    `),
  });
}

/**
 * Daily digest — sent to company owners each morning.
 */
export async function sendDailyDigest(opts: {
  to: string;
  companyName: string;
  callsYesterday: number;
  jobsCaptured: number;
  revenueEstimate: number;
  missedCalls: number;
}): Promise<void> {
  if (opts.callsYesterday === 0 && opts.missedCalls === 0) return; // Don't send empty digests

  await sendEmail({
    to: opts.to,
    subject: `${opts.companyName} — ${opts.callsYesterday} call${opts.callsYesterday !== 1 ? "s" : ""} yesterday`,
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Yesterday's Summary</h2>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:12px;text-align:center;background:#eff6ff;border-radius:8px 0 0 8px;">
            <p style="font-size:24px;font-weight:700;color:#1d4ed8;margin:0;">${opts.callsYesterday}</p>
            <p style="font-size:12px;color:#3b82f6;margin:4px 0 0;">Calls</p>
          </td>
          <td style="padding:12px;text-align:center;background:#ecfdf5;">
            <p style="font-size:24px;font-weight:700;color:#047857;margin:0;">${opts.jobsCaptured}</p>
            <p style="font-size:12px;color:#059669;margin:4px 0 0;">Jobs</p>
          </td>
          <td style="padding:12px;text-align:center;background:#ecfdf5;border-radius:0 8px 8px 0;">
            <p style="font-size:24px;font-weight:700;color:#047857;margin:0;">$${opts.revenueEstimate.toLocaleString()}</p>
            <p style="font-size:12px;color:#059669;margin:4px 0 0;">Est. value</p>
          </td>
        </tr>
      </table>
      ${opts.missedCalls > 0 ? `<p style="color:#dc2626;font-size:13px;margin:0 0 16px;">⚠️ ${opts.missedCalls} missed call${opts.missedCalls > 1 ? "s" : ""} yesterday. Check your dashboard for details.</p>` : ""}
      <div style="text-align:center;">
        <a href="https://blitzresponse.io/dashboard" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View Full Dashboard →</a>
      </div>
    `),
  });
}
