"use client";

import { useEffect, useMemo, useRef, useState } from "react";
 import { useTranslations } from "next-intl";
 
 type NBackMode = "grid" | "letter";
 
 interface NBackItem {
   mode: NBackMode;
   level: number;
   isMatch: boolean;
   history: string[];
   current: string;
 }
 
 interface MemoryNBackProps {
   onComplete: (score: number) => void;
 }
 
 function clampScore(value: number, min: number, max: number) {
   if (value < min) return min;
   if (value > max) return max;
   return value;
 }
 
 function generateSequence(level: number, mode: NBackMode, isMatch: boolean): NBackItem {
   const history: string[] = [];
   const pool =
     mode === "letter"
       ? ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]
       : Array.from({ length: 9 }, (_, i) => String(i));
 
   for (let i = 0; i < level; i += 1) {
     const index = Math.floor(Math.random() * pool.length);
     history.push(pool[index]);
   }
 
   let current = history[history.length - level];
 
   if (!isMatch) {
     let candidate = current;
     while (candidate === current && pool.length > 1) {
       const index = Math.floor(Math.random() * pool.length);
       candidate = pool[index];
     }
     current = candidate;
   }
 
   return {
     mode,
     level,
     isMatch,
     history,
     current,
   };
 }
 
 function buildFormalItems(): NBackItem[] {
   const levels: number[] = [];
   levels.push(...Array.from({ length: 5 }, () => 1));
   levels.push(...Array.from({ length: 10 }, () => 2));
   levels.push(...Array.from({ length: 3 }, () => 3));
   levels.push(...Array.from({ length: 2 }, () => 4));
 
   const items: NBackItem[] = [];
 
   levels.forEach((level, index) => {
     const mode: NBackMode = index % 2 === 0 ? "grid" : "letter";
     const isMatch = Math.random() < 0.5;
     items.push(generateSequence(level, mode, isMatch));
   });
 
   return items;
 }
 
 export default function MemoryNBack({ onComplete }: MemoryNBackProps) {
   const t = useTranslations("test.memory");
 
   const [phase, setPhase] = useState<"intro" | "practice" | "formal" | "result">("intro");
   const [practiceIndex, setPracticeIndex] = useState(0);
   const [practiceCompleted, setPracticeCompleted] = useState(false);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [correctCount, setCorrectCount] = useState(0);
   const [rawScore, setRawScore] = useState(0);
   const [ageNormScore, setAgeNormScore] = useState(0);
   const [percentileLikeScore, setPercentileLikeScore] = useState(0);
   const [displayScore, setDisplayScore] = useState(0);

  const [isFormalRunning, setIsFormalRunning] = useState(false);
  const [hasClickedMatch, setHasClickedMatch] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
   const practiceItems: NBackItem[] = useMemo(
     () => [
       generateSequence(1, "grid", true),
       generateSequence(1, "letter", false),
       generateSequence(2, "grid", true),
     ],
     []
   );
 
   const formalItems: NBackItem[] = useMemo(() => buildFormalItems(), []);
 
  const totalQuestions = formalItems.length;

  const handlePracticeAnswer = (answerIsMatch: boolean) => {
    const item = practiceItems[practiceIndex];
    if (answerIsMatch === item.isMatch) {
      setPracticeCompleted(true);
    }
    const next = practiceIndex + 1;
    if (next < practiceItems.length) {
      setPracticeIndex(next);
    }
  };

  const handleFormalMatchClick = () => {
    if (!isFormalRunning) return;
    setHasClickedMatch(true);
  };

  useEffect(() => {
    if (!isFormalRunning || phase !== "formal") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const item = formalItems[currentIndex];
    const clicked = hasClickedMatch;

    timerRef.current = setTimeout(() => {
      setCorrectCount((prev) => {
        const nextCorrect = prev + (item.isMatch && clicked ? 1 : 0);
        const isLast = currentIndex + 1 >= totalQuestions;
        if (isLast) {
          const computedRaw = nextCorrect;
          const computedAgeNorm = computedRaw;
          const computedPercentile = Math.round((computedRaw / totalQuestions) * 100);
          const computedDisplay = clampScore(computedPercentile, 0, 100);

          setRawScore(computedRaw);
          setAgeNormScore(computedAgeNorm);
          setPercentileLikeScore(computedPercentile);
          setDisplayScore(computedDisplay);
          onComplete(computedDisplay);
          setIsFormalRunning(false);
          setPhase("result");
        } else {
          setCurrentIndex((idx) => idx + 1);
          setHasClickedMatch(false);
        }
        return nextCorrect;
      });
    }, 1200);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    isFormalRunning,
    phase,
    formalItems,
    currentIndex,
    hasClickedMatch,
    onComplete,
    totalQuestions,
  ]);
 
  const renderSequence = (item: NBackItem) => {
    if (item.mode === "grid") {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium ${
                  String(i) === item.current
                    ? "border-[#5E81AC] bg-[#5E81AC] text-white animate-pulse"
                    : "border-gray-200 bg-gray-50 text-gray-400"
                }`}
              >
                {/* 仅高亮当前刺激所在位置 */}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {t("nBackHintGrid", { level: item.level })}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#5E81AC] bg-white text-2xl font-bold text-[#5E81AC] animate-pulse">
            {item.current}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {t("nBackHintLetter", { level: item.level })}
        </p>
      </div>
    );
  };
 
   if (phase === "intro") {
     return (
       <div className="rounded-xl bg-white p-6 shadow-md">
         <h4 className="mb-2 font-semibold text-gray-800">{t("nBackTitle")}</h4>
         <p className="mb-3 text-sm text-gray-600">{t("nBackIntro1")}</p>
         <p className="mb-3 text-sm text-gray-600">{t("nBackIntro2")}</p>
         <p className="mb-4 text-sm text-gray-600">{t("nBackIntro3")}</p>
         <button
           type="button"
           onClick={() => setPhase("practice")}
           className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
         >
           {t("startPractice")}
         </button>
       </div>
     );
   }
 
   if (phase === "practice") {
     const item = practiceItems[practiceIndex];
     return (
       <div className="rounded-xl bg-white p-6 shadow-md">
         <h4 className="mb-2 font-semibold text-gray-800">{t("nBackPracticeTitle")}</h4>
         <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#5E81AC]">
           {t("nBackPracticeBadge")}
         </p>
         <p className="mb-4 text-sm text-gray-600">{t("nBackPracticeDesc")}</p>
         <div className="mb-4">
           {renderSequence(item)}
         </div>
        <p className="mb-3 text-sm font-medium text-gray-700">
          {t("nBackQuestion", { level: item.level })}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handlePracticeAnswer(true)}
            className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
          >
            {t("answerSame")}
          </button>
          <button
            type="button"
            onClick={() => handlePracticeAnswer(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("answerDifferent")}
          </button>
        </div>
         <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
           <span>
             {t("practiceProgress", { current: practiceIndex + 1, total: practiceItems.length })}
           </span>
           <button
             type="button"
            onClick={() => {
              setCurrentIndex(0);
              setCorrectCount(0);
              setHasClickedMatch(false);
              setPhase("formal");
            }}
             disabled={!practiceCompleted}
             className="rounded-lg px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300 bg-emerald-500 hover:bg-emerald-600"
           >
             {t("startFormal")}
           </button>
         </div>
       </div>
     );
   }
 
   if (phase === "formal") {
     const item = formalItems[currentIndex];
     return (
       <div className="rounded-xl bg-white p-6 shadow-md">
         <h4 className="mb-2 font-semibold text-gray-800">{t("nBackTitle")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("nBackFormalDesc")}</p>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#5E81AC]">
          {t("nBackLevelLabel", { level: item.level })}
        </p>
        <div className="mb-4">
          {renderSequence(item)}
        </div>
        {isFormalRunning ? (
          <>
            <p className="mb-3 text-sm font-medium text-gray-700">
              {t("nBackQuestion", { level: item.level })}
            </p>
            <button
              type="button"
              onClick={handleFormalMatchClick}
              className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
            >
              {t("answerSame")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setCorrectCount(0);
              setHasClickedMatch(false);
              setIsFormalRunning(true);
            }}
            className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
          >
            {t("startFormal")}
          </button>
        )}
         <p className="mt-4 text-xs text-gray-500">
           {t("formalProgress", { current: currentIndex + 1, total: totalQuestions })}
         </p>
       </div>
     );
   }
 
   return (
     <div className="rounded-xl bg-white p-6 shadow-md">
       <h4 className="mb-2 font-semibold text-gray-800">{t("nBackResultTitle")}</h4>
       <p className="mb-4 text-sm text-gray-600">{t("nBackResultDesc")}</p>
       <div className="grid gap-2 sm:grid-cols-2">
         <div className="rounded-lg bg-gray-50 p-3">
           <p className="text-xs text-gray-500">{t("rawScoreLabel")}</p>
           <p className="text-lg font-semibold text-gray-800">{rawScore}</p>
         </div>
         <div className="rounded-lg bg-gray-50 p-3">
           <p className="text-xs text-gray-500">{t("ageNormScoreLabel")}</p>
           <p className="text-lg font-semibold text-gray-800">{ageNormScore}</p>
         </div>
         <div className="rounded-lg bg-gray-50 p-3">
           <p className="text-xs text-gray-500">{t("percentileLikeScoreLabel")}</p>
           <p className="text-lg font-semibold text-gray-800">{percentileLikeScore}</p>
         </div>
         <div className="rounded-lg bg-gray-50 p-3">
           <p className="text-xs text-gray-500">{t("displayScoreLabel")}</p>
           <p className="text-lg font-semibold text-[#5E81AC]">{displayScore}</p>
         </div>
       </div>
       <p className="mt-4 text-xs text-gray-500">{t("displayScoreHint")}</p>
     </div>
   );
 }

