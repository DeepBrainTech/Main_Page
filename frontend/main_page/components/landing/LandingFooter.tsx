"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Landing 页脚
 */
export default function LandingFooter() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("beforeloginV2.footer");

  const footerLinks = [
    { key: "about", href: "#" },
    { key: "resources", href: "#" },
    { key: "help", href: "#" },
    { key: "contact", href: "#" },
    { key: "privacy", href: `/${locale}/privacy-policy` },
    { key: "terms", href: "#" },
  ];

  return (
    <footer className="border-t border-slate-200/70 bg-white/80 px-4 py-10 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {footerLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-sky-700"
            >
              {t(link.key)}
            </a>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">{t("copyright")}</p>
      </div>
    </footer>
  );
}
