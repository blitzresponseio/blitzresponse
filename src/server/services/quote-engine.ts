import { db } from "@/server/lib/db";
import {
  type PricingMatrixData,
  type QuoteRequest,
  type QuoteResult,
  type FallbackPricing,
  QUOTE_DISCLAIMER,
} from "@/types/pricing";

/**
 * Generate a preliminary quote from the company's pricing matrix.
 * Falls back to default pricing if no matrix is uploaded.
 */
export async function generateQuote(
  companyId: string,
  request: QuoteRequest
): Promise<QuoteResult> {
  const matrix = await db.pricingMatrix.findUnique({
    where: { companyId },
  });

  if (matrix?.data) {
    return calculateFromMatrix(matrix.data as PricingMatrixData, request);
  }

  return calculateFromFallback(request);
}

// ── Matrix-based calculation ───────────────────────────────

function calculateFromMatrix(
  data: PricingMatrixData,
  req: QuoteRequest
): QuoteResult {
  const breakdown: QuoteResult["lineItemBreakdown"] = [];
  let totalLow = 0;
  let totalHigh = 0;

  // Map emergency type to matching categories
  const typeMap: Record<string, string[]> = {
    WATER_DAMAGE: ["WATER_DAMAGE", "GENERAL"],
    FIRE_SMOKE: ["FIRE_SMOKE", "GENERAL"],
    MOLD: ["MOLD", "GENERAL"],
    STORM: ["WATER_DAMAGE", "GENERAL"],
    SEWAGE: ["WATER_DAMAGE", "GENERAL"],
    OTHER: ["GENERAL"],
  };

  const relevantTypes = typeMap[req.emergencyType] ?? ["GENERAL"];
  const relevantCategories = data.categories.filter(
    (c) => relevantTypes.includes(c.emergencyType) || c.emergencyType === "GENERAL"
  );

  // Category multiplier based on IICRC damage category
  const catKey = `cat${req.damageCategory}` as "cat1" | "cat2" | "cat3" | "cat4";

  for (const category of relevantCategories) {
    for (const item of category.lineItems) {
      if (!item.isActive) continue;

      const multiplier = item.multipliers[catKey] ?? 1.0;
      const emergencyMult =
        req.isEmergency || req.isAfterHours ? item.emergencyMultiplier : 1.0;
      const combinedMult = multiplier * emergencyMult;

      let quantity: number;
      switch (item.unit) {
        case "SQ_FT":
        case "LN_FT":
          quantity = req.squareFootage;
          break;
        case "DAY":
          // Estimate 3–5 days for drying equipment
          quantity = req.damageCategory >= 3 ? 5 : 3;
          break;
        case "HOUR":
          // Estimate 2–4 hours labor per 100 sq ft
          quantity = Math.max(2, Math.ceil(req.squareFootage / 100) * 2);
          break;
        case "EACH":
        case "FLAT":
          quantity = 1;
          break;
        default:
          quantity = 1;
      }

      const subtotal = Math.max(
        item.unitPrice * quantity * combinedMult,
        item.minimumCharge
      );

      breakdown.push({
        categoryName: category.name,
        lineItemName: item.name,
        unit: item.unit,
        quantity,
        unitPrice: item.unitPrice,
        subtotal,
        appliedMultiplier: combinedMult,
      });

      totalLow += subtotal * 0.8;  // -20% for low range
      totalHigh += subtotal * 1.25; // +25% for high range
    }
  }

  // Apply tax
  const taxMult = 1 + (data.taxRate ?? 0);
  totalLow = Math.round(totalLow * taxMult);
  totalHigh = Math.round(totalHigh * taxMult);

  // Minimum floor
  totalLow = Math.max(totalLow, 500);

  // Adjust based on severity score from photos
  if (req.severityScore) {
    const severityAdj = 1 + (req.severityScore - 5) * 0.05; // ±5% per point from midpoint
    totalLow = Math.round(totalLow * severityAdj);
    totalHigh = Math.round(totalHigh * severityAdj);
  }

  // Confidence based on data completeness
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  if (req.squareFootage > 0 && req.damageCategory && breakdown.length >= 3) {
    confidence = "HIGH";
  } else if (!req.squareFootage || breakdown.length < 2) {
    confidence = "LOW";
  }

  return {
    rangeLow: totalLow,
    rangeHigh: totalHigh,
    lineItemBreakdown: breakdown,
    disclaimer: QUOTE_DISCLAIMER,
    confidence,
    usedFallbackPricing: false,
  };
}

// ── Fallback calculation ───────────────────────────────────

function calculateFromFallback(req: QuoteRequest): QuoteResult {
  let fallback: FallbackPricing;
  try {
    fallback = JSON.parse(process.env.DEFAULT_PRICING_FALLBACK ?? "{}");
  } catch {
    fallback = {
      water_extraction: { perSqFt: 3.5, minimum: 500 },
      structural_drying: { perSqFt: 4.0, minimum: 750 },
      mold_remediation: { perSqFt: 12.0, minimum: 1500 },
      fire_smoke_cleanup: { perSqFt: 6.5, minimum: 1000 },
      content_cleaning: { perSqFt: 2.5, minimum: 350 },
    };
  }

  const typeToKey: Record<string, string[]> = {
    WATER_DAMAGE: ["water_extraction", "structural_drying"],
    FIRE_SMOKE: ["fire_smoke_cleanup", "content_cleaning"],
    MOLD: ["mold_remediation"],
    STORM: ["water_extraction", "structural_drying"],
    SEWAGE: ["water_extraction", "structural_drying"],
    OTHER: ["water_extraction"],
  };

  const keys = typeToKey[req.emergencyType] ?? ["water_extraction"];
  const sqFt = req.squareFootage || 150;
  const catMult = [1.0, 1.0, 1.3, 1.8, 2.2][req.damageCategory] ?? 1.0;
  const breakdown: QuoteResult["lineItemBreakdown"] = [];
  let total = 0;

  for (const key of keys) {
    const pricing = fallback[key];
    if (!pricing) continue;
    const subtotal = Math.max(pricing.perSqFt * sqFt * catMult, pricing.minimum);
    total += subtotal;
    breakdown.push({
      categoryName: key.replace(/_/g, " "),
      lineItemName: key.replace(/_/g, " "),
      unit: "SQ_FT",
      quantity: sqFt,
      unitPrice: pricing.perSqFt,
      subtotal,
      appliedMultiplier: catMult,
    });
  }

  return {
    rangeLow: Math.max(Math.round(total * 0.8), 500),
    rangeHigh: Math.round(total * 1.3),
    lineItemBreakdown: breakdown,
    disclaimer: QUOTE_DISCLAIMER,
    confidence: "LOW",
    usedFallbackPricing: true,
  };
}
