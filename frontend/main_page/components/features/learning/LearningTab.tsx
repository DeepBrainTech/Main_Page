"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import MentalMathAssessmentPanel from "@/components/features/learning/MentalMathAssessmentPanel";
import {
  generateMentalMathQuestion,
  MENTAL_MATH_SECRET_ORDER,
} from "@/config/mental-math-questions";
import { MENTAL_MATH_CATEGORY_ITEM_IDS, MENTAL_MATH_SHOP_GAME_MODE } from "@/config/mental-math-shop";
import { useMentalMathPractice } from "@/hooks/useMentalMathPractice";
import {
  fetchAssets,
  fetchMakingWholeSecretMedia,
  fetchShopInventory,
  fetchShopItems,
  redeemShopItem,
} from "@/services/userApi";
import type { MentalMathCategoryKey, MentalMathSecretKey } from "@/types/learning";

interface AssetCost {
  coins: number;
  diamonds: number;
  flowers: number;
}

export default function LearningTab() {
  const t = useTranslations("learning");
  const [showMentalMathCategories, setShowMentalMathCategories] = useState(false);
  const [showMakingWholeSecrets, setShowMakingWholeSecrets] = useState(false);
  const [selectedMentalMathCategory, setSelectedMentalMathCategory] = useState<MentalMathCategoryKey | null>(null);
  const [selectedSecretKey, setSelectedSecretKey] = useState<MentalMathSecretKey | null>(null);
  const [ownedLearningItemIds, setOwnedLearningItemIds] = useState<Set<string>>(new Set());
  const [categoryCosts, setCategoryCosts] = useState<Partial<Record<MentalMathCategoryKey, AssetCost>>>({});
  const [assetsBalance, setAssetsBalance] = useState<AssetCost>({ coins: 0, diamonds: 0, flowers: 0 });
  const [unlockTargetCategory, setUnlockTargetCategory] = useState<MentalMathCategoryKey | null>(null);
  const [pendingUnlockCategory, setPendingUnlockCategory] = useState<MentalMathCategoryKey | null>(null);
  const [secretMediaUrls, setSecretMediaUrls] = useState<string[]>([]);
  const [secretMediaLoading, setSecretMediaLoading] = useState(false);
  const [secretMediaError, setSecretMediaError] = useState<string | null>(null);

  const categoryKeys = [
    "assessment",
    "makingWhole",
    "breakIntoParts",
    "rearrange",
    "roundAndAdjust",
    "leftToRightFlow",
  ] as const;
  const makingWholeSecretKeys = [
    "secret1",
    "secret2",
    "secret3",
    "secret4",
    "secret5",
    "secret6",
    "secret7",
    "secret8",
    "secret9",
    "secret10",
  ] as const;
  const lockableCategoryKeys = [
    "makingWhole",
    "breakIntoParts",
    "rearrange",
    "roundAndAdjust",
    "leftToRightFlow",
  ] as const;
  const practice = useMentalMathPractice({
    generateQuestion: () => (selectedSecretKey ? generateMentalMathQuestion(selectedSecretKey) : null),
    milestoneSize: 10,
  });

  useEffect(() => {
    if (!showMentalMathCategories) {
      return;
    }
    let cancelled = false;

    const loadShopState = async () => {
      try {
        const [items, inventory, assets] = await Promise.all([
          fetchShopItems(MENTAL_MATH_SHOP_GAME_MODE),
          fetchShopInventory(),
          fetchAssets(),
        ]);
        if (cancelled) {
          return;
        }
        const nextCosts: Partial<Record<MentalMathCategoryKey, AssetCost>> = {};
        (Object.keys(MENTAL_MATH_CATEGORY_ITEM_IDS) as MentalMathCategoryKey[]).forEach((categoryKey) => {
          const itemId = MENTAL_MATH_CATEGORY_ITEM_IDS[categoryKey];
          if (!itemId) {
            return;
          }
          nextCosts[categoryKey] = {
            coins: items[itemId]?.cost?.coins ?? 0,
            diamonds: items[itemId]?.cost?.diamonds ?? 0,
            flowers: items[itemId]?.cost?.flowers ?? 0,
          };
        });
        setCategoryCosts(nextCosts);
        setOwnedLearningItemIds(new Set(inventory.filter((item) => item.quantity > 0).map((item) => item.item_id)));
        setAssetsBalance({
          coins: assets.coins ?? 0,
          diamonds: assets.diamonds ?? 0,
          flowers: assets.flowers ?? 0,
        });
      } catch {
        setCategoryCosts({});
        setOwnedLearningItemIds(new Set());
        setAssetsBalance({ coins: 0, diamonds: 0, flowers: 0 });
      }
    };

    void loadShopState();
    return () => {
      cancelled = true;
    };
  }, [showMentalMathCategories]);

  useEffect(() => {
    if (!selectedSecretKey) {
      setSecretMediaUrls([]);
      setSecretMediaLoading(false);
      setSecretMediaError(null);
      return;
    }

    let cancelled = false;
    const loadSecretMedia = async () => {
      setSecretMediaLoading(true);
      setSecretMediaError(null);
      try {
        const data = await fetchMakingWholeSecretMedia(selectedSecretKey);
        if (cancelled) {
          return;
        }
        setSecretMediaUrls(data.urls ?? []);
      } catch {
        if (cancelled) {
          return;
        }
        setSecretMediaUrls([]);
        setSecretMediaError("load_failed");
      } finally {
        if (!cancelled) {
          setSecretMediaLoading(false);
        }
      }
    };

    void loadSecretMedia();
    return () => {
      cancelled = true;
    };
  }, [selectedSecretKey]);

  const isCategoryUnlocked = (key: MentalMathCategoryKey) => {
    if (key === "assessment") {
      return true;
    }
    if (!(lockableCategoryKeys as readonly MentalMathCategoryKey[]).includes(key)) {
      return true;
    }
    const itemId = MENTAL_MATH_CATEGORY_ITEM_IDS[key];
    if (!itemId) {
      return false;
    }
    return ownedLearningItemIds.has(itemId);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  };

  const handleBackToMath = () => {
    setShowMentalMathCategories(false);
    setShowMakingWholeSecrets(false);
    setSelectedMentalMathCategory(null);
    setSelectedSecretKey(null);
    practice.reset();
  };

  const handleBackToMentalMath = () => {
    setShowMakingWholeSecrets(false);
    setSelectedMentalMathCategory(null);
    setSelectedSecretKey(null);
    practice.reset();
  };

  const handleSelectSecret = (key: MentalMathSecretKey) => {
    setSelectedSecretKey(key);
    practice.reset();
  };

  const handleUnlockCategory = async () => {
    if (!unlockTargetCategory) {
      return;
    }
    const key = unlockTargetCategory;
    const itemId = MENTAL_MATH_CATEGORY_ITEM_IDS[key];
    if (!itemId) {
      return;
    }
    try {
      setPendingUnlockCategory(key);
      const redeemed = await redeemShopItem(itemId, MENTAL_MATH_SHOP_GAME_MODE);
      setOwnedLearningItemIds((prev) => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
      setAssetsBalance({
        coins: redeemed.assets?.coins ?? assetsBalance.coins,
        diamonds: redeemed.assets?.diamonds ?? assetsBalance.diamonds,
        flowers: redeemed.assets?.flowers ?? assetsBalance.flowers,
      });
      setUnlockTargetCategory(null);
    } catch {
      alert(t("unlock.failed"));
    } finally {
      setPendingUnlockCategory(null);
    }
  };

  const handleOpenMentalMathCategory = (key: MentalMathCategoryKey) => {
    if (key === "makingWhole") {
      if (!isCategoryUnlocked(key)) {
        return;
      }
      setShowMakingWholeSecrets(true);
      setSelectedMentalMathCategory(null);
      setSelectedSecretKey(null);
      practice.reset();
      return;
    }

    if (!isCategoryUnlocked(key)) {
      return;
    }

    setSelectedMentalMathCategory(key);
  };

  const handleRetryCurrentSecret = () => {
    practice.start();
  };

  const handleGoToNextSecret = () => {
    if (!selectedSecretKey) {
      return;
    }
    const currentIndex = MENTAL_MATH_SECRET_ORDER.indexOf(selectedSecretKey);
    if (currentIndex < 0 || currentIndex >= MENTAL_MATH_SECRET_ORDER.length - 1) {
      return;
    }
    const nextKey = MENTAL_MATH_SECRET_ORDER[currentIndex + 1];
    setSelectedSecretKey(nextKey);
    practice.reset();
  };

  const hasNextSecret =
    selectedSecretKey !== null &&
    MENTAL_MATH_SECRET_ORDER.indexOf(selectedSecretKey) < MENTAL_MATH_SECRET_ORDER.length - 1;
  const unlockCost = unlockTargetCategory
    ? categoryCosts[unlockTargetCategory] ?? { coins: 0, diamonds: 0, flowers: 0 }
    : { coins: 0, diamonds: 0, flowers: 0 };
  const hasEnoughForUnlock =
    assetsBalance.coins >= unlockCost.coins &&
    assetsBalance.diamonds >= unlockCost.diamonds &&
    assetsBalance.flowers >= unlockCost.flowers;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>

      <section className="rounded-2xl bg-[#FFFFFF] p-5 shadow-md">
        {!showMentalMathCategories ? (
          <>
            <h3 className="mb-4 text-2xl font-semibold text-gray-800">{t("math")}</h3>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setShowMentalMathCategories(true)}
                className="flex w-52 flex-col items-center rounded-xl bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-32 w-full overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src="/learning/mental_math/mental_math.png"
                    alt={t("mentalMath")}
                    width={208}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="mt-2 text-1xl font-medium text-gray-800">{t("mentalMath")}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 inline-flex items-center gap-2 text-2xl font-semibold text-gray-800">
              <button
                type="button"
                onClick={handleBackToMath}
                className="transition hover:text-blue-700"
              >
                {t("math")}
              </button>
              <span className="text-gray-400">-</span>
              {!showMakingWholeSecrets ? (
                !selectedMentalMathCategory ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMentalMathCategory) {
                        setSelectedMentalMathCategory(null);
                      }
                    }}
                    className="transition hover:text-blue-700"
                  >
                    {t("mentalMath")}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedMentalMathCategory(null)}
                      className="transition hover:text-blue-700"
                    >
                      {t("mentalMath")}
                    </button>
                    <span className="text-gray-400">-</span>
                    <span>{t(`mentalMathCategories.${selectedMentalMathCategory}`)}</span>
                  </>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBackToMentalMath}
                    className="transition hover:text-blue-700"
                  >
                    {t("mentalMath")}
                  </button>
                  <span className="text-gray-400">-</span>
                  {!selectedSecretKey ? (
                    <span>{t("mentalMathCategories.makingWhole")}</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSecretKey(null);
                          practice.reset();
                        }}
                        className="transition hover:text-blue-700"
                      >
                        {t("mentalMathCategories.makingWhole")}
                      </button>
                      <span className="text-gray-400">-</span>
                      <span>{t(`makingWholeSecrets.${selectedSecretKey}`)}</span>
                    </>
                  )}
                </>
              )}
            </div>
            {!selectedSecretKey && !selectedMentalMathCategory ? (
              !showMakingWholeSecrets ? (
                <div className="flex flex-wrap gap-4">
                  {categoryKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (key !== "assessment" && !isCategoryUnlocked(key)) {
                          setUnlockTargetCategory(key);
                          return;
                        }
                        handleOpenMentalMathCategory(key);
                      }}
                      className="flex w-52 flex-col items-center rounded-xl bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative h-32 w-full overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src="/learning/mental_math/mental_math.png"
                          alt={t(`mentalMathCategories.${key}`)}
                          width={208}
                          height={128}
                          className={`h-full w-full object-cover transition ${
                            key !== "assessment" && !isCategoryUnlocked(key)
                              ? "scale-[1.02] blur-[1.5px] brightness-110"
                              : ""
                          }`}
                        />
                        {!isCategoryUnlocked(key) && key !== "assessment" && (
                          <>
                            <div className="absolute inset-0 bg-white/45" />
                            <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
                              {t("unlock.locked")}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="mt-2 text-center text-base font-medium text-gray-800">
                        {t(`mentalMathCategories.${key}`)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {makingWholeSecretKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectSecret(key)}
                      className="flex w-52 flex-col items-center rounded-xl bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="h-32 w-full overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src="/learning/mental_math/mental_math.png"
                          alt={t(`makingWholeSecrets.${key}`)}
                          width={208}
                          height={128}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="mt-2 text-center text-base font-medium text-gray-800">
                        {t(`makingWholeSecrets.${key}`)}
                      </span>
                    </button>
                  ))}
                </div>
              )
            ) : selectedMentalMathCategory ? (
              selectedMentalMathCategory === "assessment" ? (
                <MentalMathAssessmentPanel />
              ) : (
                <div className="rounded-xl bg-gray-50 p-5" />
              )
            ) : (
              <div className="rounded-xl bg-gray-50 p-5">
                {practice.phase === "ready" && (
                  <div className="space-y-4">
                    <h4 className="text-xl font-semibold text-gray-800">{t(`makingWholeSecrets.${selectedSecretKey}`)}</h4>
                    {secretMediaLoading && (
                      <p className="text-sm text-gray-500">{t("media.loading")}</p>
                    )}
                    {!secretMediaLoading && secretMediaError && (
                      <p className="text-sm text-red-600">{t("media.loadFailed")}</p>
                    )}
                    {!secretMediaLoading && !secretMediaError && secretMediaUrls.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {secretMediaUrls.map((url, index) => (
                          <div
                            key={`${selectedSecretKey}-${index}`}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                          >
                            <Image
                              src={url}
                              alt={`${t(`makingWholeSecrets.${selectedSecretKey}`)} ${index + 1}`}
                              width={720}
                              height={405}
                              unoptimized
                              className="h-auto w-full object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={practice.start}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                    >
                      {t("practice.startPractice")}
                    </button>
                  </div>
                )}

                {(practice.phase === "inProgress" || practice.phase === "questionResult") &&
                  practice.currentQuestion && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">{t("practice.questionNumber")}</p>
                        <p className="text-sm font-semibold text-gray-800">{practice.currentIndex}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">{t("practice.accuracy")}</p>
                        <p className="text-sm font-semibold text-gray-800">{practice.accuracy}%</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">{t("practice.avgTime")}</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {t("practice.seconds", { value: practice.averageSecondsPerQuestion })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">{t("practice.currentStreak")}</p>
                        <p className="text-sm font-semibold text-gray-800">{practice.currentStreak}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">{t("practice.elapsed")}</p>
                        <p className="text-sm font-semibold text-gray-800">{formatDuration(practice.elapsedSeconds)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("practice.progressNow", { current: practice.currentIndex })}
                    </p>
                    <h4 className="text-2xl font-semibold text-gray-800">{practice.currentQuestion.expression}</h4>
                    <div className="flex flex-col gap-3 sm:max-w-xs">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={practice.inputAnswer}
                        disabled={practice.phase === "questionResult"}
                        onChange={(event) => {
                          const value = event.target.value.trim();
                          if (/^-?\d*$/.test(value)) {
                            practice.setInputAnswer(value);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            practice.submitCurrentAnswer();
                          }
                        }}
                        placeholder={t("practice.answerPlaceholder")}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={practice.phase === "questionResult" ? practice.next : practice.submitCurrentAnswer}
                        disabled={practice.phase === "inProgress" && !practice.canSubmit}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {practice.phase === "questionResult" ? t("practice.nextQuestion") : t("practice.submit")}
                      </button>
                      {practice.phase === "inProgress" && (
                        <button
                          type="button"
                          onClick={practice.finishSession}
                          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                          {t("practice.finishSession")}
                        </button>
                      )}
                    </div>
                    {practice.phase === "questionResult" && (
                      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
                        <p
                          className={`text-lg font-semibold ${
                            practice.lastIsCorrect ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {practice.lastIsCorrect ? t("practice.correct") : t("practice.incorrect")}
                        </p>
                        <p className="text-gray-700">
                          {t("practice.yourAnswer", { answer: practice.lastSubmittedAnswer ?? "-" })}
                        </p>
                        <p className="text-gray-700">
                          {t("practice.correctAnswer", { answer: practice.lastCorrectAnswer ?? "-" })}
                        </p>
                        <p className="text-gray-700">
                          {t("practice.questionTime", { duration: practice.lastQuestionDurationSeconds })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {practice.phase === "milestone" && (
                  <div className="space-y-4">
                    <h4 className="text-xl font-semibold text-gray-800">{t("practice.milestoneTitle")}</h4>
                    <p className="text-gray-700">{t("practice.milestoneHint", { total: practice.answeredCount })}</p>
                    <p className="text-gray-700">
                      {t("practice.score", { score: practice.correctCount, total: practice.answeredCount })}
                    </p>
                    <p className="text-gray-700">{t("practice.accuracyLine", { value: practice.accuracy })}</p>
                    <p className="text-gray-700">
                      {t("practice.avgTimeLine", { value: practice.averageSecondsPerQuestion })}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={practice.continuePractice}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                      >
                        {t("practice.continuePractice")}
                      </button>
                      <button
                        type="button"
                        onClick={practice.finishSession}
                        className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100"
                      >
                        {t("practice.finishSession")}
                      </button>
                    </div>
                  </div>
                )}

                {practice.phase === "summary" && (
                  <div className="space-y-4">
                    <h4 className="text-xl font-semibold text-gray-800">{t("practice.sessionSummaryTitle")}</h4>
                    <p className="text-gray-700">
                      {t("practice.score", { score: practice.correctCount, total: practice.answeredCount })}
                    </p>
                    <p className="text-gray-700">{t("practice.accuracyLine", { value: practice.accuracy })}</p>
                    <p className="text-gray-700">
                      {t("practice.totalTime", { duration: formatDuration(practice.totalDurationSeconds) })}
                    </p>
                    <p className="text-gray-700">{t("practice.avgTimeLine", { value: practice.averageSecondsPerQuestion })}</p>
                    <p className="text-gray-700">{t("practice.bestStreak", { value: practice.bestStreak })}</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleRetryCurrentSecret}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                      >
                        {t("practice.retry")}
                      </button>
                      <button
                        type="button"
                        onClick={handleGoToNextSecret}
                        disabled={!hasNextSecret}
                        className="rounded-lg bg-gray-800 px-4 py-2 font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {t("practice.nextCategory")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {unlockTargetCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">{t("unlock.confirmTitle")}</h3>
            <p className="mt-2 text-sm text-gray-700">
              {t("unlock.confirmDescription", {
                category: t(`mentalMathCategories.${unlockTargetCategory}`),
              })}
            </p>

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-800">{t("unlock.currentAssets")}</p>
              <p className="mt-2 text-sm text-gray-700">
                {t("unlock.coinsLine", { count: assetsBalance.coins })}
              </p>
              <p className="text-sm text-gray-700">{t("unlock.diamondsLine", { count: assetsBalance.diamonds })}</p>
              <p className="text-sm text-gray-700">{t("unlock.flowersLine", { count: assetsBalance.flowers })}</p>
            </div>

            <div className="mt-3 rounded-lg bg-amber-50 p-3">
              <p className="text-sm font-medium text-gray-800">{t("unlock.requiredCost")}</p>
              <p className="mt-2 text-sm text-gray-700">{t("unlock.coinsLine", { count: unlockCost.coins })}</p>
              <p className="text-sm text-gray-700">
                {t("unlock.diamondsLine", { count: unlockCost.diamonds })}
              </p>
              <p className="text-sm text-gray-700">{t("unlock.flowersLine", { count: unlockCost.flowers })}</p>
            </div>

            {!hasEnoughForUnlock && (
              <p className="mt-3 text-sm font-medium text-red-600">{t("unlock.insufficientAssets")}</p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUnlockTargetCategory(null)}
                disabled={pendingUnlockCategory === unlockTargetCategory}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("unlock.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleUnlockCategory()}
                disabled={
                  pendingUnlockCategory === unlockTargetCategory || !hasEnoughForUnlock
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {pendingUnlockCategory === unlockTargetCategory ? t("unlock.unlocking") : t("unlock.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
