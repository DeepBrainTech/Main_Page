import { isSoundEffectsEnabled } from "@/lib/app-preferences";

/**
 * Play a UI sound only when the user has sound effects enabled in Settings.
 * Route all short UI / feedback audio through this helper so muting applies app-wide.
 */
export function playUiSound(src: string, volume = 0.8): void {
  if (typeof window === "undefined" || !isSoundEffectsEnabled()) return;
  const audio = new Audio(src);
  audio.volume = volume;
  void audio.play().catch(() => {
    // Browsers may block autoplay when not tied to a user gesture.
  });
}
