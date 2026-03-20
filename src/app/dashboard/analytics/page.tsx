"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Phone,
  Target,
  Loader2,
} from "lucide-react";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const { data: roi, isLoading: roiLoading } = trpc.analytics.roi.useQuery();
  const { data: callTrend } = trpc.analytics.trends.useQuery({
    period,
    metric: "calls",
  });
  const { data: revTrend } = trpc.analytics.trends.useQuery({
    period,
    metric: "revenue",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            ROI tracking and performance metrics.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* ROI summary */}
      {roiLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : roi ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6">
            <div className="flex items-center gap-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Total job value</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {formatCurrency(roi.totalJobValue, { compact: true })}
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              {roi.jobsCaptured} jobs this billing period
              {roi.usingDefaultAvgValue && " · industry avg"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">ROI</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {Math.round(roi.roi)}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              vs {formatCurrency(roi.subscriptionCost)}/mo subscription
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Net value</span>
            </div>
            <p className={`mt-2 text-3xl font-bold ${roi.netValue >= 0 ? "text-green-600" : "text-red-600"}`}>
              {roi.netValue >= 0 ? "+" : ""}
              {formatCurrency(roi.netValue, { compact: true })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Revenue saved minus subscription
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-xs font-medium">Avg job value</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {formatCurrency(roi.avgJobValue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {roi.usingDefaultAvgValue
                ? "Using $4,500 industry default"
                : "From your completed jobs"}
            </p>
          </div>
        </div>
      ) : null}

      {/* Call volume chart (simple bar visualization) */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Call volume</h2>
        <p className="text-xs text-muted-foreground">
          Daily inbound calls over the selected period
        </p>
        <div className="mt-4">
          {callTrend ? (
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {callTrend.map((day, idx) => {
                const maxCount = Math.max(...callTrend.map((d) => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div
                    key={idx}
                    className="group relative flex-1"
                    title={`${day.date}: ${day.count} calls`}
                  >
                    <div
                      className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[120px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {callTrend && (
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{callTrend[0]?.date}</span>
              <span>{callTrend[callTrend.length - 1]?.date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Revenue trend */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Revenue trend</h2>
        <p className="text-xs text-muted-foreground">
          Estimated job revenue by day
        </p>
        <div className="mt-4">
          {revTrend ? (
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {(revTrend as Array<{ date: string; revenue: number }>).map((day, idx) => {
                const maxRev = Math.max(
                  ...(revTrend as Array<{ revenue: number }>).map((d) => d.revenue),
                  1
                );
                const height = (day.revenue / maxRev) * 100;
                return (
                  <div
                    key={idx}
                    className="group relative flex-1"
                    title={`${day.date}: ${formatCurrency(day.revenue)}`}
                  >
                    <div
                      className="w-full rounded-t bg-emerald-400/70 transition-colors group-hover:bg-emerald-500"
                      style={{ height: `${Math.max(height, day.revenue > 0 ? 4 : 1)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[120px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
