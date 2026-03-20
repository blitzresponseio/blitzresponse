import { z } from "zod";

// ── Unit types that appear in Xactimate-style pricing ──────

export const PricingUnitSchema = z.enum([
  "SQ_FT",       // Per square foot
  "LN_FT",       // Per linear foot
  "EACH",        // Per item/unit
  "HOUR",        // Per labor hour
  "DAY",         // Per day (equipment rental)
  "FLAT",        // Flat rate
]);
export type PricingUnit = z.infer<typeof PricingUnitSchema>;

// ── Single line item in a pricing category ─────────────────

export const LineItemSchema = z.object({
  id: z.string().cuid2().or(z.string().min(1)),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  unit: PricingUnitSchema,
  unitPrice: z.number().nonnegative(),       // Base price per unit
  minimumCharge: z.number().nonnegative().default(0),
  // Multipliers for severity / category adjustments
  multipliers: z.object({
    cat1: z.number().positive().default(1.0),  // IICRC Cat 1 (clean water)
    cat2: z.number().positive().default(1.3),  // Cat 2 (gray water)
    cat3: z.number().positive().default(1.8),  // Cat 3 (black water / sewage)
    cat4: z.number().positive().default(2.2),  // Cat 4 (not standard — fire/mold severe)
  }).default({
    cat1: 1.0,
    cat2: 1.3,
    cat3: 1.8,
    cat4: 2.2,
  }),
  // Emergency / after-hours surcharge multiplier
  emergencyMultiplier: z.number().positive().default(1.5),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type LineItem = z.infer<typeof LineItemSchema>;

// ── Category grouping (Water Extraction, Structural Drying, etc.) ──

export const PricingCategorySchema = z.object({
  id: z.string().cuid2().or(z.string().min(1)),
  name: z.string().min(1).max(100),
  emergencyType: z.enum([
    "WATER_DAMAGE",
    "FIRE_SMOKE",
    "MOLD",
    "STORM",
    "SEWAGE",
    "GENERAL",
  ]),
  lineItems: z.array(LineItemSchema).min(1),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type PricingCategory = z.infer<typeof PricingCategorySchema>;

// ── Top-level matrix shape stored in PricingMatrix.data ────

export const PricingMatrixDataSchema = z.object({
  version: z.literal(1),
  currency: z.string().length(3).default("USD"),
  taxRate: z.number().nonnegative().max(1).default(0), // 0.08 = 8%
  categories: z.array(PricingCategorySchema).min(1),
  notes: z.string().max(1000).optional(),
  lastUpdatedBy: z.string().optional(),
});
export type PricingMatrixData = z.infer<typeof PricingMatrixDataSchema>;

// ── Fallback pricing (used when company hasn't uploaded a matrix) ──

export const FallbackPricingSchema = z.record(
  z.string(),
  z.object({
    perSqFt: z.number().nonnegative(),
    minimum: z.number().nonnegative(),
  })
);
export type FallbackPricing = z.infer<typeof FallbackPricingSchema>;

// ── Quote generation input / output types ──────────────────

export const QuoteRequestSchema = z.object({
  emergencyType: z.enum([
    "WATER_DAMAGE",
    "FIRE_SMOKE",
    "MOLD",
    "STORM",
    "SEWAGE",
    "OTHER",
  ]),
  squareFootage: z.number().positive(),
  damageCategory: z.number().int().min(1).max(4),  // IICRC category
  damageClass: z.number().int().min(1).max(4).optional(), // IICRC class
  isEmergency: z.boolean().default(false),
  isAfterHours: z.boolean().default(false),
  severityScore: z.number().int().min(1).max(10).optional(), // From photo analysis
  propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).default("RESIDENTIAL"),
  additionalNotes: z.string().max(500).optional(),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const QuoteResultSchema = z.object({
  rangeLow: z.number().nonnegative(),
  rangeHigh: z.number().nonnegative(),
  lineItemBreakdown: z.array(z.object({
    categoryName: z.string(),
    lineItemName: z.string(),
    unit: PricingUnitSchema,
    quantity: z.number(),
    unitPrice: z.number(),
    subtotal: z.number(),
    appliedMultiplier: z.number(),
  })),
  disclaimer: z.string(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  usedFallbackPricing: z.boolean(),
});
export type QuoteResult = z.infer<typeof QuoteResultSchema>;

// ── Quote disclaimer (must be spoken verbally AND sent via SMS) ──

export const QUOTE_DISCLAIMER =
  "This is a preliminary estimate based on the information provided. " +
  "Actual costs may vary after on-site inspection. This is not a binding contract. " +
  "Final pricing will be confirmed by your assigned technician." as const;
