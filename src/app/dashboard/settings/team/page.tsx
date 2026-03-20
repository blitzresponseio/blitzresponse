"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import {
  Users,
  Phone,
  Plus,
  Shield,
  ShieldOff,
  Loader2,
  Clock,
} from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TeamPage() {
  const { data: members, isLoading, refetch } = trpc.team.list.useQuery();
  const { data: onCallStatus } = trpc.team.onCallStatus.useQuery();
  const toggleOnCall = trpc.team.updateOnCall.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage technicians and on-call scheduling for dispatch.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add member
        </button>
      </div>

      {/* On-call status banner */}
      {onCallStatus && (
        <div
          className={cn(
            "rounded-xl border p-4",
            onCallStatus.currentOnCall
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          )}
        >
          <div className="flex items-center gap-3">
            <Clock className={cn("h-5 w-5", onCallStatus.currentOnCall ? "text-green-600" : "text-amber-600")} />
            <div>
              <p className={cn("text-sm font-medium", onCallStatus.currentOnCall ? "text-green-800" : "text-amber-800")}>
                {onCallStatus.currentOnCall
                  ? `Currently on call: ${onCallStatus.currentOnCall.name} (${onCallStatus.currentOnCall.role ?? "Tech"})`
                  : "No one currently on call"}
              </p>
              {onCallStatus.isAfterHours && onCallStatus.nextOnCall && (
                <p className="text-xs text-amber-600">
                  Next on-call: {onCallStatus.nextOnCall.name}
                  {onCallStatus.nextOnCall.nextShiftStart &&
                    ` at ${new Date(onCallStatus.nextOnCall.nextShiftStart).toLocaleString()}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Specialties</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Schedule</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">On call</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : members?.map((member) => (
              <tr
                key={member.id}
                className={cn(
                  "transition-colors hover:bg-accent/30",
                  !member.isActive && "opacity-50"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {member.role ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatPhone(member.phone)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {member.specialties.map((s) => (
                      <span
                        key={s}
                        className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-0.5">
                    {DAY_LABELS.map((day, idx) => (
                      <span
                        key={day}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded text-xs",
                          member.onCallDays.includes(idx)
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground/40"
                        )}
                      >
                        {day[0]}
                      </span>
                    ))}
                  </div>
                  {member.onCallStart && member.onCallEnd && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {member.onCallStart}–{member.onCallEnd}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() =>
                      toggleOnCall.mutate({
                        id: member.id,
                        isOnCall: !member.isOnCall,
                      })
                    }
                    disabled={toggleOnCall.isPending}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      member.isOnCall
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {member.isOnCall ? (
                      <><Shield className="h-3 w-3" /> Active</>
                    ) : (
                      <><ShieldOff className="h-3 w-3" /> Off</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
