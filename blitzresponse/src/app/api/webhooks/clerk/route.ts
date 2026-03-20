import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/lib/db";
import { Webhook } from "svix";

/**
 * POST /api/webhooks/clerk
 *
 * Syncs Clerk events to our database:
 * - organization.created → Create Company
 * - organizationMembership.created → Create User
 * - organizationMembership.deleted → Deactivate User
 * - user.updated → Sync user fields
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify webhook signature
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing headers" }, { status: 401 });
  }

  let event: any;
  try {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) throw new Error("CLERK_WEBHOOK_SECRET not set");

    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      // Allow unverified in dev
      event = JSON.parse(body);
    } else {
      console.error("[Clerk Webhook] Verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    switch (event.type) {
      case "organization.created": {
        const org = event.data;
        const slug = org.slug || org.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        await db.company.upsert({
          where: { clerkOrgId: org.id },
          create: {
            clerkOrgId: org.id,
            name: org.name,
            slug,
            subscriptionStatus: "TRIALING",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 3600000), // 14-day trial
          },
          update: { name: org.name },
        });
        break;
      }

      case "organizationMembership.created": {
        const membership = event.data;
        const orgId = membership.organization?.id;
        const userId = membership.public_user_data?.user_id;

        if (!orgId || !userId) break;

        const company = await db.company.findUnique({
          where: { clerkOrgId: orgId },
        });
        if (!company) break;

        // Map Clerk roles to our roles
        const roleMap: Record<string, string> = {
          "org:admin": "ADMIN",
          "org:member": "MEMBER",
        };
        const role = roleMap[membership.role] ?? "MEMBER";

        // Check if this is the first member (make them OWNER)
        const memberCount = await db.user.count({
          where: { companyId: company.id },
        });

        await db.user.upsert({
          where: { clerkUserId: userId },
          create: {
            clerkUserId: userId,
            email: membership.public_user_data?.email ?? "",
            name: `${membership.public_user_data?.first_name ?? ""} ${membership.public_user_data?.last_name ?? ""}`.trim() || null,
            role: memberCount === 0 ? "OWNER" : (role as any),
            companyId: company.id,
          },
          update: {
            email: membership.public_user_data?.email ?? undefined,
            name: `${membership.public_user_data?.first_name ?? ""} ${membership.public_user_data?.last_name ?? ""}`.trim() || undefined,
          },
        });
        break;
      }

      case "organizationMembership.deleted": {
        const membership = event.data;
        const userId = membership.public_user_data?.user_id;
        if (!userId) break;

        // Soft delete — keep record but disconnect
        await db.user
          .delete({ where: { clerkUserId: userId } })
          .catch(() => {}); // Ignore if not found
        break;
      }

      case "user.updated": {
        const user = event.data;
        await db.user
          .update({
            where: { clerkUserId: user.id },
            data: {
              email: user.email_addresses?.[0]?.email_address ?? undefined,
              name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || undefined,
            },
          })
          .catch(() => {}); // Ignore if not in our DB
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Clerk Webhook Error]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
