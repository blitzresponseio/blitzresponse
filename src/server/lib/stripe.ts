/**
 * Stripe integration — checkout sessions, customer portal, subscription management.
 */

function getStripeHeaders() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

/**
 * Create a Stripe Checkout session for new subscriptions.
 * Includes setup fee as a one-time line item (waived for annual).
 */
export async function createCheckoutSession(opts: {
  companyId: string;
  companyName: string;
  email: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  billing: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const priceMap: Record<string, { monthly: string; annual: string; setup: string }> = {
    STARTER: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
      annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? "",
      setup: process.env.STRIPE_PRICE_STARTER_SETUP ?? "",
    },
    PRO: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
      setup: process.env.STRIPE_PRICE_PRO_SETUP ?? "",
    },
    ENTERPRISE: {
      monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? "",
      annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? "",
      setup: process.env.STRIPE_PRICE_ENTERPRISE_SETUP ?? "",
    },
  };

  const prices = priceMap[opts.plan];
  if (!prices) throw new Error(`Invalid plan: ${opts.plan}`);

  const subscriptionPriceId = opts.billing === "annual" ? prices.annual : prices.monthly;
  if (!subscriptionPriceId) throw new Error(`No Stripe price configured for ${opts.plan} ${opts.billing}`);

  // Build line items
  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: subscriptionPriceId, quantity: 1 },
  ];

  // Add setup fee for monthly billing only (waived on annual)
  if (opts.billing === "monthly" && prices.setup) {
    lineItems.push({ price: prices.setup, quantity: 1 });
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("customer_email", opts.email);
  params.set("success_url", opts.successUrl);
  params.set("cancel_url", opts.cancelUrl);
  params.set("metadata[companyId]", opts.companyId);
  params.set("metadata[plan]", opts.plan);
  params.set("metadata[billing]", opts.billing);
  params.set("subscription_data[metadata][companyId]", opts.companyId);
  params.set("subscription_data[trial_period_days]", "0"); // No free trial, money-back guarantee instead
  params.set("payment_method_collection", "always");
  params.set("allow_promotion_codes", "true");

  lineItems.forEach((item, i) => {
    params.set(`line_items[${i}][price]`, item.price);
    params.set(`line_items[${i}][quantity]`, String(item.quantity));
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: getStripeHeaders(),
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe checkout failed (${res.status}): ${err}`);
  }

  const session = await res.json();
  return { url: session.url, sessionId: session.id };
}

/**
 * Create a Stripe Customer Portal session for managing billing.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", returnUrl);

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: getStripeHeaders(),
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Stripe portal failed: ${res.status}`);
  const session = await res.json();
  return { url: session.url };
}

/**
 * Issue a full refund for a payment (14-day money-back guarantee).
 */
export async function refundPayment(paymentIntentId: string): Promise<{ refundId: string }> {
  const params = new URLSearchParams();
  params.set("payment_intent", paymentIntentId);

  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: getStripeHeaders(),
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Stripe refund failed: ${res.status}`);
  const data = await res.json();
  return { refundId: data.id };
}
