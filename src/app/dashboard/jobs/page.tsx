"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { cn, formatCurrency, formatPhone, timeAgo } from "@/lib/utils";
import {
  Briefcase,
  ChevronRight,
  Loader2,
  Droplets,
  Flame,
  Bug,
  CloudLightning,
  AlertTriangle,
} from "lucide-react";

const STATUS_CONFIG = [
  { key: "LEAD", label: "Leads", color: "bg-blue-500" },
  { key: "SCHEDULED", label: "Scheduled", color: "bg-amber-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-purple-500" },
  { key: "COMPLETED", label: "Completed", color: "bg-green-500" },
  { key: "LOST", label: "Lost", color: "bg-red-400" },
] as const;

const emergencyIcons: Record<string, React.ElementType> = {
  WATER_DAMAGE: Droplets,
  FIRE_SMOKE: Flame,
  MOLD: Bug,
  STORM: CloudLightning,
  SEWAGE: AlertTriangle,
};

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data: counts } = trpc.jobs.statusCounts.useQuery();
  const { data, isLoading } = trpc.jobs.list.useQuery({
    status: statusFilter as any,
    perPage: 50,
  });
  const updateJob = trpc.jobs.update.useMutation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Track leads from call to completion.
        </p>
      </div>

      {/* Pipeline summary */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter(undefined)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
            !statusFilter
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          All
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {counts
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : "—"}
          </span>
        </button>
        {STATUS_CONFIG.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              statusFilter === s.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", s.color)} />
            {s.label}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {counts?.[s.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Job list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data?.jobs.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              No jobs found. Jobs are created when calls convert to leads.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data?.jobs.map((job) => {
              const Icon = job.call.emergencyType
                ? emergencyIcons[job.call.emergencyType] ?? Briefcase
                : Briefcase;
              const statusConf = STATUS_CONFIG.find((s) => s.key === job.status);
              return (
                <div
                  key={job.id}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/30"
                >
                  <div className={cn("h-2 w-2 rounded-full", statusConf?.color ?? "bg-gray-400")} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {job.call.callerName ?? formatPhone(job.call.callerPhone)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.call.emergencyType?.replace("_", " ")}
                      {job.call.squareFootage && ` · ${job.call.squareFootage} sq ft`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {job.estimatedValue
                        ? formatCurrency(Number(job.estimatedValue))
                        : "—"}
                    </p>
                    {job.actualValue && (
                      <p className="text-xs text-green-600">
                        Actual: {formatCurrency(Number(job.actualValue))}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      job.status === "COMPLETED" && "bg-green-100 text-green-800",
                      job.status === "IN_PROGRESS" && "bg-purple-100 text-purple-800",
                      job.status === "SCHEDULED" && "bg-amber-100 text-amber-800",
                      job.status === "LEAD" && "bg-blue-100 text-blue-800",
                      job.status === "LOST" && "bg-red-100 text-red-800",
                      job.status === "CANCELED" && "bg-gray-100 text-gray-800"
                    )}
                  >
                    {statusConf?.label ?? job.status}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(job.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
