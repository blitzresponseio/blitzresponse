import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import {
  PricingMatrixDataSchema,
  type PricingMatrixData,
  type FallbackPricing,
} from "@/types/pricing";

// ── Fallback pricing parsed from env ───────────────────────

function getFallbackPricing(): FallbackPricing {
  try {
    const raw = process.env.DEFAULT_PRICING_FALLBACK;
    if (!raw) throw new Error("No fallback pricing configured");
    return JSON.parse(raw);
  } catch {
    // Hardcoded safety net
    return {
      water_extraction: { perSqFt: 3.5, minimum: 500 },
      structural_drying: { perSqFt: 4.0, minimum: 750 },
      mold_remediation: { perSqFt: 12.0, minimum: 1500 },
      fire_smoke_cleanup: { perSqFt: 6.5, minimum: 1000 },
      content_cleaning: { perSqFt: 2.5, minimum: 350 },
    };
  }
}

export const pricingRouter = createTRPCRouter({
  /**
   * Get current pricing matrix (or fallback indicator).
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const matrix = await ctx.db.pricingMatrix.findUnique({
      where: { companyId: ctx.companyId },
    });

    if (!matrix) {
      return {
        exists: false as const,
        fallback: getFallbackPricing(),
        data: null,
        version: 0,
        updatedAt: null,
      };
    }

    return {
      exists: true as const,
      fallback: null,
      data: matrix.data as PricingMatrixData,
      version: matrix.version,
      updatedAt: matrix.updatedAt,
    };
  }),

  /**
   * Upsert the full pricing matrix (admin only).
   * Validates against the strict Zod schema.
   */
  upsert: adminProcedure
    .input(
      z.object({
        data: PricingMatrixDataSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.pricingMatrix.findUnique({
        where: { companyId: ctx.companyId },
        select: { id: true, version: true },
      });

      const result = await ctx.db.pricingMatrix.upsert({
        where: { companyId: ctx.companyId },
        create: {
          companyId: ctx.companyId,
          version: 1,
          data: input.data as any,
        },
        update: {
          data: input.data as any,
          version: (existing?.version ?? 0) + 1,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.user.id,
          action: "pricing.upserted",
          target: `pricingMatrix:${result.id}`,
          metadata: {
            version: result.version,
            categoryCount: input.data.categories.length,
            lineItemCount: input.data.categories.reduce(
              (sum, cat) => sum + cat.lineItems.length,
              0
            ),
          },
        },
      });

      // Mark onboarding step
      const settings = (ctx.company.settings ?? {}) as Record<string, any>;
      const onboarding = (settings.onboarding ?? {}) as Record<string, boolean>;
      if (!onboarding.pricing) {
        onboarding.pricing = true;
        await ctx.db.company.update({
          where: { id: ctx.companyId },
          data: { settings: { ...settings, onboarding } },
        });
      }

      return { id: result.id, version: result.version };
    }),

  /**
   * Parse an uploaded CSV/Excel file into structured pricing data.
   * Expects a simple format:
   *   Category, Line Item, Unit, Unit Price, Minimum
   */
  parseFile: adminProcedure
    .input(
      z.object({
        fileContent: z.string(), // CSV content as string
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const lines = input.fileContent
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File must have a header row and at least one data row.",
        });
      }

      // Skip header
      const dataLines = lines.slice(1);
      const categoryMap = new Map<
        string,
        { name: string; items: Array<{ name: string; unit: string; price: number; minimum: number }> }
      >();

      for (const line of dataLines) {
        // Handle quoted CSV fields
        const fields = parseCSVLine(line);
        if (fields.length < 4) continue;

        const [categoryName, itemName, unit, priceStr, minStr] = fields;
        const price = parseFloat(priceStr);
        const minimum = parseFloat(minStr ?? "0");

        if (!categoryName || !itemName || isNaN(price)) continue;

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { name: categoryName, items: [] });
        }

        categoryMap.get(categoryName)!.items.push({
          name: itemName,
          unit: normalizeUnit(unit),
          price,
          minimum: isNaN(minimum) ? 0 : minimum,
        });
      }

      if (categoryMap.size === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not parse any valid pricing rows from the file.",
        });
      }

      // Convert to PricingMatrixData shape
      const categories = Array.from(categoryMap.entries()).map(
        ([key, val], idx) => ({
          id: `cat-${slugify(key)}`,
          name: val.name,
          emergencyType: guessEmergencyType(key),
          sortOrder: idx,
          lineItems: val.items.map((item, itemIdx) => ({
            id: `li-${slugify(key)}-${itemIdx}`,
            name: item.name,
            unit: item.unit as any,
            unitPrice: item.price,
            minimumCharge: item.minimum,
            multipliers: { cat1: 1.0, cat2: 1.3, cat3: 1.8, cat4: 2.2 },
            emergencyMultiplier: 1.5,
            isActive: true,
            sortOrder: itemIdx,
          })),
        })
      );

      return {
        parsed: {
          version: 1 as const,
          currency: "USD",
          taxRate: 0,
          categories,
        },
        stats: {
          categories: categories.length,
          lineItems: categories.reduce((s, c) => s + c.lineItems.length, 0),
        },
      };
    }),

  /**
   * Get fallback pricing (for display/reference).
   */
  getFallback: protectedProcedure.query(() => {
    return getFallbackPricing();
  }),
});

// ── Helpers ────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeUnit(raw: string): string {
  const map: Record<string, string> = {
    "sq ft": "SQ_FT", "sqft": "SQ_FT", "sf": "SQ_FT", "square foot": "SQ_FT",
    "ln ft": "LN_FT", "lf": "LN_FT", "linear foot": "LN_FT",
    "each": "EACH", "ea": "EACH", "unit": "EACH",
    "hour": "HOUR", "hr": "HOUR", "hours": "HOUR",
    "day": "DAY", "days": "DAY",
    "flat": "FLAT", "flat rate": "FLAT",
  };
  return map[raw.toLowerCase()] ?? "EACH";
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function guessEmergencyType(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (lower.includes("water") || lower.includes("flood") || lower.includes("extract"))
    return "WATER_DAMAGE";
  if (lower.includes("fire") || lower.includes("smoke") || lower.includes("soot"))
    return "FIRE_SMOKE";
  if (lower.includes("mold") || lower.includes("remediat"))
    return "MOLD";
  if (lower.includes("storm") || lower.includes("wind"))
    return "STORM";
  if (lower.includes("sewage") || lower.includes("biohazard"))
    return "SEWAGE";
  return "GENERAL";
}
