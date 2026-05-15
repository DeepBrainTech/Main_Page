"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { locales, type Locale } from "@/i18n-config";
import { SUPPORT_CONTACT_EMAIL } from "@/constants/support";
import { readAppPreferences, setSoundEffectsEnabled, writeAppPreferences } from "@/lib/app-preferences";
import { Link, usePathname, useRouter } from "@/lib/i18n-navigation";
import { setNextLocaleCookie } from "@/lib/locale-cookie";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function SettingsRowIcon({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_1.16px_2.32px_-1.16px_rgba(0,0,0,0.10),0px_1.16px_3.48px_0px_rgba(0,0,0,0.10)]"
      aria-hidden
    >
      {children}
    </div>
  );
}

function IconChevronRight() {
  return (
    <svg className="h-6 w-6 shrink-0 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/**
 * Settings modal: preferences (sound, language), support (contact). Opened from the header gear control.
 */
export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const t = useTranslations("settings");
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = (params?.locale as string) ?? "en";

  const [soundOn, setSoundOn] = useState(true);
  const [draftLocale, setDraftLocale] = useState<string>(currentLocale);

  useEffect(() => {
    if (!open) return;
    setSoundOn(readAppPreferences().soundEffects);
    setDraftLocale(currentLocale);
  }, [open, currentLocale]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleSave = () => {
    writeAppPreferences({ soundEffects: soundOn });
    const next = draftLocale as Locale;
    if (locales.includes(next)) {
      setNextLocaleCookie(next);
      if (next !== currentLocale) {
        router.push(pathname || "/", { locale: next });
      }
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overscroll-none bg-black/25 p-3 font-app-body sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative isolate flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[454px] min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-[0px_20px_30px_0px_rgba(0,0,0,0.15)] sm:max-h-[calc(100dvh-3rem)]"
        role="dialog"
        aria-label={t("title")}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full text-sky-700 transition-colors hover:bg-sky-50"
          aria-label={t("close")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-8 pb-8 pt-10">
          <h2 className="mb-8 text-center text-3xl font-semibold leading-10 text-sky-700">{t("title")}</h2>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-medium leading-7 text-sky-700">{t("preferences")}</h3>

            <div className="flex flex-col gap-2">
              <div className="flex min-h-20 items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SettingsRowIcon>
                    <img src="/setting/sound.svg" alt="" width={20} height={20} className="h-5 w-5" />
                  </SettingsRowIcon>
                  <span className="text-base font-medium leading-5 text-sky-700">{t("soundEffects")}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundOn}
                  aria-label={t("soundEffects")}
                  onClick={() =>
                    setSoundOn((v) => {
                      const next = !v;
                      setSoundEffectsEnabled(next);
                      return next;
                    })
                  }
                  className={`relative flex h-8 w-[3.25rem] shrink-0 items-center rounded-full p-[2px] transition-colors ${
                    soundOn ? "justify-end bg-green-500" : "justify-start bg-zinc-500/20"
                  }`}
                >
                  <span className="pointer-events-none h-6 w-6 rounded-full bg-white shadow-[0px_0.8px_1.6px_0px_rgba(0,0,0,0.20),0px_0.08px_0.24px_0px_rgba(0,0,0,0.10)] ring-1 ring-black/5" />
                </button>
              </div>

              <div className="flex min-h-20 items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SettingsRowIcon>
                    <img src="/setting/language.svg" alt="" width={20} height={20} className="h-5 w-5" />
                  </SettingsRowIcon>
                  <span className="text-base font-medium leading-5 text-sky-700">{t("systemLanguage")}</span>
                </div>
                <div
                  className="flex shrink-0 gap-1 rounded-full bg-slate-200 p-1"
                  role="group"
                  aria-label={t("systemLanguage")}
                >
                  <button
                    type="button"
                    onClick={() => setDraftLocale("en")}
                    className={`relative min-w-[3rem] rounded-full px-3 py-2 text-sm font-medium leading-5 transition-colors ${
                      draftLocale === "en" ? "bg-white text-slate-900 shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.10),0px_1px_3px_0px_rgba(0,0,0,0.10)]" : "text-slate-600"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftLocale("zh")}
                    className={`relative min-w-[3rem] rounded-full px-3 py-2 text-sm font-medium leading-5 transition-colors ${
                      draftLocale === "zh" ? "bg-white text-slate-900 shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.10),0px_1px_3px_0px_rgba(0,0,0,0.10)]" : "text-slate-600"
                    }`}
                  >
                    中文
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <h3 className="text-lg font-medium leading-7 text-sky-700">{t("support")}</h3>
            <a
              href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
              className="flex min-h-20 items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3 text-left no-underline outline-none ring-sky-300 transition-colors hover:bg-sky-100/90 focus-visible:ring-2"
              aria-label={t("contactUsAria")}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <SettingsRowIcon>
                  <img src="/setting/contactus.svg" alt="" width={20} height={20} className="h-5 w-5" />
                </SettingsRowIcon>
                <div className="min-w-0">
                  <div className="text-base font-medium leading-5 text-sky-700">{t("contactUs")}</div>
                  <div className="mt-1 text-sm font-medium leading-4 text-sky-700/85">{t("contactUsSubtitle")}</div>
                </div>
              </div>
              <IconChevronRight />
            </a>

            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-2 text-center text-sm font-normal leading-7 text-[#5E5E5E]"
              aria-label={t("legalLinksAria")}
            >
              <span
                className="cursor-default select-none"
                title={t("legalLinkComingSoon")}
                aria-disabled="true"
              >
                {t("termsOfService")}
              </span>
              <Link
                href="/privacy-policy"
                onClick={onClose}
                className="text-[#5E5E5E] no-underline hover:text-[#5E5E5E]"
              >
                {t("privacyPolicy")}
              </Link>
              <span
                className="cursor-default select-none"
                title={t("legalLinkComingSoon")}
                aria-disabled="true"
              >
                {t("cookiePolicy")}
              </span>
            </nav>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-10 flex h-14 w-full items-center justify-center rounded-full bg-[#E45C44] text-lg font-semibold leading-7 text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] transition-colors hover:bg-[#d14d38]"
          >
            {t("saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
