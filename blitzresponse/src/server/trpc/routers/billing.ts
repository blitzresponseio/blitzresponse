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
      price: tier.price,
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
      return { url: null, message: "No billing account found. Contact support." };
    }

    // TODO: Phase 6 — actual Stripe billing_portal.sessions.create call
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: company.stripeCustomerId,
    //   return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    // });
    // return { url: session.url };

    return {
      url: `https://billing.stripe.com/p/login/test_placeholder`,
      message: "Stripe portal integration pending — Phase 6",
    };
  }),
});
