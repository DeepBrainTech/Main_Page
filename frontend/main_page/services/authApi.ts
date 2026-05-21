import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

export interface CurrentUserProfile {
  username: string;
}

export interface AuthMeMembership {
  membership_plan: string;
  membership_expires_at: string | null;
  membership_billing_interval: string | null;
  membership_pending_plan: string | null;
  membership_pending_billing_interval: string | null;
  membership_pending_effective_at: string | null;
  stripe_subscription_id: string | null;
}

export async function fetchAuthMeMembership(): Promise<AuthMeMembership> {
  const res = await credentialedFetch(getApiUrl("/api/auth/me"), { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error("fetch_auth_me_failed");
  }
  const json = await res.json();
  return {
    membership_plan: (json?.membership_plan as string) ?? "free",
    membership_expires_at: (json?.membership_expires_at as string | null) ?? null,
    membership_billing_interval: (json?.membership_billing_interval as string | null) ?? null,
    membership_pending_plan: (json?.membership_pending_plan as string | null) ?? null,
    membership_pending_billing_interval: (json?.membership_pending_billing_interval as string | null) ?? null,
    membership_pending_effective_at: (json?.membership_pending_effective_at as string | null) ?? null,
    stripe_subscription_id: (json?.stripe_subscription_id as string | null) ?? null,
  };
}

export async function fetchCurrentUserProfile(): Promise<CurrentUserProfile> {
  const res = await credentialedFetch(getApiUrl("/api/auth/me"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_current_user_failed");
  const json = await res.json();
  if (!json?.username) {
    throw new Error("fetch_current_user_failed");
  }
  return { username: json.username as string };
}
