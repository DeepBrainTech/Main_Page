import { locales, type Locale } from "@/i18n-config";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

/**
 * Persist locale preference for next-intl middleware (same cookie name as default next-intl config).
 */
export function setNextLocaleCookie(locale: string): void {
  if (typeof document === "undefined") return;
  if (!locales.includes(locale as Locale)) return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${ONE_YEAR_SEC};SameSite=Lax${secure ? ";Secure" : ""}`;
}
