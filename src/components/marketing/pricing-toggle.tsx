"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthly: 597,
    annual: 497,
    setup: 297,
    desc: "100 AI calls/mo · 1 number · 3 team members",
    popular: false,
    features: [
      "24/7 AI voice answering",
      "Emergency triage (IICRC)",
      "Instant quote generation",
      "Google Calendar booking",
      "Call log + transcripts",
      "Basic analytics dashboard",
    ],
  },
  {
    name: "Pro",
    monthly: 997,
    annual: 797,
    setup: 497,
    desc: "500 AI calls/mo · 2 numbers · 10 team members",
    popular: true,
    features: [
      "Everything in Starter",
      "Photo damage analysis (AI)",
      "Full SMS drip chains (EN+ES)",
      "Advanced analytics + ROI",
      "Custom voice scripts",
      "On-call scheduling + smart dispatch",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    monthly: 1497,
    annual: 1197,
    setup: 997,
    desc: "Unlimited calls · 5 numbers · Unlimited team",
    popular: false,
    features: [
      "Everything in Pro",
      "White-label branding",
      "Custom voice cloning",
      "Full API access",
      "Multi-location support",
      "Dedicated onboarding call",
      "Custom integrations",
    ],
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            One captured job pays for the whole year
          </h2>
          <p className="mt-3 text-lg text-gray-600">
            First month free on all plans. Choose monthly or save 20% with annual.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                !isAnnual
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                isAnnual
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Annual
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = isAnnual ? plan.annual : plan.monthly;
            const yearlyTotal = isAnnual ? plan.annual * 12 : null;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 ${
                  plan.popular
                    ? "border-blue-600 shadow-xl shadow-blue-600/10"
                    : "border-gray-200"
                } bg-white p-8`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
                    Most popular
                  </div>
                )}

                <p className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </p>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    ${price.toLocaleString()}
                  </span>
                  <span className="text-gray-500">/mo</span>
                </div>

                {isAnnual && yearlyTotal && (
                  <p className="mt-1 text-sm text-green-600 font-medium">
                    ${yearlyTotal.toLocaleString()}/yr — save $
                    {((plan.monthly - plan.annual) * 12).toLocaleString()}/yr
                  </p>
                )}
                {!isAnnual && (
                  <p className="mt-1 text-sm text-gray-400">
                    or ${plan.annual}/mo billed annually
                  </p>
                )}

                <p className="mt-2 text-sm text-gray-500">{plan.desc}</p>

                {isAnnual ? (
                  <div className="mt-2 rounded-lg bg-green-50 px-3 py-1.5 text-center">
                    <p className="text-xs font-semibold text-green-700">
                      Setup fee waived on annual plans
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">
                    + ${plan.setup} one-time setup fee
                  </p>
                )}

                <Link
                  href="/sign-up"
                  className={`mt-4 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Get started risk-free
                </Link>
                <p className="mt-1.5 text-center text-xs text-gray-400">14-day money-back guarantee</p>

                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          14-day money-back guarantee on all plans. Overage: $2.50/call beyond your plan limit. Setup fee waived on annual billing. Cancel or switch plans anytime.
        </p>
      </div>
    </section>
  );
}
