"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Check, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { SUBSCRIPTION_TIERS, OVERAGE_RATE_PER_CALL } from "@/lib/constants";

export default function BillingPage() {
  const { data: plan, isLoading } = trpc.billing.getCurrentPlan.useQuery();
  const { data: portal } = trpc.billing.getPortalUrl.useQuery();

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!plan) return null;

  const usagePct = plan.usage.callLimit > 0 ? Math.round((plan.usage.calls / plan.usage.callLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and usage.</p>
      </div>

      <div className="grid gap-6 max-w-3xl md:grid-cols-2">
        {/* Current plan */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">Current plan</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{plan.tierName}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(plan.price)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <div className="mt-4 space-y-1">
            {plan.features.slice(0, 5).map((f) => (
              <p key={f} className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3 w-3 text-primary" />{f}</p>
            ))}
          </div>
          {portal?.url && (
            <a href={portal.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Manage subscription <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Usage */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-foreground">Usage this month</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">AI calls</span><span className="font-medium">{plan.usage.calls} / {plan.usage.callLimit === -1 ? "∞" : plan.usage.callLimit}</span></div>
              {plan.usage.callLimit > 0 && (
                <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                </div>
              )}
            </div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Team members</span><span className="font-medium">{plan.usage.teamMembers} / {plan.usage.teamLimit === -1 ? "∞" : plan.usage.teamLimit}</span></div>
          </div>
          {plan.status === "PAST_DUE" && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /><p className="text-xs text-red-800">Payment past due. Please update your payment method.</p></div>
          )}
          {plan.status === "TRIALING" && plan.trialEndsAt && (
            <div className="mt-4 rounded-lg bg-blue-50 p-3"><p className="text-xs text-blue-800">Trial ends {new Date(plan.trialEndsAt).toLocaleDateString()}</p></div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Overage: {formatCurrency(OVERAGE_RATE_PER_CALL)}/call beyond your limit.</p>
        </div>
      </div>
    </div>
  );
}
