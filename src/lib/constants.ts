// ═══════════════════════════════════════════════════════════
// BlitzResponse — Application Constants
// ═══════════════════════════════════════════════════════════

// ── IICRC Water Damage Categories ──────────────────────────

export const IICRC_CATEGORIES = {
  1: {
    name: "Category 1 — Clean Water",
    description:
      "Water from a sanitary source: broken supply lines, tub/sink overflows with no contaminants, appliance malfunctions.",
    riskLevel: "LOW",
  },
  2: {
    name: "Category 2 — Gray Water",
    description:
      "Water with significant contamination that could cause illness: dishwasher/washing machine overflow, toilet overflow with urine (no feces), sump pump failures.",
    riskLevel: "MEDIUM",
  },
  3: {
    name: "Category 3 — Black Water",
    description:
      "Grossly contaminated water: sewage, flooding from rivers/streams, ground surface water intrusion, toilet overflow with feces.",
    riskLevel: "HIGH",
  },
  4: {
    name: "Category 4 — Special / Severe",
    description:
      "Fire/smoke damage, extensive mold contamination, asbestos or other hazmat situations requiring specialized remediation.",
    riskLevel: "CRITICAL",
  },
} as const;

// ── IICRC Water Damage Classes (Extent) ────────────────────

export const IICRC_CLASSES = {
  1: {
    name: "Class 1 — Minor",
    description: "Least amount of water absorption. Affects only part of a room.",
    typicalSqFt: "< 100 sq ft affected",
  },
  2: {
    name: "Class 2 — Significant",
    description:
      "Large amount of water, cushion, and subfloor affected. Water wicking up walls 12–24 inches.",
    typicalSqFt: "100–500 sq ft affected",
  },
  3: {
    name: "Class 3 — Extensive",
    description:
      "Greatest amount of water. Water from overhead, walls, insulation, carpet, subfloor saturated.",
    typicalSqFt: "500+ sq ft affected",
  },
  4: {
    name: "Class 4 — Specialty Drying",
    description:
      "Wet materials with low permeance: hardwood, plaster, concrete, crawlspaces. Requires specialty drying.",
    typicalSqFt: "Varies — material-dependent",
  },
} as const;

// ── Emergency Types ────────────────────────────────────────

export const EMERGENCY_TYPES = [
  { value: "WATER_DAMAGE", label: "Water Damage", color: "#3b82f6", icon: "droplets" },
  { value: "FIRE_SMOKE", label: "Fire / Smoke", color: "#ef4444", icon: "flame" },
  { value: "MOLD", label: "Mold Remediation", color: "#22c55e", icon: "bug" },
  { value: "STORM", label: "Storm Damage", color: "#8b5cf6", icon: "cloud-lightning" },
  { value: "SEWAGE", label: "Sewage Backup", color: "#f59e0b", icon: "alert-triangle" },
  { value: "OTHER", label: "Other", color: "#6b7280", icon: "help-circle" },
] as const;

// ── Subscription Tiers ─────────────────────────────────────

export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: "Starter",
    priceMonthly: 597,
    priceAnnualPerMonth: 497, // $5,964/yr = ~17% off
    setupFee: 297,
    callLimit: 100,
    phoneNumbers: 1,
    teamMembers: 3,
    features: [
      "AI voice answering 24/7",
      "Emergency triage & quoting",
      "Call log & transcripts",
      "Basic analytics dashboard",
      "SMS follow-up (1 template)",
      "Google Calendar booking",
    ],
  },
  PRO: {
    name: "Pro",
    priceMonthly: 997,
    priceAnnualPerMonth: 797, // $9,564/yr = ~20% off
    setupFee: 497,
    callLimit: 500,
    phoneNumbers: 2,
    teamMembers: 10,
    features: [
      "Everything in Starter",
      "Photo damage analysis",
      "Full SMS drip chains",
      "Advanced analytics & ROI tracking",
      "Custom voice scripts",
      "Priority support",
      "On-call scheduling",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceMonthly: 1497,
    priceAnnualPerMonth: 1197, // $14,364/yr = ~20% off
    setupFee: 997,
    callLimit: -1, // Unlimited
    phoneNumbers: 5,
    teamMembers: -1, // Unlimited
    features: [
      "Everything in Pro",
      "White-label branding",
      "Custom voice cloning",
      "API access",
      "Dedicated onboarding",
      "Multi-location support",
      "Custom integrations",
    ],
  },
} as const;

export const SETUP_FEE = 0; // Removed — included in first-month-free offer
export const OVERAGE_RATE_PER_CALL = 2.5;

// ── Business Defaults ──────────────────────────────────────

export const DEFAULT_AVG_JOB_VALUE = Number(
  process.env.DEFAULT_AVG_JOB_VALUE ?? "4500"
);

// ── Call Simulation (Dashboard Test Feature) ───────────────

export const SIMULATED_CALL_SCENARIOS = [
  {
    id: "water-burst-pipe",
    name: "Burst Pipe — Residential",
    emergencyType: "WATER_DAMAGE" as const,
    callerScript:
      "Hi, I've got water everywhere. A pipe burst under my kitchen sink about two hours ago. Probably 200 square feet of water on the floor. No one's hurt but there's water near an outlet.",
    expectedCategory: 1,
    expectedClass: 2,
  },
  {
    id: "fire-kitchen",
    name: "Kitchen Fire — Small",
    emergencyType: "FIRE_SMOKE" as const,
    callerScript:
      "We had a kitchen fire last night. The fire department put it out but there's smoke damage in the kitchen and living room, probably 400 square feet. Smoke smell is really bad.",
    expectedCategory: 4,
    expectedClass: 3,
  },
  {
    id: "mold-basement",
    name: "Mold Discovery — Basement",
    emergencyType: "MOLD" as const,
    callerScript:
      "I found mold growing behind the drywall in my basement. It's about a 10 by 10 area. It looks black and fuzzy. We've had some moisture problems down there for a while.",
    expectedCategory: 2,
    expectedClass: 1,
  },
  {
    id: "sewage-backup",
    name: "Sewage Backup — Emergency",
    emergencyType: "SEWAGE" as const,
    callerScript:
      "Our main sewer line just backed up into the basement. There's raw sewage everywhere, at least 300 square feet. It smells terrible and I'm worried about my kids.",
    expectedCategory: 3,
    expectedClass: 3,
  },
  {
    id: "storm-roof",
    name: "Storm Damage — Roof Leak",
    emergencyType: "STORM" as const,
    callerScript:
      "A tree branch went through our roof during the storm last night. There's water pouring in through the ceiling in two bedrooms. Probably 250 square feet affected. The power is flickering too.",
    expectedCategory: 1,
    expectedClass: 2,
  },
] as const;

// ── Supported Languages ────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
] as const;

// ── Safety Issues (used in triage) ─────────────────────────

export const SAFETY_ISSUES = [
  { id: "standing_water", label: "Standing water", severity: "medium" },
  { id: "electrical_risk", label: "Electrical hazard", severity: "high" },
  { id: "gas_leak", label: "Gas leak detected", severity: "critical" },
  { id: "structural_damage", label: "Structural instability", severity: "high" },
  { id: "active_fire", label: "Active fire/smoke", severity: "critical" },
  { id: "sewage_exposure", label: "Sewage/biohazard", severity: "high" },
  { id: "asbestos_risk", label: "Potential asbestos", severity: "high" },
  { id: "mold_visible", label: "Visible mold growth", severity: "medium" },
] as const;
