"use client";

import { trpc } from "@/lib/trpc-client";
import { KPICards } from "@/components/dashboard/kpi-cards";
import {
  Phone,
  ArrowRight,
  Droplets,
  Flame,
  Bug,
  CloudLightning,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import {
  formatPhone,
  formatDuration,
  timeAgo,
  emergencyColor,
  statusBadge,
  formatCurrency,
  cn,
} from "@/lib/utils";

const emergencyIcons: Record<string, React.ElementType> = {
  WATER_DAMAGE: Droplets,
  FIRE_SMOKE: Flame,
  MOLD: Bug,
  STORM: CloudLightning,
  SEWAGE: AlertTriangle,
  OTHER: HelpCircle,
};

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } =
    trpc.analytics.dashboard.useQuery();
  const { data: recentCalls, isLoading: callsLoading } =
    trpc.calls.recent.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time overview of your AI dispatch system
        </p>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : kpis ? (
        <KPICards data={kpis} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Calls */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold text-foreground">Recent Calls</h2>
              <Link
                href="/dashboard/calls"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {callsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted/30" />
                ))
              ) : recentCalls && recentCalls.length > 0 ? (
                recentCalls.map((call) => {
                  const Icon = call.emergencyType
                    ? emergencyIcons[call.emergencyType] ?? Phone
                    : Phone;
                  const badge = statusBadge(call.status);
                  return (
                    <Link
                      key={call.id}
                      href={`/dashboard/calls/${call.id}`}
                      className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          call.emergencyType
                            ? emergencyColor(call.emergencyType)
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {call.callerName ?? formatPhone(call.callerPhone)}
                          </p>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {call.duration ? formatDuration(call.duration) : "—"}
                          {call.quoteRangeLow && call.quoteRangeHigh
                            ? ` · ${formatCurrency(
                                Number(call.quoteRangeLow)
                              )}–${formatCurrency(Number(call.quoteRangeHigh))}`
                            : ""}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(call.createdAt)}
                      </p>
                    </Link>
                  );
                })
              ) : (
                <div className="px-6 py-12 text-center">
                  <Phone className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No calls yet. Your AI agent is standing by.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              {[
                {
                  label: "Upload Pricing Matrix",
                  href: "/dashboard/settings/pricing",
                  description: "Set your service rates",
                },
                {
                  label: "Configure Voice Agent",
                  href: "/dashboard/settings/voice",
                  description: "Customize greeting & scripts",
                },
                {
                  label: "Add Team Members",
                  href: "/dashboard/settings/team",
                  description: "Set up on-call dispatch",
                },
                {
                  label: "Connect Calendar",
                  href: "/dashboard/settings/integrations",
                  description: "Google Calendar for bookings",
                },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>

          {/* ROI Highlight */}
          {kpis && kpis.estimatedRevenueSaved > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-sm font-medium text-emerald-800">
                Estimated Revenue Saved
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">
                {formatCurrency(kpis.estimatedRevenueSaved, { compact: true })}
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                {kpis.jobsThisMonth} jobs captured this month
                {kpis.usingDefaultAvgValue && " · using industry avg"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
