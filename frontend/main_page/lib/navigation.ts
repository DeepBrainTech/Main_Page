import { locales } from "@/i18n-config";

const RETURN_PATH_BASE = "https://navigation.invalid";
const APP_PATH = /^\/(dashboard|braingames|leaderboard|learning|test|shop|membership)(\/|$)/;

/** Accept only local app destinations, excluding auth pages and external redirects. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) {
    return "/dashboard";
  }

  try {
    const url = new URL(value, RETURN_PATH_BASE);
    if (url.origin !== RETURN_PATH_BASE) return "/dashboard";
    const localePrefix = new RegExp(`^/(${locales.join("|")})(?=/|$)`);
    const pathname = url.pathname.replace(localePrefix, "");
    const decodedPath = decodeURIComponent(pathname);
    if (!APP_PATH.test(pathname) || /[\\\s]/.test(decodedPath) || decodedPath.startsWith("//")) {
      return "/dashboard";
    }
    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

/** Carry the destination through sign-in, registration, and password recovery. */
export function authHref(path: string, returnTo?: string | null): string {
  const url = new URL(path, RETURN_PATH_BASE);
  if (returnTo) url.searchParams.set("returnTo", safeReturnTo(returnTo));
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Use at interaction time so language changes preserve the latest query and anchor. */
export function currentHref(pathname: string): string {
  return `${pathname}${window.location.search}${window.location.hash}`;
}
