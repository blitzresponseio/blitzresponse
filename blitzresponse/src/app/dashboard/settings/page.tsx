"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { useCompany } from "@/hooks/use-company";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { company, isLoading, refetch } = useCompany();
  const updateCompany = trpc.company.update.useMutation({
    onSuccess: () => {
      refetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("en");

  // Initialize form when company loads
  if (company && !name) {
    setName(company.name);
    setTimezone(company.timezone);
    setLanguage(company.defaultLanguage);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Company settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure your company profile and preferences.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Company name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Phoenix">Arizona (no DST)</option>
              <option value="Pacific/Honolulu">Hawaii (HT)</option>
              <option value="America/Anchorage">Alaska (AKT)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Default language
            </label>
            <p className="text-xs text-muted-foreground">
              AI agent will greet callers in this language by default, then detect and switch if needed.
            </p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-border">
            <button
              onClick={() =>
                updateCompany.mutate({
                  name,
                  timezone,
                  defaultLanguage: language as "en" | "es",
                })
              }
              disabled={updateCompany.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateCompany.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
