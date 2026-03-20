import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { DEFAULT_AVG_JOB_VALUE } from "@/lib/constants";

export const analyticsRouter = createTRPCRouter({
  /**
   * Dashboard KPIs — top-line metrics.
   */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      callsThisMonth,
      callsThisWeek,
      callsToday,
      jobsThisMonth,
      completedJobsThisMonth,
      missedCallsThisMonth,
    ] = await Promise.all([
      ctx.db.callLog.count({
        where: { companyId: ctx.companyId, createdAt: { gte: startOfMonth }, isTestCall: false },
      }),
      ctx.db.callLog.count({
        where: { companyId: ctx.companyId, createdAt: { gte: startOfWeek }, isTestCall: false },
      }),
      ctx.db.callLog.count({
        where: {
          companyId: ctx.companyId,
          createdAt: { gte: new Date(now.toDateString()) },
          isTestCall: false,
        },
      }),
      ctx.db.job.count({
        where: { companyId: ctx.companyId, createdAt: { gte: startOfMonth } },
      }),
      ctx.db.job.count({
        where: {
          companyId: ctx.companyId,
          status: "COMPLETED",
          completedDate: { gte: startOfMonth },
        },
      }),
      ctx.db.callLog.count({
        where: {
          companyId: ctx.companyId,
          status: "MISSED",
          createdAt: { gte: startOfMonth },
          isTestCall: false,
        },
      }),
    ]);

    // Compute average job value from actual data, fall back to default
    const avgJobValue = await computeAvgJobValue(ctx.db, ctx.companyId);

    // ROI estimate: jobs captured this month × avg job value
    const estimatedRevenueSaved = jobsThisMonth * avgJobValue;
    const answeredRate =
      callsThisMonth > 0
        ? ((callsThisMonth - missedCallsThisMonth) / callsThisMonth) * 100
        : 100;

    return {
      callsToday,
      callsThisWeek,
      callsThisMonth,
      jobsThisMonth,
      completedJobsThisMonth,
      missedCallsThisMonth,
      answeredRate: Math.round(answeredRate),
      estimatedRevenueSaved,
      avgJobValue,
      usingDefaultAvgValue: avgJobValue === DEFAULT_AVG_JOB_VALUE,
    };
  }),

  /**
   * Time series data for charts.
   */
  trends: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d"]).default("30d"),
        metric: z.enum(["calls", "jobs", "revenue"]).default("calls"),
      })
    )
    .query(async ({ ctx, input }) => {
      const daysBack = input.period === "7d" ? 7 : input.period === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);

      if (input.metric === "calls") {
        const calls = await ctx.db.callLog.findMany({
          where: {
            companyId: ctx.companyId,
            createdAt: { gte: startDate },
            isTestCall: false,
          },
          select: { createdAt: true, status: true, emergencyType: true },
          orderBy: { createdAt: "asc" },
        });

        return aggregateByDay(calls, daysBack);
      }

      if (input.metric === "jobs") {
        const jobs = await ctx.db.job.findMany({
          where: {
            companyId: ctx.companyId,
            createdAt: { gte: startDate },
          },
          select: { createdAt: true, status: true, estimatedValue: true },
          orderBy: { createdAt: "asc" },
        });

        return aggregateByDay(jobs, daysBack);
      }

      // Revenue trend
      const jobs = await ctx.db.job.findMany({
        where: {
          companyId: ctx.companyId,
          createdAt: { gte: startDate },
          status: { in: ["COMPLETED", "IN_PROGRESS", "SCHEDULED"] },
        },
        select: { createdAt: true, estimatedValue: true, actualValue: true },
        orderBy: { createdAt: "asc" },
      });

      return aggregateRevenueByDay(jobs, daysBack);
    }),

  /**
   * ROI summary for the current billing period.
   */
  roi: protectedProcedure.query(async ({ ctx }) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [jobs, missedCalls, company] = await Promise.all([
      ctx.db.job.findMany({
        where: {
          companyId: ctx.companyId,
          createdAt: { gte: startOfMonth },
          status: { not: "LOST" },
        },
        select: { estimatedValue: true, actualValue: true },
      }),
      ctx.db.callLog.count({
        where: {
          companyId: ctx.companyId,
          status: "MISSED",
          createdAt: { gte: startOfMonth },
          isTestCall: false,
        },
      }),
      ctx.db.company.findUnique({
        where: { id: ctx.companyId },
        select: { stripePriceId: true },
      }),
    ]);

    const avgJobValue = await computeAvgJobValue(ctx.db, ctx.companyId);
    const totalJobValue = jobs.reduce((sum, j) => {
      const val = j.actualValue?.toNumber() ?? j.estimatedValue?.toNumber() ?? avgJobValue;
      return sum + val;
    }, 0);

    // Subscription cost (simplified — would use Stripe API in production)
    const subscriptionCost = 997; // TODO: resolve from stripePriceId

    return {
      jobsCaptured: jobs.length,
      totalJobValue,
      avgJobValue,
      missedCalls,
      subscriptionCost,
      roi: subscriptionCost > 0 ? (totalJobValue / subscriptionCost) * 100 : 0,
      netValue: totalJobValue - subscriptionCost,
      usingDefaultAvgValue: avgJobValue === DEFAULT_AVG_JOB_VALUE,
    };
  }),
});

// ── Helpers ────────────────────────────────────────────────

async function computeAvgJobValue(
  db: typeof import("@/server/lib/db").db,
  companyId: string
): Promise<number> {
  const result = await db.job.aggregate({
    where: {
      companyId,
      status: "COMPLETED",
      actualValue: { not: null },
    },
    _avg: { actualValue: true },
  });

  return result._avg.actualValue?.toNumber() ?? DEFAULT_AVG_JOB_VALUE;
}

function aggregateByDay<T extends { createdAt: Date }>(
  items: T[],
  daysBack: number
): Array<{ date: string; count: number }> {
  const result: Array<{ date: string; count: number }> = [];
  const now = new Date();

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = items.filter(
      (item) => item.createdAt.toISOString().split("T")[0] === dateStr
    ).length;
    result.push({ date: dateStr, count });
  }

  return result;
}

function aggregateRevenueByDay(
  jobs: Array<{
    createdAt: Date;
    estimatedValue: { toNumber(): number } | null;
    actualValue: { toNumber(): number } | null;
  }>,
  daysBack: number
): Array<{ date: string; revenue: number }> {
  const result: Array<{ date: string; revenue: number }> = [];
  const now = new Date();

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const revenue = jobs
      .filter((j) => j.createdAt.toISOString().split("T")[0] === dateStr)
      .reduce((sum, j) => {
        return sum + (j.actualValue?.toNumber() ?? j.estimatedValue?.toNumber() ?? 0);
      }, 0);
    result.push({ date: dateStr, revenue });
  }

  return result;
}
