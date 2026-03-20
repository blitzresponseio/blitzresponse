import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/lib/db";
import { createCheckoutSession } from "@/server/lib/stripe";

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session and returns the URL.
 * Body: { plan: "STARTER"|"PRO"|"ENTERPRISE", billing: "monthly"|"annual" }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { company: true },
  });

  if (!user?.company) {
    return NextResponse.json({ error: "No company found" }, { status: 404 });
  }

  // If already has active subscription, redirect to portal instead
  if (user.company.stripeCustomerId && user.company.subscriptionStatus === "ACTIVE") {
    return NextResponse.json({
      error: "Already subscribed. Use billing settings to manage your plan.",
    }, { status: 400 });
  }

  const body = await req.json();
  const { plan, billing } = body;

  if (!["STARTER", "PRO", "ENTERPRISE"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!["monthly", "annual"].includes(billing)) {
    return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await createCheckoutSession({
      companyId: user.companyId,
      companyName: user.company.name,
      email: user.email,
      plan,
      billing,
      successUrl: `${appUrl}/dashboard?checkout=success&plan=${plan}`,
      cancelUrl: `${appUrl}/dashboard/settings/billing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.sessionId });
  } catch (err) {
    console.error("[Checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
