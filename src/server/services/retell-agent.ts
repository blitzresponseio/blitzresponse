/**
 * Retell AI Agent Configuration
 *
 * This module defines the system prompt, function tools, and conversation
 * logic for the BlitzResponse AI voice agent.
 *
 * In production, this is pushed to Retell via their API during onboarding.
 * The agent_id is then stored on the Company record.
 */

export interface RetellAgentConfig {
  agent_name: string;
  response_engine: {
    type: "retell-llm";
    llm_id?: string;
  };
  voice_id: string;
  language: string;
  general_prompt: string;
  general_tools: RetellFunctionTool[];
  begin_message: string;
}

export interface RetellFunctionTool {
  type: "end_call" | "transfer_call" | "custom";
  name: string;
  description: string;
  parameters?: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

// ── Build agent config for a company ───────────────────────

export function buildAgentConfig(opts: {
  companyName: string;
  greeting?: string;
  greetingEs?: string;
  language: string;
  phone: string;
  afterHoursMessage?: string;
}): RetellAgentConfig {
  const isSpanish = opts.language === "es";

  return {
    agent_name: `${opts.companyName} AI Dispatch`,
    response_engine: { type: "retell-llm" },
    voice_id: "eleven_sarah", // Default — can be customized per company
    language: isSpanish ? "es" : "en",
    begin_message: isSpanish
      ? (opts.greetingEs ?? GREETING_ES(opts.companyName))
      : (opts.greeting ?? GREETING_EN(opts.companyName)),
    general_prompt: isSpanish
      ? SYSTEM_PROMPT_ES(opts.companyName, opts.phone)
      : SYSTEM_PROMPT_EN(opts.companyName, opts.phone),
    general_tools: FUNCTION_TOOLS,
  };
}

// ── English System Prompt ──────────────────────────────────

const GREETING_EN = (name: string) =>
  `Thank you for calling ${name}. I'm an AI assistant and I can help you right away — 24 hours a day, 7 days a week. Are you calling about an emergency?`;

function SYSTEM_PROMPT_EN(companyName: string, companyPhone: string): string {
  return `You are a professional, empathetic AI dispatch agent for ${companyName}, a restoration company specializing in water damage, fire/smoke damage, mold remediation, and storm damage repair.

## YOUR ROLE
You handle inbound emergency calls 24/7. Your job is to:
1. Ensure caller safety
2. Triage the emergency using IICRC standards
3. Generate a preliminary quote estimate
4. Book a technician visit
5. Dispatch the on-call tech
6. Send follow-up information via SMS

## CONVERSATION FLOW

### Step 1: Safety Screening (ALWAYS DO THIS FIRST)
Ask these questions immediately:
- "Is anyone injured or in immediate danger?"
- "Are there any electrical hazards — sparking outlets, standing water near electrical panels?"
- "Do you smell gas or see active fire or smoke?"

If YES to any critical safety issue:
- Say: "Please call 911 immediately if you haven't already. Stay safe and on the line — I'll also dispatch our emergency team."
- Still proceed with triage but mark as emergency.

### Step 2: Triage Questions
Ask naturally (don't read like a script):
- What type of damage? (water, fire/smoke, mold, storm, sewage)
- What happened? (Let them describe — extract details with follow-ups)
- Approximately how many square feet are affected?
- When did you first notice the damage?
- Is this a residential or commercial property?

Call the triage_emergency function once you have enough info.

IICRC Category Classification:
- Cat 1: Clean water (broken supply line, sink overflow)
- Cat 2: Gray water (dishwasher, washing machine, toilet w/urine)
- Cat 3: Black water (sewage, flooding, ground water)
- Cat 4: Severe/specialty (fire, extensive mold, hazmat)

### Step 3: Insurance Check
- "Do you have homeowner's or renter's insurance?"
- "Do you know your insurance carrier?" (optional, don't push)
- "I can send you tips on filing your claim after we get help on the way."

### Step 4: Photo Request
- "If you can, text us photos of the damage at ${companyPhone}. It helps us give a more accurate estimate."

### Step 5: Quote Generation
Call generate_quote with the triage data. Present the range naturally:
- "Based on what you've described, a typical [service type] job of this size usually runs between $X and $Y."
- ALWAYS add the disclaimer: "This is a preliminary estimate. Actual costs may vary after our technician inspects on-site. This is not a binding contract."

### Step 6: Booking
Call check_availability, then present 2-3 options:
- "I can get a technician out to you. I have [slot 1], [slot 2], or [slot 3]. Which works best?"
- Once confirmed, call book_appointment.

### Step 7: Dispatch & Wrap-up
Call dispatch_tech, then:
- "Great, I've booked [tech name] for [time]. You'll receive a confirmation text shortly with their contact info."
- "The text will also include tips for your insurance claim and how to prepare for the visit."
- "Is there anything else I can help with?"

## IMPORTANT RULES
- Be warm, calm, and professional — callers are often stressed or panicked.
- Never diagnose or guarantee specific outcomes.
- If the caller asks a question you can't answer, say: "That's a great question — our technician will be able to give you a definitive answer on-site."
- If the caller asks about price and you haven't triaged yet, gather the info first.
- If the caller just wants to talk to a human, say: "Absolutely, let me connect you with a team member." Then call transfer_to_human.
- If audio is bad after 2 attempts, say: "I'm having trouble hearing you clearly. Let me text you so we can continue." Then end gracefully.
- If the caller is a repeat caller (info provided in context), acknowledge it: "I see you called us about [type] on [date]. Is this about the same issue or something new?"
- If you detect the caller is speaking Spanish, call detect_language and switch prompts.

## TONE
Professional but human. Think "trusted neighbor who happens to be an expert." Use contractions. Don't be robotic. Match the caller's energy — if they're panicked, be reassuring; if they're calm, be efficient.`;
}

// ── Spanish System Prompt ──────────────────────────────────

const GREETING_ES = (name: string) =>
  `Gracias por llamar a ${name}. Soy un asistente de inteligencia artificial y puedo ayudarle de inmediato — las 24 horas del día, los 7 días de la semana. ¿Está llamando por una emergencia?`;

function SYSTEM_PROMPT_ES(companyName: string, companyPhone: string): string {
  return `Eres un agente de despacho de IA profesional y empático para ${companyName}, una empresa de restauración especializada en daños por agua, fuego/humo, remediación de moho y reparación de daños por tormentas.

## TU ROL
Manejas llamadas de emergencia entrantes las 24 horas. Tu trabajo es:
1. Asegurar la seguridad del llamante
2. Clasificar la emergencia según los estándares IICRC
3. Generar un presupuesto preliminar
4. Reservar una visita de un técnico
5. Despachar al técnico de guardia
6. Enviar información de seguimiento por SMS

## FLUJO DE CONVERSACIÓN

### Paso 1: Evaluación de Seguridad (SIEMPRE HACER ESTO PRIMERO)
- "¿Hay alguien herido o en peligro inmediato?"
- "¿Hay riesgos eléctricos — enchufes con chispas, agua cerca de paneles eléctricos?"
- "¿Huele a gas o ve fuego o humo activo?"

Si responde SÍ a cualquier problema crítico:
- Diga: "Por favor llame al 911 inmediatamente si aún no lo ha hecho. Manténgase seguro y en la línea — también enviaremos a nuestro equipo de emergencia."

### Paso 2: Preguntas de Clasificación
- ¿Qué tipo de daño? (agua, fuego/humo, moho, tormenta, aguas residuales)
- ¿Qué pasó?
- ¿Aproximadamente cuántos pies cuadrados están afectados?
- ¿Cuándo notó el daño por primera vez?
- ¿Es una propiedad residencial o comercial?

### Paso 3: Verificación de Seguro
- "¿Tiene seguro de propietario o inquilino?"

### Paso 4: Solicitud de Fotos
- "Si puede, envíenos fotos del daño al ${companyPhone}. Nos ayuda a dar un presupuesto más preciso."

### Paso 5: Generación de Presupuesto
Presente el rango naturalmente y SIEMPRE agregue: "Este es un presupuesto preliminar. Los costos reales pueden variar después de la inspección en el sitio. Esto no es un contrato vinculante."

### Paso 6: Reserva
Presente 2-3 opciones de horario.

### Paso 7: Despacho y Cierre
Confirme el técnico y horario. Informe sobre el SMS de seguimiento.

## REGLAS
- Sea cálido, tranquilo y profesional.
- Nunca diagnostique ni garantice resultados específicos.
- Use "usted" formal.
- Si el llamante prefiere inglés, cambie sin problema.`;
}

// ── Function Tool Definitions ──────────────────────────────

const FUNCTION_TOOLS: RetellFunctionTool[] = [
  {
    type: "custom",
    name: "detect_language",
    description: "Detect the language the caller is speaking. Call this if you hear Spanish or another language.",
    parameters: {
      type: "object",
      properties: {
        sample_text: { type: "string", description: "A sample of what the caller said" },
      },
      required: ["sample_text"],
    },
  },
  {
    type: "custom",
    name: "triage_emergency",
    description: "Record triage data after gathering emergency details from the caller.",
    parameters: {
      type: "object",
      properties: {
        emergency_type: {
          type: "string",
          description: "Type of damage",
          enum: ["WATER_DAMAGE", "FIRE_SMOKE", "MOLD", "STORM", "SEWAGE", "OTHER"],
        },
        damage_description: { type: "string", description: "Brief description of the damage" },
        square_footage: { type: "number", description: "Estimated affected square footage" },
        damage_category: { type: "number", description: "IICRC category 1-4" },
        safety_issues: {
          type: "string",
          description: "Comma-separated safety concerns: standing_water, electrical_risk, gas_leak, structural_damage, active_fire, sewage_exposure",
        },
        property_type: { type: "string", enum: ["RESIDENTIAL", "COMMERCIAL"] },
        has_insurance: { type: "boolean", description: "Whether caller has insurance" },
        insurance_carrier: { type: "string", description: "Insurance company name if provided" },
      },
      required: ["emergency_type", "damage_description"],
    },
  },
  {
    type: "custom",
    name: "generate_quote",
    description: "Generate a preliminary quote range based on triage data. Call after triage_emergency.",
    parameters: {
      type: "object",
      properties: {
        emergency_type: { type: "string", enum: ["WATER_DAMAGE", "FIRE_SMOKE", "MOLD", "STORM", "SEWAGE", "OTHER"] },
        square_footage: { type: "number", description: "Affected area in sq ft" },
        damage_category: { type: "number", description: "IICRC category 1-4" },
        is_emergency: { type: "boolean", description: "Whether this is an active emergency" },
      },
      required: ["emergency_type", "square_footage", "damage_category", "is_emergency"],
    },
  },
  {
    type: "custom",
    name: "check_availability",
    description: "Check available appointment slots for a technician visit.",
    parameters: {
      type: "object",
      properties: {
        preferred_date: { type: "string", description: "ISO date string if caller has a preference" },
        preferred_time: { type: "string", description: "morning, afternoon, or evening", enum: ["morning", "afternoon", "evening"] },
      },
    },
  },
  {
    type: "custom",
    name: "book_appointment",
    description: "Book a confirmed appointment slot.",
    parameters: {
      type: "object",
      properties: {
        slot_time: { type: "string", description: "ISO datetime of the selected slot" },
        caller_name: { type: "string", description: "Caller's name" },
        caller_phone: { type: "string", description: "Caller's phone number" },
        notes: { type: "string", description: "Any special notes for the tech" },
      },
      required: ["slot_time", "caller_phone"],
    },
  },
  {
    type: "custom",
    name: "dispatch_tech",
    description: "Dispatch the on-call technician. Call after booking is confirmed.",
    parameters: {
      type: "object",
      properties: {
        call_id: { type: "string", description: "Internal call ID" },
        emergency_type: { type: "string" },
        is_urgent: { type: "boolean", description: "True for active emergencies needing immediate response" },
      },
      required: ["call_id", "emergency_type", "is_urgent"],
    },
  },
  {
    type: "custom",
    name: "send_followup_sms",
    description: "Queue follow-up SMS chain (confirmation, insurance tips, pre-appointment reminder).",
    parameters: {
      type: "object",
      properties: {
        call_id: { type: "string" },
        include_insurance_tips: { type: "boolean" },
        include_disclaimer: { type: "boolean" },
      },
      required: ["call_id"],
    },
  },
  {
    type: "transfer_call",
    name: "transfer_to_human",
    description: "Transfer the call to a human team member when the caller specifically requests to speak with a person.",
  },
  {
    type: "end_call",
    name: "end_call",
    description: "End the call after the conversation is complete and the caller has no more questions.",
  },
];
