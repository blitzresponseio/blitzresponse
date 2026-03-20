import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/trpc/root";

/**
 * tRPC React hooks — use throughout client components.
 *
 * Example:
 *   const { data } = trpc.calls.list.useQuery({ page: 1 });
 *   const mutation = trpc.calls.updateStatus.useMutation();
 */
export const trpc = createTRPCReact<AppRouter>();
