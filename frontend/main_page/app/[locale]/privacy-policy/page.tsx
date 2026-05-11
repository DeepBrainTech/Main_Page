import { Link } from "@/lib/i18n-navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n-config";
import { locales } from "@/i18n-config";
import privacyHtml from "./privacy.html";

/** Normalize line endings so SSR and client bundles match (avoids CRLF vs LF hydration errors). */
function normalizeEmbeddedHtml(html: string): string {
  return html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : "en";
  const t = await getTranslations({ locale, namespace: "privacyPolicy" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `/${locale}/privacy-policy`,
    },
  };
}

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : "en";
  const t = await getTranslations({ locale, namespace: "privacyPolicy" });
  const embeddedHtml = normalizeEmbeddedHtml(privacyHtml);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <p className="mb-6">
          <Link
            href="/"
            className="text-sm font-semibold text-sky-700 underline-offset-4 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            {t("backToHome")}
          </Link>
        </p>
        <div
          className="privacy-policy-html rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          dangerouslySetInnerHTML={{ __html: embeddedHtml }}
        />
      </div>
    </div>
  );
}
