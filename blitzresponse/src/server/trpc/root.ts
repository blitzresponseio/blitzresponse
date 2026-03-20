import { createCallerFactory, createTRPCRouter } from "@/server/trpc/trpc";
import { companyRouter } from "@/server/trpc/routers/company";
import { callsRouter } from "@/server/trpc/routers/calls";
import { analyticsRouter } from "@/server/trpc/routers/analytics";
import { pricingRouter } from "@/server/trpc/routers/pricing";
import { jobsRouter } from "@/server/trpc/routers/jobs";
import { teamRouter } from "@/server/trpc/routers/team";
import { billingRouter } from "@/server/trpc/routers/billing";
import { integrationsRouter } from "@/server/trpc/routers/integrations";

/**
 * Root tRPC router — all sub-routers merged here.
 */
export const appRouter = createTRPCRouter({
  company: companyRouter,
  calls: callsRouter,
  analytics: analyticsRouter,
  pricing: pricingRouter,
  jobs: jobsRouter,
  team: teamRouter,
  billing: billingRouter,
  integrations: integrationsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
