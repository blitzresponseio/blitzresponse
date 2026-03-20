import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/lib/db";

/**
 * Super-admin user IDs — add your Clerk user ID here.
 * These users can access /admin routes and manage all companies.
 */
const SUPER_ADMIN_IDS = new Set([
  process.env.SUPER_ADMIN_CLERK_ID ?? "",
]);

export async function isSuperAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  return SUPER_ADMIN_IDS.has(userId);
}

export async function requireSuperAdmin() {
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    throw new Error("Forbidden — super admin access required");
  }
}

/**
 * Get all companies with usage stats for the admin dashboard.
 */
export async function getAllCompaniesWithStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const companies = await db.company.findMany({
    include: {
      _count: {
        select: {
          users: true,
          calls: true,
          jobs: true,
          teamMembers: true,
        },
      },
      pricingMatrix: { select: { id: true, version: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get this month's call counts per company
  const monthlyCalls = await db.callLog.groupBy({
    by: ["companyId"],
    where: { createdAt: { gte: startOfMonth }, isTestCall: false },
    _count: true,
  });

  const monthlyMap = new Map(monthlyCalls.map((c) => [c.companyId, c._count]));

  return companies.map((c) => ({
    ...c,
    callsThisMonth: monthlyMap.get(c.id) ?? 0,
    hasPricing: !!c.pricingMatrix,
    isFullyConfigured: !!(c.retellAgentId && c.phone && c.onboardingComplete),
  }));
}
