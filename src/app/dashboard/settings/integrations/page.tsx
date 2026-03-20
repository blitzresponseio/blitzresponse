"use client";

import { trpc } from "@/lib/trpc-client";
import {
  Calendar,
  Phone,
  Mic,
  CreditCard,
  Check,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function IntegrationsPage() {
  const { data: status, isLoading, refetch } = trpc.integrations.getStatus.useQuery();
  const connectGcal = trpc.integrations.connectGoogleCal.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
  const disconnectGcal = trpc.integrations.disconnectGoogleCal.useMutation({
    onSuccess: () => refetch(),
  });
  const provisionPhone = trpc.integrations.provisionPhone.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const integrations = [
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Sync appointment bookings to your Google Calendar.",
      icon: Calendar,
      connected: status?.googleCalendar.connected ?? false,
      detail: status?.googleCalendar.calendarId ?? null,
      onConnect: () => connectGcal.mutate(),
      onDisconnect: () => disconnectGcal.mutate(),
      loading: connectGcal.isPending || disconnectGcal.isPending,
    },
    {
      id: "twilio",
      name: "Phone Number (Twilio)",
      description: "Provision a dedicated phone number for AI call answering.",
      icon: Phone,
      connected: status?.twilio.connected ?? false,
      detail: status?.twilio.phoneNumber ?? null,
      onConnect: () => provisionPhone.mutate({}),
      onDisconnect: undefined,
      loading: provisionPhone.isPending,
    },
    {
      id: "retell",
      name: "Retell AI Voice Agent",
      description: "AI voice agent for inbound call handling.",
      icon: Mic,
      connected: status?.retell.connected ?? false,
      detail: status?.retell.agentId ? `Agent: ${status.retell.agentId}` : null,
      onConnect: undefined, // Configured via Retell dashboard
      onDisconnect: undefined,
      loading: false,
    },
    {
      id: "stripe",
      name: "Stripe Billing",
      description: "Subscription management and payment processing.",
      icon: CreditCard,
      connected: status?.stripe.connected ?? false,
      detail: null,
      onConnect: undefined,
      onDisconnect: undefined,
      loading: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect external services to power your AI dispatch system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    integration.connected
                      ? "bg-green-50 text-green-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <integration.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {integration.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                  integration.connected
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {integration.connected ? (
                  <>
                    <Check className="h-3 w-3" /> Connected
                  </>
                ) : (
                  <>
                    <X className="h-3 w-3" /> Not connected
                  </>
                )}
              </div>
            </div>

            {integration.detail && (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
                {integration.detail}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              {integration.connected && integration.onDisconnect && (
                <button
                  onClick={integration.onDisconnect}
                  disabled={integration.loading}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  Disconnect
                </button>
              )}
              {!integration.connected && integration.onConnect && (
                <button
                  onClick={integration.onConnect}
                  disabled={integration.loading}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {integration.loading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Connect
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              {!integration.onConnect && !integration.connected && (
                <p className="text-xs text-muted-foreground italic">
                  Configured by BlitzResponse team during onboarding.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
