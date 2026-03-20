import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/lib/db";
import crypto from "crypto";

/**
 * POST /api/webhooks/stripe
 *
 * Handles subscription lifecycle events:
 * - checkout.session.completed → new subscription
 * - customer.subscription.updated → plan changes, renewals
 * - customer.subscription.deleted → cancellation
 * - invoice.payment_failed → past due
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!verifyStripeSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.companyId;
        const customerId = session.customer;

        if (companyId && customerId) {
          await db.company.update({
            where: { id: companyId },
            data: {
              stripeCustomerId: customerId,
              subscriptionStatus: "ACTIVE",
              stripePriceId: session.metadata?.priceId ?? null,
            },
          });

          await db.auditLog.create({
            data: {
              companyId,
              action: "billing.subscription.created",
              metadata: { customerId, priceId: session.metadata?.priceId, plan: session.metadata?.plan },
            },
          });

          // Send welcome email
          try {
            const owner = await db.user.findFirst({
              where: { companyId, role: "OWNER" },
              select: { email: true },
            });
            const company = await db.company.findUnique({
              where: { id: companyId },
              select: { name: true },
            });
            if (owner && company) {
              const { sendWelcomeEmail } = await import("@/server/services/email");
              await sendWelcomeEmail({
                to: owner.email,
                companyName: company.name,
                plan: session.metadata?.plan ?? "Starter",
              });
            }
          } catch (emailErr) {
            console.error("[Stripe] Welcome email failed:", emailErr);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const company = await db.company.findFirst({
          where: { stripeCustomerId: subscription.customer },
        });

        if (company) {
          const statusMap: Record<string, string> = {
            active: "ACTIVE",
            past_due: "PAST_DUE",
            canceled: "CANCELED",
            paused: "PAUSED",
            trialing: "TRIALING",
          };

          await db.company.update({
            where: { id: company.id },
            data: {
              subscriptionStatus: (statusMap[subscription.status] ?? "ACTIVE") as any,
              stripePriceId: subscription.items?.data?.[0]?.price?.id ?? company.stripePriceId,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const company = await db.company.findFirst({
          where: { stripeCustomerId: subscription.customer },
        });

        if (company) {
          await db.company.update({
            where: { id: company.id },
            data: { subscriptionStatus: "CANCELED" },
          });

          await db.auditLog.create({
            data: {
              companyId: company.id,
              action: "billing.subscription.canceled",
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const company = await db.company.findFirst({
          where: { stripeCustomerId: invoice.customer },
        });

        if (company) {
          await db.company.update({
            where: { id: company.id },
            data: { subscriptionStatus: "PAST_DUE" },
          });

          // TODO: Send payment failure email via Resend
          console.log(`[Stripe] Payment failed for company ${company.name}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook Error]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

function verifyStripeSignature(body: string, signature: string | null): boolean {
  if (process.env.NODE_ENV === "development") return true;

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  // Parse Stripe signature header
  const elements = signature.split(",").reduce(
    (acc, part) => {
      const [key, val] = part.split("=");
      if (key === "t") acc.timestamp = val;
      if (key === "v1") acc.signatures.push(val);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] }
  );

  const signedPayload = `${elements.timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return elements.signatures.some(
    (sig) =>
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  );
}
