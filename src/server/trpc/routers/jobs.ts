import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

export const jobsRouter = createTRPCRouter({
  /**
   * List all jobs with filters.
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["LEAD", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "LOST", "CANCELED"])
          .optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        companyId: ctx.companyId,
        ...(input.status && { status: input.status }),
      };

      const [jobs, total] = await Promise.all([
        ctx.db.job.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            call: {
              select: {
                callerName: true,
                callerPhone: true,
                emergencyType: true,
                squareFootage: true,
                quoteRangeLow: true,
                quoteRangeHigh: true,
              },
            },
          },
        }),
        ctx.db.job.count({ where }),
      ]);

      return {
        jobs,
        pagination: {
          page: input.page,
          perPage: input.perPage,
          total,
          totalPages: Math.ceil(total / input.perPage),
        },
      };
    }),

  /**
   * Update job status and details.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z
          .enum(["LEAD", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "LOST", "CANCELED"])
          .optional(),
        estimatedValue: z.number().nonnegative().optional(),
        actualValue: z.number().nonnegative().optional(),
        notes: z.string().max(2000).optional(),
        scheduledDate: z.date().optional(),
        completedDate: z.date().optional(),
        assignedTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.job.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.db.job.update({
        where: { id },
        data,
      });

      await ctx.db.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.user.id,
          action: "job.updated",
          target: `job:${id}`,
          metadata: { oldStatus: existing.status, newStatus: data.status },
        },
      });

      return updated;
    }),

  /**
   * Summary counts by status (for kanban-style board).
   */
  statusCounts: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db.job.groupBy({
      by: ["status"],
      where: { companyId: ctx.companyId },
      _count: true,
    });

    const result: Record<string, number> = {
      LEAD: 0,
      SCHEDULED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      LOST: 0,
      CANCELED: 0,
    };

    for (const row of counts) {
      result[row.status] = row._count;
    }

    return result;
  }),
});
