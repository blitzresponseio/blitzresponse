"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import {
  Phone,
  Droplets,
  Flame,
  Bug,
  CloudLightning,
  AlertTriangle,
  HelpCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  cn,
  formatPhone,
  formatDuration,
  timeAgo,
  emergencyColor,
  statusBadge,
  formatCurrency,
} from "@/lib/utils";

const emergencyIcons: Record<string, React.ElementType> = {
  WATER_DAMAGE: Droplets,
  FIRE_SMOKE: Flame,
  MOLD: Bug,
  STORM: CloudLightning,
  SEWAGE: AlertTriangle,
  OTHER: HelpCircle,
};

const statusOptions = [
  { value: undefined, label: "All Statuses" },
  { value: "COMPLETED" as const, label: "Completed" },
  { value: "MISSED" as const, label: "Missed" },
  { value: "IN_PROGRESS" as const, label: "In Progress" },
  { value: "VOICEMAIL" as const, label: "Voicemail" },
  { value: "DROPPED" as const, label: "Dropped" },
  { value: "TRANSFERRED" as const, label: "Transferred" },
];

const typeOptions = [
  { value: undefined, label: "All Types" },
  { value: "WATER_DAMAGE" as const, label: "Water" },
  { value: "FIRE_SMOKE" as const, label: "Fire/Smoke" },
  { value: "MOLD" as const, label: "Mold" },
  { value: "STORM" as const, label: "Storm" },
  { value: "SEWAGE" as const, label: "Sewage" },
];

export default function CallLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const { data, isLoading } = trpc.calls.list.useQuery({
    page,
    perPage: 20,
    search: search || undefined,
    status: statusFilter as any,
    emergencyType: typeFilter as any,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Call Log
        </h1>
        <p className="text-sm text-muted-foreground">
          All inbound calls, texts, and web form submissions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={statusFilter ?? ""}
          onChange={(e) => {
            setStatusFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {statusOptions.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter ?? ""}
          onChange={(e) => {
            setTypeFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {typeOptions.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Caller
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Quote
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : data?.calls.map((call) => {
                    const Icon = call.emergencyType
                      ? emergencyIcons[call.emergencyType] ?? Phone
                      : Phone;
                    const badge = statusBadge(call.status);
                    return (
                      <tr
                        key={call.id}
                        className="transition-colors hover:bg-accent/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/calls/${call.id}`}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg",
                                call.emergencyType
                                  ? emergencyColor(call.emergencyType)
                                  : "bg-gray-100 text-gray-600"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground hover:underline">
                                {call.callerName ?? "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatPhone(call.callerPhone)}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {call.emergencyType?.replace("_", " ") ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {call.duration ? formatDuration(call.duration) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {call.quoteRangeLow && call.quoteRangeHigh
                            ? `${formatCurrency(
                                Number(call.quoteRangeLow)
                              )}–${formatCurrency(Number(call.quoteRangeHigh))}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {timeAgo(call.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {data.pagination.total} total calls
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage(Math.min(data.pagination.totalPages, page + 1))
                }
                disabled={page === data.pagination.totalPages}
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
