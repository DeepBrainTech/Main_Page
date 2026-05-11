import { defaultLocale, locales, type Locale } from "@/i18n-config";
import { redirect } from "@/lib/i18n-navigation";

export default async function HomeAliasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : defaultLocale;
  redirect({ href: "/dashboard", locale });
}
