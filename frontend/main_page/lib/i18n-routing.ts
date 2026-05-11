import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "@/i18n-config";

/**
 * Single routing config for middleware and next-intl navigation (locale prefix + cookie behavior).
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
