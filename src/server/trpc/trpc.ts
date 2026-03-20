import { initTRPC, TRPCError } from "@trpc/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/lib/db";

/**
 * tRPC context — created fresh for every request.
 * Includes DB client and optionally the authenticated user + company.
 */
export const createTRPCContext = async () => {
  const { userId, orgId } = await auth();

  return {
    db,
    userId,
    orgId,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * tRPC instance with superjson transformer (handles Dates, Decimals, etc.)
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

/**
 * Public procedure — no auth required.
 * Use for: landing page data, health checks, public pricing.
 */
export const publicProcedure = t.procedure;

/**
 * Middleware: require authenticated user.
 */
const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  // Resolve user from our DB (synced via Clerk webhook)
  const user = await ctx.db.user.findUnique({
    where: { clerkUserId: ctx.userId },
    include: { company: true },
  });

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found. Please complete onboarding.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user,
      company: user.company,
      companyId: user.companyId,
    },
  });
});

/**
 * Protected procedure — requires authenticated user with a company.
 * All dashboard routes use this.
 */
export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Middleware: require OWNER or ADMIN role.
 */
const enforceAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await ctx.db.user.findUnique({
    where: { clerkUserId: ctx.userId },
    include: { company: true },
  });

  if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This action requires admin privileges.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user,
      company: user.company,
      companyId: user.companyId,
    },
  });
});

/**
 * Admin procedure — requires OWNER or ADMIN role.
 * Use for: settings changes, team management, billing, pricing upload.
 */
export const adminProcedure = t.procedure.use(enforceAdmin);
