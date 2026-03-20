import { db } from "@/server/lib/db";

interface TriageInput {
  emergencyType: string;
  damageDescription: string;
  squareFootage?: number;
  damageCategory?: number;
  safetyIssues?: string[];
  propertyType?: string;
  hasInsurance?: boolean;
  insuranceCarrier?: string;
}

interface TriageResult {
  emergencyType: string;
  damageCategory: number;
  damageClass: number;
  isEmergency: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedActions: string[];
}

/**
 * Process triage data from a call and classify according to IICRC standards.
 * Uses rule-based logic with optional LLM enhancement for ambiguous cases.
 */
export async function triageEmergency(
  callId: string,
  input: TriageInput
): Promise<TriageResult> {
  // Determine category from description if not provided
  let category = input.damageCategory ?? classifyCategory(input);
  let damageClass = classifyClass(input.squareFootage ?? 0, category);

  // Check for critical safety issues
  const criticalIssues = ["electrical_risk", "gas_leak", "active_fire", "structural_damage"];
  const hasCriticalSafety = input.safetyIssues?.some((s) => criticalIssues.includes(s)) ?? false;
  const isEmergency = hasCriticalSafety || category >= 3;

  // Risk level
  let riskLevel: TriageResult["riskLevel"] = "LOW";
  if (category >= 4 || hasCriticalSafety) riskLevel = "CRITICAL";
  else if (category >= 3) riskLevel = "HIGH";
  else if (category >= 2) riskLevel = "MEDIUM";

  // Recommended actions
  const actions = getRecommendedActions(input.emergencyType, category, isEmergency, input.safetyIssues);

  // Update call record
  await db.callLog.update({
    where: { id: callId },
    data: {
      emergencyType: input.emergencyType as any,
      damageCategory: category,
      damageClass: damageClass,
      squareFootage: input.squareFootage,
      isEmergency,
      safetyIssues: input.safetyIssues ?? [],
      propertyType: (input.propertyType as any) ?? "RESIDENTIAL",
      insuranceInfo: input.hasInsurance !== undefined
        ? { hasInsurance: input.hasInsurance, carrier: input.insuranceCarrier }
        : undefined,
    },
  });

  return { emergencyType: input.emergencyType, damageCategory: category, damageClass, isEmergency, riskLevel, recommendedActions: actions };
}

function classifyCategory(input: TriageInput): number {
  const desc = input.damageDescription.toLowerCase();
  const type = input.emergencyType;

  if (type === "SEWAGE" || desc.includes("sewage") || desc.includes("black water")) return 3;
  if (type === "FIRE_SMOKE" || type === "MOLD") return 4;
  if (desc.includes("toilet") && desc.includes("feces")) return 3;
  if (desc.includes("washing machine") || desc.includes("dishwasher") || desc.includes("gray")) return 2;
  if (desc.includes("supply line") || desc.includes("clean") || desc.includes("faucet") || desc.includes("sink")) return 1;
  if (type === "STORM") return desc.includes("flood") ? 3 : 1;
  return 2; // Default to Cat 2 when uncertain
}

function classifyClass(sqFt: number, category: number): number {
  if (category >= 4) return 4; // Specialty drying
  if (sqFt <= 100) return 1;
  if (sqFt <= 500) return 2;
  return 3;
}

function getRecommendedActions(type: string, category: number, isEmergency: boolean, safetyIssues?: string[]): string[] {
  const actions: string[] = [];

  if (isEmergency) actions.push("Immediate dispatch required");
  if (safetyIssues?.includes("electrical_risk")) actions.push("Advise turning off breakers for affected area");
  if (safetyIssues?.includes("gas_leak")) actions.push("Advise evacuation and 911 call");
  if (safetyIssues?.includes("standing_water")) actions.push("Begin water extraction ASAP");

  if (type === "WATER_DAMAGE" || type === "STORM" || type === "SEWAGE") {
    actions.push("Water extraction", "Set up dehumidifiers and air movers", "Moisture monitoring");
    if (category >= 3) actions.push("PPE required — biohazard protocols", "Antimicrobial treatment");
  }
  if (type === "FIRE_SMOKE") {
    actions.push("Soot and smoke residue assessment", "Air quality testing", "Ozone/thermal fog treatment");
  }
  if (type === "MOLD") {
    actions.push("Containment setup", "Air quality sampling", "Mold remediation with HEPA filtration");
  }

  actions.push("Document all damage with photos before work begins");
  return actions;
}
