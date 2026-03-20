"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc-client";
import {
  cn,
  formatPhone,
  formatDuration,
  formatCurrency,
  statusBadge,
  emergencyColor,
} from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  Clock,
  MapPin,
  Shield,
  FileText,
  Image,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Briefcase,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { IICRC_CATEGORIES, SAFETY_ISSUES } from "@/lib/constants";

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = use(params);
  const { data: call, isLoading } = trpc.calls.getById.useQuery({ callId });
  const convertToJob = trpc.calls.updateStatus.useMutation();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Call not found.</p>
        <Link href="/dashboard/calls" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to call log
        </Link>
      </div>
    );
  }

  const badge = statusBadge(call.status);
  const transcript = (call.transcript as Array<{ role: string; content: string }>) ?? [];
  const iicrcCat = call.damageCategory
    ? IICRC_CATEGORIES[call.damageCategory as keyof typeof IICRC_CATEGORIES]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/calls"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {call.callerName ?? formatPhone(call.callerPhone)}
            </h1>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", badge.className)}>
              {badge.label}
            </span>
            {call.isTestCall && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Test call
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatPhone(call.callerPhone)} · {call.channel}
            {call.duration ? ` · ${formatDuration(call.duration)}` : ""}
            {call.language !== "en" && ` · ${call.language.toUpperCase()}`}
          </p>
        </div>

        {/* Actions */}
        {!call.job && call.status === "COMPLETED" && (
          <div className="flex gap-2">
            <button
              onClick={() =>
                convertToJob.mutate({ callId: call.id, action: "convert_to_job" })
              }
              disabled={convertToJob.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Briefcase className="h-4 w-4" /> Convert to job
            </button>
            <button
              onClick={() =>
                convertToJob.mutate({ callId: call.id, action: "mark_lost" })
              }
              disabled={convertToJob.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="h-4 w-4" /> Mark lost
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Transcript */}
        <div className="lg:col-span-2 space-y-4">
          {/* Transcript */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold text-foreground">Call transcript</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-6 space-y-3 scrollbar-thin">
              {transcript.length > 0 ? (
                transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      entry.role === "agent" ? "" : "flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        entry.role === "agent"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {entry.role === "agent" ? "AI" : "C"}
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        entry.role === "agent"
                          ? "rounded-tl-sm bg-blue-50 text-blue-900"
                          : "rounded-tr-sm bg-gray-100 text-gray-900"
                      )}
                    >
                      {entry.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No transcript available.
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          {call.summary && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-semibold text-foreground">AI Summary</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {call.summary}
              </p>
            </div>
          )}

          {/* Photos */}
          {call.photos.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-semibold text-foreground">
                Damage photos ({call.photos.length})
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {call.photos.map((photo) => (
                  <div key={photo.id} className="rounded-lg border border-border overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    {photo.severityScore && (
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Severity
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-bold",
                              photo.severityScore >= 7 ? "bg-red-100 text-red-800" :
                              photo.severityScore >= 4 ? "bg-amber-100 text-amber-800" :
                              "bg-green-100 text-green-800"
                            )}
                          >
                            {photo.severityScore}/10
                          </span>
                        </div>
                        {photo.severityNotes && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {photo.severityNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Triage data, quote, booking */}
        <div className="space-y-4">
          {/* Triage */}
          {call.emergencyType && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Triage details</h3>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className={cn("rounded-full px-2 py-0.5 text-xs font-medium", emergencyColor(call.emergencyType))}>
                    {call.emergencyType.replace("_", " ")}
                  </dd>
                </div>
                {iicrcCat && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">IICRC category</dt>
                    <dd className="font-medium text-foreground">Cat {call.damageCategory}</dd>
                  </div>
                )}
                {call.damageClass && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">IICRC class</dt>
                    <dd className="font-medium text-foreground">Class {call.damageClass}</dd>
                  </div>
                )}
                {call.squareFootage && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sq footage</dt>
                    <dd className="font-medium text-foreground">{call.squareFootage} sq ft</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Property</dt>
                  <dd className="font-medium text-foreground">{call.propertyType}</dd>
                </div>
              </dl>

              {call.safetyIssues.length > 0 && (
                <div className="mt-3 rounded-lg bg-red-50 p-3">
                  <p className="flex items-center gap-1 text-xs font-medium text-red-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> Safety concerns
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {call.safetyIssues.map((issue) => {
                      const info = SAFETY_ISSUES.find((s) => s.id === issue);
                      return (
                        <li key={issue} className="text-xs text-red-700">
                          {info?.label ?? issue}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Quote */}
          {call.quoteRangeLow && call.quoteRangeHigh && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Quote estimate</h3>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatCurrency(Number(call.quoteRangeLow))} – {formatCurrency(Number(call.quoteRangeHigh))}
              </p>
              {call.usedFallback && (
                <p className="mt-1 text-xs text-amber-600">
                  Used fallback pricing (no custom matrix uploaded)
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                {call.disclaimerAcknowledged ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Disclaimer acknowledged ({call.disclaimerMethod?.toLowerCase()})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Disclaimer not yet acknowledged
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Booking */}
          {call.appointmentTime && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h3 className="text-sm font-semibold text-green-800">Appointment booked</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-green-700">
                <Calendar className="h-4 w-4" />
                {new Date(call.appointmentTime).toLocaleString()}
              </p>
              {call.dispatchedTo.length > 0 && (
                <p className="mt-1 text-xs text-green-600">
                  Dispatched to {call.dispatchedTo.length} tech(s)
                </p>
              )}
            </div>
          )}

          {/* Insurance */}
          {call.insuranceInfo && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Insurance</h3>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Has insurance</dt>
                  <dd className="font-medium">
                    {(call.insuranceInfo as any).hasInsurance ? "Yes" : "No"}
                  </dd>
                </div>
                {(call.insuranceInfo as any).carrier && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Carrier</dt>
                    <dd className="font-medium">{(call.insuranceInfo as any).carrier}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Job status */}
          {call.job && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Job</h3>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {call.job.status}
                </span>
              </div>
              {call.job.estimatedValue && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Est. value</span>
                  <span className="font-medium">{formatCurrency(Number(call.job.estimatedValue))}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
