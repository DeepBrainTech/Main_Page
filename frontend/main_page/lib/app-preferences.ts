/**
 * Client-side app preferences (localStorage). Extend the shape when adding new toggles.
 */

const STORAGE_KEY = "dbt_app_prefs_v1";

export type AppPreferences = {
  soundEffects: boolean;
};

const defaults: AppPreferences = {
  soundEffects: true,
};

function parse(raw: string | null): AppPreferences {
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      soundEffects: typeof parsed.soundEffects === "boolean" ? parsed.soundEffects : defaults.soundEffects,
    };
  } catch {
    return { ...defaults };
  }
}

export function readAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return { ...defaults };
  return parse(localStorage.getItem(STORAGE_KEY));
}

export function writeAppPreferences(prefs: AppPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isSoundEffectsEnabled(): boolean {
  return readAppPreferences().soundEffects;
}

/** Persist sound toggle immediately so all UI audio respects it without pressing Save. */
export function setSoundEffectsEnabled(enabled: boolean): void {
  const prev = readAppPreferences();
  writeAppPreferences({ ...prev, soundEffects: enabled });
}
