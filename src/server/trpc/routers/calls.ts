import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

export const callsRouter = createTRPCRouter({
  /**
   * Paginated call log with filters.
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
        status: z.enum([
          "IN_PROGRESS", "COMPLETED", "MISSED", "VOICEMAIL",
          "FAILED", "DROPPED", "TRANSFERRED",
        ]).optional(),
        emergencyType: z.enum([
          "WATER_DAMAGE", "FIRE_SMOKE", "MOLD", "STORM", "SEWAGE", "OTHER",
        ]).optional(),
        channel: z.enum(["PHONE", "SMS", "WEB_FORM"]).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().max(100).optional(),
        includeTestCalls: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        companyId: ctx.companyId,
        ...(input.status && { status: input.status }),
        ...(input.emergencyType && { emergencyType: input.emergencyType }),
        ...(input.channel && { channel: input.channel }),
        ...(!input.includeTestCalls && { isTestCall: false }),
        ...(input.dateFrom || input.dateTo
          ? {
              createdAt: {
                ...(input.dateFrom && { gte: input.dateFrom }),
                ...(input.dateTo && { lte: input.dateTo }),
              },
            }
          : {}),
        ...(input.search
          ? {
              OR: [
                { callerName: { contains: input.search, mode: "insensitive" as const } },
                { callerPhone: { contains: input.search } },
                { summary: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [calls, total] = await Promise.all([
        ctx.db.callLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            photos: { select: { id: true, thumbnailUrl: true, severityScore: true } },
            job: { select: { id: true, status: true, estimatedValue: true } },
          },
        }),
        ctx.db.callLog.count({ where }),
      ]);

      return {
        calls,
        pagination: {
          page: input.page,
          perPage: input.perPage,
          total,
          totalPages: Math.ceil(total / input.perPage),
        },
      };
    }),

  /**
   * Single call detail with full transcript and photos.
   */
  getById: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ ctx, input }) => {
      const call = await ctx.db.callLog.findFirst({
        where: {
          id: input.callId,
          companyId: ctx.companyId,
        },
        include: {
          photos: true,
          job: true,
        },
      });

      if (!call) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Call not found.",
        });
      }

      return call;
    }),

  /**
   * Update call → convert to job or mark as lost.
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        callId: z.string(),
        action: z.enum(["convert_to_job", "mark_lost"]),
        estimatedValue: z.number().nonnegative().optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const call = await ctx.db.callLog.findFirst({
        where: { id: input.callId, companyId: ctx.companyId },
      });

      if (!call) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (input.action === "convert_to_job") {
        const job = await ctx.db.job.upsert({
          where: { callId: input.callId },
          create: {
            companyId: ctx.companyId,
            callId: input.callId,
            status: "LEAD",
            estimatedValue: input.estimatedValue ?? call.quoteRangeHigh?.toNumber(),
            notes: input.notes,
            scheduledDate: call.appointmentTime,
          },
          update: {
            status: "LEAD",
            estimatedValue: input.estimatedValue,
            notes: input.notes,
          },
        });

        await ctx.db.auditLog.create({
          data: {
            companyId: ctx.companyId,
            userId: ctx.user.id,
            action: "call.converted_to_job",
            target: `call:${input.callId}`,
            metadata: { jobId: job.id },
          },
        });

        return { success: true, job };
      }

      // Mark as lost
      await ctx.db.job.upsert({
        where: { callId: input.callId },
        create: {
          companyId: ctx.companyId,
          callId: input.callId,
          status: "LOST",
          notes: input.notes,
        },
        update: { status: "LOST", notes: input.notes },
      });

      return { success: true };
    }),

  /**
   * Get recent calls for dashboard quick view (last 5).
   */
  recent: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.callLog.findMany({
      where: { companyId: ctx.companyId, isTestCall: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        callerPhone: true,
        callerName: true,
        emergencyType: true,
        status: true,
        duration: true,
        quoteRangeLow: true,
        quoteRangeHigh: true,
        createdAt: true,
      },
    });
  }),
});
