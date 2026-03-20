import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

export const companyRouter = createTRPCRouter({
  /**
   * Get the current user's company with full settings.
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      include: {
        _count: {
          select: {
            calls: true,
            jobs: true,
            teamMembers: true,
          },
        },
        pricingMatrix: { select: { id: true, version: true, updatedAt: true } },
      },
    });

    if (!company) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Company not found.",
      });
    }

    return company;
  }),

  /**
   * Update company profile and settings (admin only).
   */
  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200).optional(),
        timezone: z.string().optional(),
        defaultLanguage: z.enum(["en", "es"]).optional(),
        settings: z
          .object({
            greeting: z.string().max(500).optional(),
            voiceId: z.string().optional(),
            afterHoursMessage: z.string().max(500).optional(),
            maxCallDuration: z.number().int().min(60).max(900).optional(),
            autoDispatch: z.boolean().optional(),
            requireDisclaimerAck: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.company.update({
        where: { id: ctx.companyId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.timezone && { timezone: input.timezone }),
          ...(input.defaultLanguage && { defaultLanguage: input.defaultLanguage }),
          ...(input.settings && {
            settings: {
              ...(ctx.company.settings as Record<string, unknown>),
              ...input.settings,
            },
          }),
        },
      });

      // Audit log
      await ctx.db.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.user.id,
          action: "company.updated",
          metadata: input,
        },
      });

      return updated;
    }),

  /**
   * Complete an onboarding step.
   */
  completeOnboarding: adminProcedure
    .input(
      z.object({
        step: z.enum([
          "profile",
          "pricing",
          "phone",
          "calendar",
          "team",
          "voice",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentSettings = (ctx.company.settings ?? {}) as Record<
        string,
        unknown
      >;
      const onboarding = (currentSettings.onboarding ?? {}) as Record<
        string,
        boolean
      >;

      onboarding[input.step] = true;

      // Check if all steps complete
      const requiredSteps = ["profile", "pricing", "phone", "calendar", "team"];
      const allComplete = requiredSteps.every((s) => onboarding[s]);

      await ctx.db.company.update({
        where: { id: ctx.companyId },
        data: {
          settings: { ...currentSettings, onboarding },
          ...(allComplete && { onboardingComplete: true }),
        },
      });

      return { step: input.step, allComplete };
    }),

  /**
   * Get onboarding progress.
   */
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const settings = (ctx.company.settings ?? {}) as Record<string, unknown>;
    const onboarding = (settings.onboarding ?? {}) as Record<string, boolean>;

    const steps = [
      { key: "profile", label: "Company Profile", complete: !!onboarding.profile },
      { key: "pricing", label: "Pricing Matrix", complete: !!onboarding.pricing },
      { key: "phone", label: "Phone Number", complete: !!onboarding.phone },
      { key: "calendar", label: "Google Calendar", complete: !!onboarding.calendar },
      { key: "team", label: "Team Members", complete: !!onboarding.team },
      { key: "voice", label: "Voice Settings", complete: !!onboarding.voice },
    ];

    return {
      steps,
      completedCount: steps.filter((s) => s.complete).length,
      totalSteps: steps.length,
      isComplete: ctx.company.onboardingComplete,
    };
  }),
});
