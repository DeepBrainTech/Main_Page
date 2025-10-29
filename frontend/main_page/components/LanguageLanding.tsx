"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { defaultLocale, type Locale } from "@/i18n-config";

type LanguageOption = {
  locale: Locale;
  title: string;
  description: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    locale: "en",
    title: "English",
    description: "Continue in English (default)",
  },
  {
    locale: "zh",
    title: "中文",
    description: "切换为中文界面",
  },
];

export default function LanguageLanding() {
  const router = useRouter();

  const sortedOptions = useMemo(() => {
    return [...LANGUAGE_OPTIONS].sort((a, b) => {
      if (a.locale === defaultLocale) return -1;
      if (b.locale === defaultLocale) return 1;
      return 0;
    });
  }, []);

  const handleSelect = (locale: Locale) => {
    router.push(`/${locale}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-2xl transition-shadow dark:bg-zinc-900">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Welcome
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
            Choose your language
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Pick a language to continue. You can change it later from the top
            right corner of every page.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {sortedOptions.map((option) => {
            const isDefault = option.locale === defaultLocale;

            return (
              <button
                key={option.locale}
                onClick={() => handleSelect(option.locale)}
                className={[
                  "flex h-36 flex-col items-start justify-between rounded-2xl border p-6 text-left transition",
                  "border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-700",
                  "dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:shadow-zinc-900/40",
                  isDefault
                    ? "ring-2 ring-offset-2 ring-zinc-900 ring-offset-white dark:ring-zinc-200 dark:ring-offset-zinc-900"
                    : "",
                ].join(" ")}
              >
                <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
                  {option.title}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {option.description}
                </span>
              </button>
            );
          })}
        </section>

        <footer className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
          Default language: English
        </footer>
      </div>
    </div>
  );
}
