/**
 * Retell AI API client for agent provisioning.
 * Docs: https://docs.retellai.com/api-references
 */

const RETELL_BASE = "https://api.retellai.com";

function getHeaders() {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error("RETELL_API_KEY not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

// ── Agent Management ───────────────────────────────────────

export interface RetellAgentCreateInput {
  agent_name: string;
  voice_id?: string;
  language?: string;
  general_prompt: string;
  begin_message: string;
  general_tools?: Array<Record<string, unknown>>;
  webhook_url?: string;
  max_call_duration_ms?: number;
}

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  language: string;
  created_at: number;
}

/**
 * Create a new Retell agent for a customer.
 */
export async function createRetellAgent(
  input: RetellAgentCreateInput
): Promise<RetellAgent> {
  const res = await fetch(`${RETELL_BASE}/create-agent`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      agent_name: input.agent_name,
      voice_id: input.voice_id ?? "eleven_sarah",
      language: input.language ?? "en",
      response_engine: {
        type: "retell-llm",
        llm_id: undefined, // Uses default
      },
      general_prompt: input.general_prompt,
      begin_message: input.begin_message,
      general_tools: input.general_tools ?? [],
      webhook_url: input.webhook_url ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`,
      max_call_duration_ms: input.max_call_duration_ms ?? 600000, // 10 min
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell create-agent failed (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Update an existing agent's prompt or configuration.
 */
export async function updateRetellAgent(
  agentId: string,
  updates: Partial<RetellAgentCreateInput>
): Promise<RetellAgent> {
  const res = await fetch(`${RETELL_BASE}/update-agent/${agentId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell update-agent failed (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Get agent details.
 */
export async function getRetellAgent(agentId: string): Promise<RetellAgent> {
  const res = await fetch(`${RETELL_BASE}/get-agent/${agentId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error(`Retell get-agent failed: ${res.status}`);
  return res.json();
}

/**
 * List all agents on the account.
 */
export async function listRetellAgents(): Promise<RetellAgent[]> {
  const res = await fetch(`${RETELL_BASE}/list-agents`, {
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error(`Retell list-agents failed: ${res.status}`);
  return res.json();
}

/**
 * Delete an agent.
 */
export async function deleteRetellAgent(agentId: string): Promise<void> {
  const res = await fetch(`${RETELL_BASE}/delete-agent/${agentId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error(`Retell delete-agent failed: ${res.status}`);
}

// ── Phone Number Management ────────────────────────────────

/**
 * Register a Twilio number with Retell so it routes calls to an agent.
 */
export async function registerPhoneWithRetell(
  phoneNumber: string,
  agentId: string
): Promise<{ phone_number: string; phone_number_id: string }> {
  const res = await fetch(`${RETELL_BASE}/create-phone-number`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      phone_number: phoneNumber,
      agent_id: agentId,
      // Retell imports existing Twilio numbers
      inbound_agent_id: agentId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell register phone failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ── Test Call ──────────────────────────────────────────────

/**
 * Trigger a test call from Retell (web-based, no real phone needed).
 */
export async function createTestCall(
  agentId: string
): Promise<{ call_id: string; web_call_link: string }> {
  const res = await fetch(`${RETELL_BASE}/v2/create-web-call`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      agent_id: agentId,
      metadata: { test: "true" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell create-web-call failed (${res.status}): ${err}`);
  }

  return res.json();
}
