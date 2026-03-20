import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/trpc/trpc";
import { SUBSCRIPTION_TIERS } from "@/lib/constants";

export const billingRouter = createTRPCRouter({
  /**
   * Get current subscription details.
   */
  getCurrentPlan: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      select: {
        subscriptionStatus: true,
        stripePriceId: true,
        stripeCustomerId: true,
        trialEndsAt: true,
      },
    });

    // Determine tier from price ID
    const priceToTier: Record<string, keyof typeof SUBSCRIPTION_TIERS> = {
      [process.env.STRIPE_PRICE_STARTER ?? ""]: "STARTER",
      [process.env.STRIPE_PRICE_PRO ?? ""]: "PRO",
      [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: "ENTERPRISE",
    };

    const tierKey = company?.stripePriceId
      ? priceToTier[company.stripePriceId] ?? "STARTER"
      : "STARTER";

    const tier = SUBSCRIPTION_TIERS[tierKey];

    // Count current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const callCount = await ctx.db.callLog.count({
      where: {
        companyId: ctx.companyId,
        createdAt: { gte: startOfMonth },
        isTestCall: false,
      },
    });

    const teamCount = await ctx.db.teamMember.count({
      where: { companyId: ctx.companyId, isActive: true },
    });

    return {
      tier: tierKey,
      tierName: tier.name,
      price: tier.priceMonthly,
      priceAnnual: tier.priceAnnualPerMonth,
      status: company?.subscriptionStatus ?? "TRIALING",
      trialEndsAt: company?.trialEndsAt,
      hasStripeCustomer: !!company?.stripeCustomerId,
      usage: {
        calls: callCount,
        callLimit: tier.callLimit,
        callsRemaining: tier.callLimit === -1 ? -1 : Math.max(0, tier.callLimit - callCount),
        teamMembers: teamCount,
        teamLimit: tier.teamMembers,
      },
      features: tier.features,
    };
  }),

  /**
   * Generate Stripe Customer Portal URL (admin only).
   * In production this calls Stripe API — stubbed for now.
   */
  getPortalUrl: adminProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      select: { stripeCustomerId: true },
    });

    if (!company?.stripeCustomerId) {
      return { url: null, message: "No billing account found. Complete checkout first." };
    }

    try {
      const { createPortalSession } = await import("@/server/lib/stripe");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const session = await createPortalSession(
        company.stripeCustomerId,
        `${appUrl}/dashboard/settings/billing`
      );
      return { url: session.url, message: null };
    } catch {
      return { url: null, message: "Stripe not configured yet. Add STRIPE_SECRET_KEY to .env" };
    }
  }),
});
