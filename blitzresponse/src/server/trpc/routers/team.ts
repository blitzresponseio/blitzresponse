import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

export const teamRouter = createTRPCRouter({
  /**
   * List all team members.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.teamMember.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ isActive: "desc" }, { dispatchPriority: "asc" }, { name: "asc" }],
    });
  }),

  /**
   * Get a single team member.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.teamMember.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      return member;
    }),

  /**
   * Create or update a team member (admin only).
   */
  upsert: adminProcedure
    .input(
      z.object({
        id: z.string().optional(), // Omit for create
        name: z.string().min(1).max(100),
        phone: z.string().min(10).max(20),
        email: z.string().email().optional().or(z.literal("")),
        role: z.string().max(50).optional(),
        specialties: z.array(z.string()).default([]),
        isOnCall: z.boolean().default(false),
        isActive: z.boolean().default(true),
        onCallDays: z.array(z.number().int().min(0).max(6)).default([]),
        onCallStart: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
        onCallEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
        dispatchPriority: z.number().int().min(1).max(100).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        companyId: ctx.companyId,
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        role: input.role || null,
        specialties: input.specialties,
        isOnCall: input.isOnCall,
        isActive: input.isActive,
        onCallDays: input.onCallDays,
        onCallStart: input.onCallStart || null,
        onCallEnd: input.onCallEnd || null,
        dispatchPriority: input.dispatchPriority,
      };

      let member;
      if (input.id) {
        // Verify ownership
        const existing = await ctx.db.teamMember.findFirst({
          where: { id: input.id, companyId: ctx.companyId },
        });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        member = await ctx.db.teamMember.update({
          where: { id: input.id },
          data,
        });
      } else {
        member = await ctx.db.teamMember.create({ data });
      }

      await ctx.db.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.user.id,
          action: input.id ? "team.updated" : "team.created",
          target: `teamMember:${member.id}`,
          metadata: { name: member.name, isOnCall: member.isOnCall },
        },
      });

      // Mark onboarding
      const settings = (ctx.company.settings ?? {}) as Record<string, any>;
      const onboarding = (settings.onboarding ?? {}) as Record<string, boolean>;
      if (!onboarding.team) {
        onboarding.team = true;
        await ctx.db.company.update({
          where: { id: ctx.companyId },
          data: { settings: { ...settings, onboarding } },
        });
      }

      return member;
    }),

  /**
   * Quick toggle on-call status (admin only).
   */
  updateOnCall: adminProcedure
    .input(
      z.object({
        id: z.string(),
        isOnCall: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.teamMember.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.teamMember.update({
        where: { id: input.id },
        data: { isOnCall: input.isOnCall },
      });
    }),

  /**
   * Get current on-call status summary.
   */
  onCallStatus: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      select: { timezone: true },
    });

    const { getOnCallMember } = await import("@/server/services/on-call");

    const result = await getOnCallMember(ctx.companyId, {
      timezone: company?.timezone,
    });

    return {
      currentOnCall: result.current
        ? { id: result.current.id, name: result.current.name, phone: result.current.phone, role: result.current.role }
        : null,
      nextOnCall: result.next
        ? { id: result.next.id, name: result.next.name, nextShiftStart: result.nextShiftStart }
        : null,
      isAfterHours: result.isAfterHours,
    };
  }),
});
