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
   const [practiceMode, setPracticeMode] = useState<NBackMode>("grid");
   const [practiceLevel, setPracticeLevel] = useState(1);
   const [practiceRunning, setPracticeRunning] = useState(false);
   const [practiceStream, setPracticeStream] = useState<string[]>([]);
   const [practiceCurrent, setPracticeCurrent] = useState<string | null>(null);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [correctCount, setCorrectCount] = useState(0);
   const [rawScore, setRawScore] = useState(0);
   const [ageNormScore, setAgeNormScore] = useState(0);
   const [percentileLikeScore, setPercentileLikeScore] = useState(0);
   const [displayScore, setDisplayScore] = useState(0);

  const [isFormalRunning, setIsFormalRunning] = useState(false);
  const [hasClickedMatch, setHasClickedMatch] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
   const formalItems: NBackItem[] = useMemo(() => buildFormalItems(), []);
 
  const totalQuestions = formalItems.length;

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

  // 练习阶段：按顺序自动播放刺激流
  useEffect(() => {
    if (phase !== "practice" || !practiceRunning) {
      if (practiceTimerRef.current) {
        clearTimeout(practiceTimerRef.current);
        practiceTimerRef.current = null;
      }
      return;
    }
    const pool =
      practiceMode === "letter"
        ? ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]
        : Array.from({ length: 9 }, (_, i) => String(i));
    practiceTimerRef.current = setTimeout(() => {
      setPracticeStream((prev) => {
        const idx = prev.length;
        const n = practiceLevel;
        const canMatch = idx >= n;
        const shouldMatch = canMatch && Math.random() < 0.35;
        let next: string;
        if (shouldMatch) {
          next = prev[idx - n];
        } else {
          const base = pool[Math.floor(Math.random() * pool.length)];
          const forbid = canMatch ? prev[idx - n] : null;
          next =
            forbid && base === forbid
              ? pool[(pool.indexOf(base) + 1) % pool.length]
              : base;
        }
        setPracticeCurrent(next);
        return [...prev, next];
      });
    }, 900);
    return () => {
      if (practiceTimerRef.current) {
        clearTimeout(practiceTimerRef.current);
        practiceTimerRef.current = null;
      }
    };
  }, [phase, practiceRunning, practiceMode, practiceLevel, practiceStream.length]);
 
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
           onClick={() => {
             setPhase("practice");
             setPracticeStream([]);
             setPracticeCurrent(null);
             setPracticeRunning(false);
           }}
           className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
         >
           {t("startPractice")}
         </button>
       </div>
     );
   }
 
   if (phase === "practice") {
     const practiceItem: NBackItem = {
       mode: practiceMode,
       level: practiceLevel,
       isMatch: false,
       history: [],
       current: practiceCurrent ?? (practiceMode === "grid" ? "0" : "A"),
     };
     return (
       <div className="rounded-xl bg-white p-6 shadow-md">
         <h4 className="mb-2 font-semibold text-gray-800">{t("nBackPracticeTitle")}</h4>
         <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#5E81AC]">
           {t("nBackPracticeBadge")}
         </p>
         <p className="mb-4 text-sm text-gray-600">{t("nBackPracticeDesc")}</p>
         {/* 模式：图形 / 字母 */}
         <div className="mb-3 flex gap-2">
           <button
             type="button"
             onClick={() => {
               setPracticeMode("grid");
               setPracticeStream([]);
               setPracticeCurrent(null);
               setPracticeRunning(false);
             }}
             className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
               practiceMode === "grid"
                 ? "bg-[#5E81AC] text-white"
                 : "border border-gray-300 text-gray-600 hover:bg-gray-50"
             }`}
           >
             {t("practiceModeGrid")}
           </button>
           <button
             type="button"
             onClick={() => {
               setPracticeMode("letter");
               setPracticeStream([]);
               setPracticeCurrent(null);
               setPracticeRunning(false);
             }}
             className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
               practiceMode === "letter"
                 ? "bg-[#5E81AC] text-white"
                 : "border border-gray-300 text-gray-600 hover:bg-gray-50"
             }`}
           >
             {t("practiceModeLetter")}
           </button>
         </div>
         {/* 1~4 back 等级 */}
         <div className="mb-3 flex gap-2">
           {[1, 2, 3, 4].map((n) => (
             <button
               key={n}
               type="button"
               onClick={() => {
                 setPracticeLevel(n);
                 setPracticeStream([]);
                 setPracticeCurrent(null);
                 setPracticeRunning(false);
               }}
               className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                 practiceLevel === n
                   ? "bg-[#5E81AC] text-white"
                   : "border border-gray-300 text-gray-600 hover:bg-gray-50"
               }`}
             >
               {n}-back
             </button>
           ))}
         </div>
         <div className="mb-4">
           {renderSequence(practiceItem)}
         </div>
         <p className="mb-3 text-sm font-medium text-gray-700">
           {t("nBackQuestion", { level: practiceLevel })}
         </p>
         <p className="mb-2 text-xs text-gray-500">
           {t("practiceStreamHint")}
         </p>
         <div className="mb-4 flex flex-wrap items-center gap-3">
           <button
             type="button"
             onClick={() => setPracticeRunning((prev) => !prev)}
             className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
           >
             {practiceRunning ? t("pausePractice") : t("startPractice")}
           </button>
           <button
             type="button"
             onClick={() => {
               setPracticeStream([]);
               setPracticeCurrent(null);
               setPracticeRunning(false);
             }}
             className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
           >
             {t("resetPractice")}
           </button>
           {practiceRunning && (
             <button
               type="button"
               className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
             >
               {t("answerSame")}
             </button>
           )}
           <button
             type="button"
             onClick={() => {
               setCurrentIndex(0);
               setCorrectCount(0);
               setHasClickedMatch(false);
               setPhase("formal");
             }}
             className="ml-auto rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
           >
             {t("startFormal")}
           </button>
         </div>
         {practiceRunning && (
           <p className="text-xs text-gray-500">
             {t("answerSameWhenMatch")}
           </p>
         )}
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

