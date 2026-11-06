"use client";

import { useSearchParams } from "next/navigation";
import { authHref, safeReturnTo } from "@/lib/navigation";

export function useAuthNavigation() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  return {
    destination: safeReturnTo(returnTo),
    authHref: (path: string) => authHref(path, returnTo),
  };
}
