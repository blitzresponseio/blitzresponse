"use client";

import { trpc } from "@/lib/trpc-client";

/**
 * Hook to access the current authenticated company.
 * Caches aggressively — company data rarely changes mid-session.
 */
export function useCompany() {
  const query = trpc.company.getCurrent.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    company: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
