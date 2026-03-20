"use client";

import { trpc } from "@/lib/trpc-client";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STEP_LINKS: Record<string, string> = {
  profile: "/dashboard/settings",
  pricing: "/dashboard/settings/pricing",
  phone: "/dashboard/settings/integrations",
  calendar: "/dashboard/settings/integrations",
  team: "/dashboard/settings/team",
  voice: "/dashboard/settings/voice",
};

export default function OnboardingPage() {
  const { data, isLoading } = trpc.company.getOnboardingStatus.useQuery();

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <img src="/logo.png" alt="BlitzResponse" className="mx-auto h-16 w-auto" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Welcome to BlitzResponse</h1>
        <p className="mt-1 text-sm text-muted-foreground">Complete these steps to get your AI dispatch system live.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-2 flex-1 max-w-xs rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(data.completedCount / data.totalSteps) * 100}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{data.completedCount}/{data.totalSteps}</span>
        </div>
      </div>

      <div className="space-y-3">
        {data.steps.map((step, idx) => (
          <Link
            key={step.key}
            href={STEP_LINKS[step.key] ?? "/dashboard/settings"}
            className={cn(
              "flex items-center gap-4 rounded-xl border p-4 transition-colors",
              step.complete ? "border-green-200 bg-green-50/50" : "border-border bg-card hover:bg-accent/50"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              step.complete ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            )}>
              {step.complete ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <div className="flex-1">
              <p className={cn("text-sm font-medium", step.complete ? "text-green-800" : "text-foreground")}>{step.label}</p>
            </div>
            {!step.complete && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </Link>
        ))}
      </div>

      {data.isComplete && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <Check className="mx-auto h-8 w-8 text-green-600" />
          <p className="mt-2 text-lg font-bold text-green-800">You're all set!</p>
          <p className="mt-1 text-sm text-green-600">Your AI dispatch agent is live and ready to answer calls.</p>
          <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700">
            Go to dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
