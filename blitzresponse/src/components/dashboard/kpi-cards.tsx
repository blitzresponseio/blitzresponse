"use client";

import {
  Phone,
  Briefcase,
  DollarSign,
  TrendingUp,
  PhoneMissed,
  CheckCircle2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface KPIData {
  callsToday: number;
  callsThisMonth: number;
  jobsThisMonth: number;
  estimatedRevenueSaved: number;
  answeredRate: number;
  missedCallsThisMonth: number;
  usingDefaultAvgValue: boolean;
}

export function KPICards({ data }: { data: KPIData }) {
  const cards = [
    {
      label: "Calls Today",
      value: data.callsToday.toString(),
      icon: Phone,
      color: "text-blue-600 bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Jobs Captured",
      value: data.jobsThisMonth.toString(),
      subtitle: "this month",
      icon: Briefcase,
      color: "text-green-600 bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Revenue Saved",
      value: formatCurrency(data.estimatedRevenueSaved, { compact: true }),
      subtitle: data.usingDefaultAvgValue ? "est. (default avg)" : "est.",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Answer Rate",
      value: `${data.answeredRate}%`,
      icon: data.answeredRate >= 95 ? CheckCircle2 : TrendingUp,
      color:
        data.answeredRate >= 95
          ? "text-green-600 bg-green-50"
          : "text-amber-600 bg-amber-50",
      iconColor:
        data.answeredRate >= 95 ? "text-green-600" : "text-amber-600",
    },
    {
      label: "Missed Calls",
      value: data.missedCallsThisMonth.toString(),
      subtitle: "this month",
      icon: PhoneMissed,
      color:
        data.missedCallsThisMonth === 0
          ? "text-green-600 bg-green-50"
          : "text-red-600 bg-red-50",
      iconColor:
        data.missedCallsThisMonth === 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Total Calls",
      value: data.callsThisMonth.toString(),
      subtitle: "this month",
      icon: Phone,
      color: "text-violet-600 bg-violet-50",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {card.label}
            </p>
            <div className={cn("rounded-lg p-1.5", card.color)}>
              <card.icon className={cn("h-3.5 w-3.5", card.iconColor)} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {card.value}
          </p>
          {card.subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {card.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
