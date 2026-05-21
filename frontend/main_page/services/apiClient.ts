/**
 * Shared authenticated fetch helpers for user-facing API modules.
 */
import { getApiUrl } from "@/lib/api-config";

export const credentialedFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input as RequestInfo, { ...init, credentials: "include" });

/** User IANA timezone for check-in / task "today" boundaries. */
export function getUserTimezone(): string {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getAuthHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-User-Timezone": getUserTimezone(),
  };
}

export async function readApiErrorDetail(res: Response): Promise<string> {
  const j = await res.json().catch(() => ({}));
  const d = j?.detail;
  if (typeof d === "string") return d;
  return "request_failed";
}

export { getApiUrl };
