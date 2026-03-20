import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency for display */
export function formatCurrency(
  amount: number,
  options?: { compact?: boolean }
): string {
  if (options?.compact && amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format phone number for display */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const area = cleaned.slice(1, 4);
    const prefix = cleaned.slice(4, 7);
    const line = cleaned.slice(7);
    return `(${area}) ${prefix}-${line}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/** Format duration in seconds to human-readable string */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

/** Relative time (e.g., "3 hours ago", "just now") */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Emergency type to display color */
export function emergencyColor(type: string): string {
  const map: Record<string, string> = {
    WATER_DAMAGE: "text-blue-600 bg-blue-50",
    FIRE_SMOKE: "text-red-600 bg-red-50",
    MOLD: "text-green-600 bg-green-50",
    STORM: "text-violet-600 bg-violet-50",
    SEWAGE: "text-amber-600 bg-amber-50",
    OTHER: "text-gray-600 bg-gray-50",
  };
  return map[type] ?? map.OTHER;
}

/** Call status to badge styling */
export function statusBadge(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    IN_PROGRESS: { label: "In Progress", className: "bg-blue-100 text-blue-800" },
    COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800" },
    MISSED: { label: "Missed", className: "bg-red-100 text-red-800" },
    VOICEMAIL: { label: "Voicemail", className: "bg-amber-100 text-amber-800" },
    FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
    DROPPED: { label: "Dropped", className: "bg-orange-100 text-orange-800" },
    TRANSFERRED: { label: "Transferred", className: "bg-purple-100 text-purple-800" },
  };
  return map[status] ?? { label: status, className: "bg-gray-100 text-gray-800" };
}
