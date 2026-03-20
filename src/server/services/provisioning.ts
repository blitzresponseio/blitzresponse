import { db } from "@/server/lib/db";
import { createRetellAgent, updateRetellAgent, registerPhoneWithRetell, createTestCall } from "@/server/lib/retell";
import { searchAvailableNumbers, purchasePhoneNumber } from "@/server/lib/twilio";
import { buildAgentConfig } from "@/server/services/retell-agent";

export interface ProvisionResult {
  success: boolean;
  agentId: string | null;
  phoneNumber: string | null;
  twilioSid: string | null;
  error: string | null;
}

/**
 * Full provisioning pipeline for a new customer.
 *
 * Steps:
 * 1. Build the agent config from company data
 * 2. Create Retell agent with system prompt + function tools
 * 3. Search for available Twilio number in preferred area code
 * 4. Purchase the Twilio number
 * 5. Register the number with Retell (connects inbound calls to agent)
 * 6. Update company record with agent ID + phone
 * 7. Return result
 *
 * If any step fails, previous steps are logged but not rolled back
 * (you'll clean up manually from the admin panel).
 */
export async function provisionCompany(
  companyId: string,
  options?: {
    areaCode?: string;
    voiceId?: string;
    language?: string;
  }
): Promise<ProvisionResult> {
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) return { success: false, agentId: null, phoneNumber: null, twilioSid: null, error: "Company not found" };

  const settings = (company.settings ?? {}) as Record<string, any>;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://blitzresponse.io";

  try {
    // Step 1: Build agent config
    const agentConfig = buildAgentConfig({
      companyName: company.name,
      greeting: settings.greeting,
      greetingEs: settings.greetingEs,
      language: options?.language ?? company.defaultLanguage,
      phone: company.phone ?? "",
      afterHoursMessage: settings.afterHoursMessage,
    });

    // Step 2: Create Retell agent
    console.log(`[Provision] Creating Retell agent for ${company.name}...`);
    const agent = await createRetellAgent({
      agent_name: agentConfig.agent_name,
      voice_id: options?.voiceId ?? agentConfig.voice_id,
      language: agentConfig.language,
      general_prompt: agentConfig.general_prompt,
      begin_message: agentConfig.begin_message,
      general_tools: agentConfig.general_tools as any,
      webhook_url: `${appUrl}/api/webhooks/retell`,
      max_call_duration_ms: (settings.maxCallDuration ?? 600) * 1000,
    });
    console.log(`[Provision] Agent created: ${agent.agent_id}`);

    // Step 3: Find available number
    console.log(`[Provision] Searching for phone number (area code: ${options?.areaCode ?? "any"})...`);
    const available = await searchAvailableNumbers(options?.areaCode);
    if (available.length === 0) {
      // Update agent ID even without phone
      await db.company.update({
        where: { id: companyId },
        data: { retellAgentId: agent.agent_id },
      });
      return { success: false, agentId: agent.agent_id, phoneNumber: null, twilioSid: null, error: "No phone numbers available in that area code" };
    }

    // Step 4: Purchase number
    const chosenNumber = available[0];
    console.log(`[Provision] Purchasing ${chosenNumber.phoneNumber}...`);
    const purchased = await purchasePhoneNumber(chosenNumber.phoneNumber, appUrl);

    // Step 5: Register with Retell
    console.log(`[Provision] Registering ${purchased.phoneNumber} with Retell agent...`);
    await registerPhoneWithRetell(purchased.phoneNumber, agent.agent_id);

    // Step 6: Update company record
    await db.company.update({
      where: { id: companyId },
      data: {
        retellAgentId: agent.agent_id,
        phone: purchased.phoneNumber,
        twilioSid: purchased.sid,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        companyId,
        action: "admin.provisioned",
        metadata: {
          agentId: agent.agent_id,
          phone: purchased.phoneNumber,
          twilioSid: purchased.sid,
          areaCode: options?.areaCode,
        },
      },
    });

    console.log(`[Provision] ✅ ${company.name} fully provisioned: ${purchased.phoneNumber}`);

    // Send agent-live email to company owner
    try {
      const owner = await db.user.findFirst({
        where: { companyId, role: "OWNER" },
        select: { email: true },
      });
      if (owner) {
        const { sendAgentLiveEmail } = await import("@/server/services/email");
        await sendAgentLiveEmail({
          to: owner.email,
          companyName: company.name,
          phoneNumber: purchased.phoneNumber,
        });
      }
    } catch (emailErr) {
      console.error("[Provision] Agent-live email failed:", emailErr);
    }

    return {
      success: true,
      agentId: agent.agent_id,
      phoneNumber: purchased.phoneNumber,
      twilioSid: purchased.sid,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Provision] ❌ Failed for ${company.name}:`, message);
    return { success: false, agentId: null, phoneNumber: null, twilioSid: null, error: message };
  }
}

/**
 * Update an existing customer's agent prompt (e.g., after they change their greeting).
 */
export async function updateCompanyAgent(companyId: string): Promise<void> {
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company?.retellAgentId) throw new Error("Company has no agent");

  const settings = (company.settings ?? {}) as Record<string, any>;
  const agentConfig = buildAgentConfig({
    companyName: company.name,
    greeting: settings.greeting,
    greetingEs: settings.greetingEs,
    language: company.defaultLanguage,
    phone: company.phone ?? "",
    afterHoursMessage: settings.afterHoursMessage,
  });

  await updateRetellAgent(company.retellAgentId, {
    agent_name: agentConfig.agent_name,
    general_prompt: agentConfig.general_prompt,
    begin_message: agentConfig.begin_message,
  });

  console.log(`[Provision] Agent updated for ${company.name}`);
}

/**
 * Start a browser-based test call against a company's agent.
 */
export async function startTestCall(companyId: string): Promise<{ callId: string; webCallLink: string }> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { retellAgentId: true, name: true },
  });

  if (!company?.retellAgentId) throw new Error("Company has no agent configured");

  const result = await createTestCall(company.retellAgentId);

  // Create a test call log
  await db.callLog.create({
    data: {
      companyId,
      channel: "PHONE",
      direction: "INBOUND",
      callerPhone: "+10000000000",
      callerName: "Test Call",
      status: "IN_PROGRESS",
      isTestCall: true,
      retellCallId: result.call_id,
    },
  });

  return { callId: result.call_id, webCallLink: result.web_call_link };
}
