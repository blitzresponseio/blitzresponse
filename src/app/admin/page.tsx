"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, Phone, Bot, Check, X, AlertTriangle, Loader2,
  RefreshCw, PhoneCall, Settings, Wrench, ExternalLink, Copy,
} from "lucide-react";
import { cn, formatPhone, timeAgo } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  retellAgentId: string | null;
  twilioSid: string | null;
  subscriptionStatus: string;
  defaultLanguage: string;
  onboardingComplete: boolean;
  createdAt: string;
  _count: { users: number; calls: number; jobs: number; teamMembers: number };
  callsThisMonth: number;
  hasPricing: boolean;
  isFullyConfigured: boolean;
}

async function adminApi(body: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Admin API failed");
  }
  return res.json();
}

export default function AdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState("");
  const [manualAgentId, setManualAgentId] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi({ action: "list_companies" });
      setCompanies(data.companies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  async function handleProvision(companyId: string) {
    setActionLoading(companyId);
    setActionResult(null);
    try {
      const result = await adminApi({
        action: "provision",
        companyId,
        areaCode: areaCode || undefined,
      });
      if (result.success) {
        setActionResult(`✅ Provisioned: ${result.phoneNumber} (Agent: ${result.agentId})`);
      } else {
        setActionResult(`⚠️ Partial: ${result.error}${result.agentId ? ` (Agent created: ${result.agentId})` : ""}`);
      }
      loadCompanies();
    } catch (err) {
      setActionResult(`❌ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTestCall(companyId: string) {
    setActionLoading(`test-${companyId}`);
    try {
      const result = await adminApi({ action: "test_call", companyId });
      if (result.webCallLink) {
        window.open(result.webCallLink, "_blank");
        setActionResult("✅ Test call opened in new tab");
      }
    } catch (err) {
      setActionResult(`❌ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManualSet(companyId: string) {
    setActionLoading(`manual-${companyId}`);
    try {
      await adminApi({
        action: "manual_set_agent",
        companyId,
        retellAgentId: manualAgentId || undefined,
        phone: manualPhone || undefined,
      });
      setActionResult("✅ Manual config saved");
      setManualAgentId("");
      setManualPhone("");
      setSelectedCompany(null);
      loadCompanies();
    } catch (err) {
      setActionResult(`❌ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdateAgent(companyId: string) {
    setActionLoading(`update-${companyId}`);
    try {
      await adminApi({ action: "update_agent", companyId });
      setActionResult("✅ Agent prompt updated");
    } catch (err) {
      setActionResult(`❌ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setActionLoading(null);
    }
  }

  if (error === "Forbidden — super admin access required" || error === "Forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-semibold text-gray-900">Access denied</p>
          <p className="text-sm text-gray-500">Add your Clerk user ID to SUPER_ADMIN_CLERK_ID in .env</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
              <Wrench className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">BlitzResponse Admin</h1>
              <p className="text-xs text-gray-500">Internal operations panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
              <span className="text-xs text-gray-500">Area code:</span>
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="auto"
                className="w-16 border-none bg-transparent text-sm outline-none"
              />
            </div>
            <button
              onClick={loadCompanies}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Action result toast */}
      {actionResult && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            actionResult.startsWith("✅") ? "border-green-200 bg-green-50 text-green-800" :
            actionResult.startsWith("⚠️") ? "border-amber-200 bg-amber-50 text-amber-800" :
            "border-red-200 bg-red-50 text-red-800"
          )}>
            {actionResult}
            <button onClick={() => setActionResult(null)} className="ml-3 text-xs underline">dismiss</button>
          </div>
        </div>
      )}

      {/* Companies list */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">No companies yet. They'll appear here when users sign up.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {companies.map((company) => (
              <div key={company.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Company header */}
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-gray-900">{company.name}</h2>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        company.isFullyConfigured ? "bg-green-100 text-green-800" :
                        company.retellAgentId ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {company.isFullyConfigured ? "Live" : company.retellAgentId ? "Partial" : "Needs setup"}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {company.subscriptionStatus}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {company.slug} · Created {timeAgo(new Date(company.createdAt))} · {company.defaultLanguage.toUpperCase()}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 text-center">
                    <div><p className="text-lg font-bold text-gray-900">{company.callsThisMonth}</p><p className="text-xs text-gray-500">Calls/mo</p></div>
                    <div><p className="text-lg font-bold text-gray-900">{company._count.jobs}</p><p className="text-xs text-gray-500">Jobs</p></div>
                    <div><p className="text-lg font-bold text-gray-900">{company._count.teamMembers}</p><p className="text-xs text-gray-500">Team</p></div>
                  </div>
                </div>

                {/* Status row */}
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Bot className={cn("h-3.5 w-3.5", company.retellAgentId ? "text-green-600" : "text-gray-400")} />
                    <span className={company.retellAgentId ? "text-green-700" : "text-gray-500"}>
                      {company.retellAgentId ? `Agent: ${company.retellAgentId.slice(0, 12)}...` : "No agent"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className={cn("h-3.5 w-3.5", company.phone ? "text-green-600" : "text-gray-400")} />
                    <span className={company.phone ? "text-green-700" : "text-gray-500"}>
                      {company.phone ? formatPhone(company.phone) : "No phone"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {company.hasPricing ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
                    <span className={company.hasPricing ? "text-green-700" : "text-gray-500"}>
                      {company.hasPricing ? "Pricing uploaded" : "No pricing"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {company.onboardingComplete ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
                    <span className={company.onboardingComplete ? "text-green-700" : "text-gray-500"}>
                      {company.onboardingComplete ? "Onboarding done" : "Onboarding incomplete"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 px-6 py-3 flex items-center gap-2">
                  {!company.retellAgentId ? (
                    <button
                      onClick={() => handleProvision(company.id)}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === company.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      Auto-provision (Retell + Twilio)
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTestCall(company.id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {actionLoading === `test-${company.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneCall className="h-3.5 w-3.5" />}
                        Test call
                      </button>
                      <button
                        onClick={() => handleUpdateAgent(company.id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {actionLoading === `update-${company.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Sync prompt
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setSelectedCompany(selectedCompany === company.id ? null : company.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Manual config
                  </button>
                </div>

                {/* Manual config panel */}
                {selectedCompany === company.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <p className="text-xs font-medium text-gray-700 mb-3">Manually set agent ID + phone (paste from Retell dashboard)</p>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Retell Agent ID</label>
                        <input
                          type="text"
                          value={manualAgentId}
                          onChange={(e) => setManualAgentId(e.target.value)}
                          placeholder="agent_xxxxxxxxxxxx"
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Phone number</label>
                        <input
                          type="text"
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          placeholder="+15551234567"
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleManualSet(company.id)}
                        disabled={!!actionLoading}
                        className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {actionLoading === `manual-${company.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
