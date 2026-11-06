"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Keep navigable filters in the URL so refresh, sharing, and history agree. */
export function useUrlFilter<T extends string>(key: string, values: readonly T[], fallback: T) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get(key);
  const value = values.find((candidate) => candidate === raw) ?? fallback;

  const setValue = (next: T) => {
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    const href = `${url.pathname}${url.search}${url.hash}`;
    if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      router.push(href, { scroll: false });
    }
  };

  return [value, setValue] as const;
}
