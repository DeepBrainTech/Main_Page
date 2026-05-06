/**
 * Mental Math bundle access types and mapping from GET /api/user/learning/mental-math/bundle-access.
 * Authoritative state lives on the server; no localStorage.
 */

export type LearningBundleBadge = "free" | "timed" | "full" | "premium";

export type LearningAccess = {
  bundleUnlocked: boolean;
  badge: LearningBundleBadge;
  daysLeft: number | null;
  expiresAt: Date | null;
};

export const defaultLearningAccess: LearningAccess = {
  bundleUnlocked: false,
  badge: "free",
  daysLeft: null,
  expiresAt: null,
};

export type MentalMathBundleAccessApi = {
  bundle_unlocked: boolean;
  access_badge: "premium" | "timed" | "full" | "none";
  days_left: number | null;
  expires_at: string | null;
  diamonds?: number;
};

export function mapBundleAccessToLearningAccess(data: MentalMathBundleAccessApi): LearningAccess {
  const badgeMap: Record<string, LearningBundleBadge> = {
    premium: "premium",
    timed: "timed",
    full: "full",
    none: "free",
  };
  return {
    bundleUnlocked: data.bundle_unlocked,
    badge: badgeMap[data.access_badge] ?? "free",
    daysLeft: data.days_left,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
  };
}

export function notifyLearningAccessChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event("learning-unlock-change"));
}
