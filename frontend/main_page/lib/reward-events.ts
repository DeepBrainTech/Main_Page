export const REWARDS_UPDATED_EVENT = "main-page:rewards-updated";

export function notifyRewardsUpdated(sourceId?: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(REWARDS_UPDATED_EVENT, {
      detail: { sourceId },
    })
  );
}
