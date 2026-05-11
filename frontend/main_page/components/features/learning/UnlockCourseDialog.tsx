"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { notifyLearningAccessChanged } from "@/lib/learningUnlock";
import { notifyRewardsUpdated } from "@/lib/reward-events";
import {
  MENTAL_MATH_DIAMOND_LIFETIME_COST,
  MENTAL_MATH_DIAMOND_THREE_MONTH_COST,
} from "@/config/learningCommerce";
import { unlockMentalMathWithDiamonds } from "@/services/userApi";

type UnlockPlanId = "threeMonth" | "lifetime" | "premium";
type SelectedUnlockPlan = UnlockPlanId | null;

type UnlockCourseDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function UnlockCourseDialog({ open, onClose }: UnlockCourseDialogProps) {
  const t = useTranslations("learning.home.unlockDialog");
  const router = useRouter();
  const locale = useLocale();
  const [selectedPlan, setSelectedPlan] = useState<SelectedUnlockPlan>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setSelectedPlan(null);
    setConfirmError(null);
    setConfirmLoading(false);
  }, [open]);

  if (!open) {
    return null;
  }

  const goToMembership = () => {
    onClose();
    router.push(`/${locale}/membership`);
  };

  const handleConfirmDiamonds = async () => {
    if (selectedPlan !== "threeMonth" && selectedPlan !== "lifetime") return;
    setConfirmError(null);
    setConfirmLoading(true);
    try {
      await unlockMentalMathWithDiamonds(selectedPlan === "threeMonth" ? "three_month" : "lifetime");
      notifyRewardsUpdated();
      notifyLearningAccessChanged();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("insufficient_diamonds")) {
        setConfirmError(t("insufficientDiamonds"));
      } else if (msg.includes("already_lifetime_unlocked")) {
        setConfirmError(t("alreadyLifetimeUnlocked"));
      } else {
        setConfirmError(t("unlockFailed"));
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-dialog-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] rounded-3xl bg-white shadow-[0px_20px_40px_0px_rgba(0,0,0,0.20)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-md text-sky-700 transition hover:bg-sky-50 hover:opacity-80"
          aria-label={t("close")}
        >
          <span className="text-xl leading-none" aria-hidden>
            ×
          </span>
        </button>

        <div className="flex max-h-[min(711px,calc(100vh-2rem))] flex-col gap-6 overflow-y-auto px-8 pb-8 pt-10">
          <h2 id="unlock-dialog-title" className="pr-10 text-3xl font-semibold leading-10 text-sky-700">
            {t("title")}
          </h2>

          {confirmError ? (
            <div
              className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              <p className="min-w-0 flex-1 leading-5">{confirmError}</p>
              <button
                type="button"
                onClick={() => setConfirmError(null)}
                className="shrink-0 rounded-md p-0.5 text-red-700 transition hover:bg-red-100"
                aria-label={t("dismissAlert")}
              >
                <span className="block text-lg leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setSelectedPlan("threeMonth")}
              className={`rounded-2xl p-5 text-left transition outline outline-2 outline-offset-[-2px] ${
                selectedPlan === "threeMonth"
                  ? "outline-sky-700"
                  : "outline-gray-200 hover:outline-gray-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Image src="/dashboard/dimond.svg" alt="" width={20} height={20} className="h-5 w-5" aria-hidden />
                  <span className="text-2xl font-bold leading-9 text-sky-700">
                    {t("diamondPrice", { count: MENTAL_MATH_DIAMOND_THREE_MONTH_COST })}
                  </span>
                </div>
                <span className="rounded-lg bg-amber-100 px-3 py-1 text-sm font-semibold leading-5 text-amber-600">
                  {t("threeMonthBadge")}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold leading-7 text-sky-700">{t("threeMonthTitle")}</p>
              <p className="text-sm font-normal leading-5 text-sky-700">{t("threeMonthDescription")}</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan("lifetime")}
              className={`rounded-2xl p-5 text-left transition outline outline-2 outline-offset-[-2px] ${
                selectedPlan === "lifetime"
                  ? "outline-sky-700"
                  : "outline-gray-200 hover:outline-gray-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Image src="/dashboard/dimond.svg" alt="" width={20} height={20} className="h-5 w-5" aria-hidden />
                  <span className="text-2xl font-bold leading-9 text-sky-700">
                    {t("diamondPrice", { count: MENTAL_MATH_DIAMOND_LIFETIME_COST })}
                  </span>
                </div>
                <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold leading-5 text-sky-700">
                  {t("lifetimeBadge")}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold leading-7 text-sky-700">{t("lifetimeTitle")}</p>
              <p className="text-sm font-normal leading-5 text-sky-700">{t("lifetimeDescription")}</p>
            </button>
          </div>

          {(selectedPlan === "threeMonth" || selectedPlan === "lifetime") && (
            <button
              type="button"
              disabled={confirmLoading}
              onClick={() => void handleConfirmDiamonds()}
              className="h-10 w-full rounded-full bg-[#E45C44] text-base font-semibold text-indigo-50 transition hover:opacity-95 disabled:opacity-60"
            >
              {confirmLoading ? "…" : t("confirm")}
            </button>
          )}

          <div className="relative flex items-center py-1">
            <div className="h-px flex-1 border-t border-gray-300" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-white px-3 text-sm font-normal text-sky-700">
              {t("or")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedPlan("premium")}
            className={`w-full rounded-2xl bg-gradient-to-br from-rose-50 via-rose-50 to-yellow-50 p-5 text-left transition outline outline-2 outline-offset-[-2px] ${
              selectedPlan === "premium"
                ? "outline-sky-700"
                : "outline-[#FFDD65] hover:outline-[#FFDD65]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Image
                src="/membership/crown.svg"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 object-contain"
                aria-hidden
              />
              <span className="bg-gradient-to-r from-sky-700 to-blue-600 bg-clip-text text-2xl font-bold leading-9 text-transparent">
                {t("premiumLabel")}
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold leading-7 text-sky-700">{t("premiumTitle")}</p>
            <p className="text-sm font-normal leading-5 text-sky-700">{t("premiumDescription")}</p>
          </button>

          {selectedPlan === "premium" && (
            <button
              type="button"
              onClick={goToMembership}
              className="relative mx-auto flex h-10 w-full max-w-96 items-center justify-center rounded-full bg-[#FFD179] text-base font-semibold text-sky-700 transition hover:opacity-95"
            >
              {t("upgradePlan")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
