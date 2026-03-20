"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { useCompany } from "@/hooks/use-company";
import { Mic, Save, Loader2, CheckCircle2, TestTube2 } from "lucide-react";
import { SIMULATED_CALL_SCENARIOS } from "@/lib/constants";

export default function VoiceSettingsPage() {
  const { company, refetch } = useCompany();
  const update = trpc.company.update.useMutation({ onSuccess: () => { refetch(); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  const [saved, setSaved] = useState(false);

  const settings = (company?.settings as Record<string, any>) ?? {};
  const [greeting, setGreeting] = useState(settings.greeting ?? "");
  const [greetingEs, setGreetingEs] = useState(settings.greetingEs ?? "");
  const [afterHours, setAfterHours] = useState(settings.afterHoursMessage ?? "");
  const [maxDuration, setMaxDuration] = useState(settings.maxCallDuration ?? 600);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Voice agent</h1>
        <p className="text-sm text-muted-foreground">Configure how your AI answers calls.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Greeting (English)</label>
            <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Thank you for calling [Company Name]..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Greeting (Spanish)</label>
            <textarea value={greetingEs} onChange={(e) => setGreetingEs(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Gracias por llamar a..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">After-hours message</label>
            <textarea value={afterHours} onChange={(e) => setAfterHours(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Max call duration (seconds)</label>
            <input type="number" value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))} min={60} max={900} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button
            onClick={() => update.mutate({ settings: { greeting, greetingEs, afterHoursMessage: afterHours, maxCallDuration: maxDuration } })}
            disabled={update.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>

        {/* Simulate Call */}
        <div className="rounded-xl border border-dashed border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TestTube2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Test scenarios</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Simulate calls to test your AI agent configuration. Uses Retell test mode.</p>
          <div className="space-y-2">
            {SIMULATED_CALL_SCENARIOS.map((scenario) => (
              <div key={scenario.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{scenario.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{scenario.callerScript}</p>
                </div>
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
                  Run test
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
