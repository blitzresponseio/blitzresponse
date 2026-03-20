/**
 * Retell AI webhook event types.
 * Ref: https://docs.retellai.com/api-references/webhooks
 */

export interface RetellWebhookEvent {
  event: "call_started" | "call_ended" | "call_analyzed" | "function_call";
  call: RetellCallData;
  data?: RetellFunctionCallData;
}

export interface RetellCallData {
  call_id: string;
  agent_id: string;
  call_type: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  direction: "inbound" | "outbound";
  status: "registered" | "ongoing" | "ended" | "error";
  start_timestamp: number; // Unix ms
  end_timestamp?: number;
  duration_ms?: number;
  disconnection_reason?:
    | "user_hangup"
    | "agent_hangup"
    | "call_transfer"
    | "inactivity"
    | "machine_detected"
    | "max_duration_reached"
    | "error";
  transcript?: string;
  transcript_object?: RetellTranscriptEntry[];
  recording_url?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: "positive" | "negative" | "neutral";
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
  metadata?: Record<string, string>;
}

export interface RetellTranscriptEntry {
  role: "agent" | "user";
  content: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export interface RetellFunctionCallData {
  function_name: string;
  arguments: Record<string, unknown>;
  call_id: string;
}

/**
 * Function definitions registered with Retell agent.
 * These are the mid-call actions the AI can invoke.
 */
export type RetellFunctionName =
  | "triage_emergency"
  | "generate_quote"
  | "check_availability"
  | "book_appointment"
  | "dispatch_tech"
  | "send_followup_sms"
  | "transfer_to_human"
  | "detect_language"
  | "lookup_caller";

export interface TriageEmergencyArgs {
  emergency_type: "WATER_DAMAGE" | "FIRE_SMOKE" | "MOLD" | "STORM" | "SEWAGE" | "OTHER";
  damage_description: string;
  square_footage?: number;
  damage_category?: number;
  safety_issues?: string[];
  property_type?: "RESIDENTIAL" | "COMMERCIAL";
  has_insurance?: boolean;
  insurance_carrier?: string;
}

export interface GenerateQuoteArgs {
  emergency_type: string;
  square_footage: number;
  damage_category: number;
  is_emergency: boolean;
  severity_score?: number;
}

export interface CheckAvailabilityArgs {
  preferred_date?: string; // ISO date
  preferred_time?: "morning" | "afternoon" | "evening";
}

export interface BookAppointmentArgs {
  slot_time: string; // ISO datetime
  caller_name?: string;
  caller_phone: string;
  notes?: string;
}

export interface DispatchTechArgs {
  call_id: string;
  emergency_type: string;
  is_urgent: boolean;
}

export interface DetectLanguageArgs {
  sample_text: string;
}
