"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useOrganization } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Phone,
  Briefcase,
  BarChart3,
  Settings,
  Zap,
  Users,
  CreditCard,
  Calendar,
  FileText,
  Mic,
  TestTube2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Call Log", href: "/dashboard/calls", icon: Phone },
  { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const settingsNavigation = [
  { name: "Company", href: "/dashboard/settings", icon: Settings },
  { name: "Pricing Matrix", href: "/dashboard/settings/pricing", icon: FileText },
  { name: "Voice Agent", href: "/dashboard/settings/voice", icon: Mic },
  { name: "Integrations", href: "/dashboard/settings/integrations", icon: Calendar },
  { name: "Team", href: "/dashboard/settings/team", icon: Users },
  { name: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { organization } = useOrganization();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <img src="/logo.png" alt="BlitzResponse" className="h-10 w-auto" />
      </div>

      {/* Company name */}
      {organization && (
        <div className="border-b border-border px-6 py-3">
          <p className="truncate text-sm font-medium text-foreground">
            {organization.name}
          </p>
          <p className="text-xs text-muted-foreground">Restoration Co.</p>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Main
        </div>
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {item.name === "Call Log" && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  3
                </span>
              )}
            </Link>
          );
        })}

        {/* Simulate Call button */}
        <button
          className="mt-2 flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
          onClick={() => {
            // TODO: Phase 3 — open simulate call modal
            alert("Simulate Call feature coming in Phase 3");
          }}
        >
          <TestTube2 className="h-4 w-4" />
          Simulate Call
        </button>

        {/* Settings section */}
        <div className="mb-2 mt-6 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Settings
        </div>
        {settingsNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: { avatarBox: "h-8 w-8" },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              Account
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Manage profile
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
