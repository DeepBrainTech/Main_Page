"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MentalMathPracticePhase, MentalMathQuestion } from "@/types/learning";
import { isMentalMathAnswerCorrect, resolveMentalMathAnswer } from "@/lib/mentalMathAnswer";

export interface MentalMathPracticeRecord {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  questionDurationSeconds: number;
}

interface UseMentalMathPracticeOptions {
  questions?: MentalMathQuestion[];
  onQuestionAnswered?: (
    questionId: string,
    isCorrect: boolean,
    userAnswer: string,
    questionDurationSeconds: number
  ) => void;
}

export type MentalMathPracticeStartOptions = {
  startIndex?: number;
  initialRecords?: MentalMathPracticeRecord[];
};

function recomputeStatsFromRecords(records: MentalMathPracticeRecord[]) {
  const answeredCount = records.length;
  const correctCount = records.filter((record) => record.isCorrect).length;
  let currentStreak = 0;
  let bestStreak = 0;
  for (const record of records) {
    if (record.isCorrect) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  const totalAnsweredSeconds = records.reduce((sum, record) => sum + record.questionDurationSeconds, 0);
  return { answeredCount, correctCount, currentStreak, bestStreak, totalAnsweredSeconds };
}

function findSavedAnswer(recordsList: MentalMathPracticeRecord[], questionId?: string): string {
  if (!questionId) {
    return "";
  }
  return recordsList.find((record) => record.questionId === questionId)?.userAnswer ?? "";
}

export function useMentalMathPractice(options: UseMentalMathPracticeOptions) {
  const { questions, onQuestionAnswered } = options;
  const [phase, setPhase] = useState<MentalMathPracticePhase>("ready");
  const [currentQuestion, setCurrentQuestion] = useState<MentalMathQuestion | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState<MentalMathPracticeRecord[]>([]);
  const [inputAnswer, setInputAnswer] = useState("");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<string | null>(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<string | null>(null);
  const [lastIsCorrect, setLastIsCorrect] = useState(false);
  const [lastQuestionDurationSeconds, setLastQuestionDurationSeconds] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalAnsweredSeconds, setTotalAnsweredSeconds] = useState(0);
  const [questionStartAt, setQuestionStartAt] = useState<number | null>(null);
  const [sessionStartAt, setSessionStartAt] = useState<number | null>(null);
  const questionCursorRef = useRef(0);

  const totalQuestions = questions?.length ?? answeredCount;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const averageSecondsPerQuestion = answeredCount > 0 ? Math.max(1, Math.round(totalAnsweredSeconds / answeredCount)) : 0;
  const canGoPrevious = currentIndex > 1;

  const allQuestionsAnswered = useMemo(() => {
    if (!questions || questions.length === 0) {
      return false;
    }
    const answeredIds = new Set(records.map((record) => record.questionId));
    return questions.every((question) => answeredIds.has(question.id));
  }, [questions, records]);

  const canSubmit = useMemo(
    () => inputAnswer.trim().length > 0 && !allQuestionsAnswered,
    [allQuestionsAnswered, inputAnswer]
  );

  const willCompleteAllOnSubmit = useMemo(() => {
    if (!currentQuestion || !canSubmit || !questions || questions.length === 0) {
      return false;
    }
    const answeredIds = new Set(records.map((record) => record.questionId));
    answeredIds.add(currentQuestion.id);
    return questions.every((question) => answeredIds.has(question.id));
  }, [canSubmit, currentQuestion, questions, records]);

  useEffect(() => {
    if (!sessionStartAt) {
      return;
    }
    if (phase === "ready" || phase === "summary") {
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - sessionStartAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, sessionStartAt]);

  const applyStats = (nextRecords: MentalMathPracticeRecord[]) => {
    const stats = recomputeStatsFromRecords(nextRecords);
    setAnsweredCount(stats.answeredCount);
    setCorrectCount(stats.correctCount);
    setCurrentStreak(stats.currentStreak);
    setBestStreak(stats.bestStreak);
    setTotalAnsweredSeconds(stats.totalAnsweredSeconds);
  };

  const openQuestionAtIndex = (index: number) => {
    if (!questions || questions.length === 0) {
      setPhase("summary");
      return;
    }
    const safeIndex = Math.max(0, Math.min(index, questions.length - 1));
    questionCursorRef.current = safeIndex + 1;
    const targetQuestion = questions[safeIndex] ?? null;
    setCurrentQuestion(targetQuestion);
    setCurrentIndex(safeIndex + 1);
    setInputAnswer(findSavedAnswer(records, targetQuestion?.id));
    setQuestionStartAt(Date.now());
    setPhase("inProgress");
  };

  const reset = () => {
    questionCursorRef.current = 0;
    setPhase("ready");
    setCurrentQuestion(null);
    setCurrentIndex(0);
    setRecords([]);
    setInputAnswer("");
    setAnsweredCount(0);
    setCorrectCount(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setLastSubmittedAnswer(null);
    setLastCorrectAnswer(null);
    setLastIsCorrect(false);
    setLastQuestionDurationSeconds(0);
    setTotalDurationSeconds(0);
    setElapsedSeconds(0);
    setTotalAnsweredSeconds(0);
    setQuestionStartAt(null);
    setSessionStartAt(null);
  };

  const start = (options: number | MentalMathPracticeStartOptions = 0) => {
    const startIndex = typeof options === "number" ? options : (options.startIndex ?? 0);
    const initialRecords = typeof options === "number" ? [] : (options.initialRecords ?? []);

    reset();
    if (initialRecords.length > 0) {
      setRecords(initialRecords);
      applyStats(initialRecords);
    }

    const now = Date.now();
    setSessionStartAt(now);
    setQuestionStartAt(now);
    if (questions) {
      const maxIndex = Math.max(0, questions.length - 1);
      const safeIndex = Math.max(0, Math.min(startIndex, maxIndex));
      questionCursorRef.current = safeIndex + 1;
      const targetQuestion = questions[safeIndex] ?? null;
      setCurrentQuestion(targetQuestion);
      setCurrentIndex(safeIndex + 1);
      setInputAnswer(findSavedAnswer(initialRecords, targetQuestion?.id));
      setPhase("inProgress");
      return;
    }
    setPhase("summary");
  };

  const submitCurrentAnswer = () => {
    if (!currentQuestion || !canSubmit || phase !== "inProgress") {
      return;
    }
    if (allQuestionsAnswered) {
      return;
    }

    const submittedAnswer = inputAnswer.trim();
    const resolvedAnswer = currentQuestion.answerText
      ? { display: currentQuestion.answerText, accepted: currentQuestion.acceptedAnswers ?? [currentQuestion.answerText] }
      : resolveMentalMathAnswer(currentQuestion.expression);
    const isCorrect = isMentalMathAnswerCorrect(
      submittedAnswer,
      currentQuestion.expression,
      currentQuestion.acceptedAnswers ?? resolvedAnswer.accepted
    );
    const now = Date.now();
    const elapsed = sessionStartAt ? Math.max(1, Math.round((now - sessionStartAt) / 1000)) : 0;
    const questionSeconds = questionStartAt ? Math.max(1, Math.round((now - questionStartAt) / 1000)) : 0;

    setLastSubmittedAnswer(submittedAnswer);
    setLastCorrectAnswer(resolvedAnswer.display);
    setLastIsCorrect(isCorrect);
    setLastQuestionDurationSeconds(questionSeconds);
    setElapsedSeconds(elapsed);

    const nextRecord: MentalMathPracticeRecord = {
      questionId: currentQuestion.id,
      userAnswer: submittedAnswer,
      isCorrect,
      questionDurationSeconds: questionSeconds,
    };
    const existingRecordIndex = records.findIndex((record) => record.questionId === currentQuestion.id);
    const nextRecords =
      existingRecordIndex >= 0
        ? records.map((record, index) => (index === existingRecordIndex ? nextRecord : record))
        : [...records, nextRecord];
    setRecords(nextRecords);
    applyStats(nextRecords);
    onQuestionAnswered?.(currentQuestion.id, isCorrect, submittedAnswer, questionSeconds);

    if (!questions || questions.length === 0) {
      finishSession();
      return;
    }

    const answeredIds = new Set(nextRecords.map((record) => record.questionId));
    if (questions.every((question) => answeredIds.has(question.id))) {
      finishSession();
      return;
    }

    const firstUnansweredIndex = questions.findIndex((question) => !answeredIds.has(question.id));
    openQuestionAtIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
  };

  const goPreviousQuestion = () => {
    if (!questions || phase !== "inProgress" || currentIndex <= 1) {
      return;
    }
    jumpToQuestion(currentIndex - 2);
  };

  const continuePractice = () => {
    if (!questions) {
      return;
    }
    openQuestionAtIndex(records.length);
  };

  const finishSession = () => {
    const durationMs = sessionStartAt ? Date.now() - sessionStartAt : 0;
    setTotalDurationSeconds(Math.max(1, Math.round(durationMs / 1000)));
    setPhase("summary");
  };

  const jumpToQuestion = (index: number) => {
    if (!questions || questions.length === 0) {
      return;
    }
    const safeIndex = Math.max(0, Math.min(index, questions.length - 1));
    const targetQuestion = questions[safeIndex] ?? null;
    setCurrentQuestion(targetQuestion);
    setCurrentIndex(safeIndex + 1);
    setInputAnswer(findSavedAnswer(records, targetQuestion?.id));
    setLastSubmittedAnswer(null);
    setLastCorrectAnswer(null);
    setLastIsCorrect(false);
    setLastQuestionDurationSeconds(0);
    if (!sessionStartAt) {
      setSessionStartAt(Date.now());
    }
    setQuestionStartAt(Date.now());
    questionCursorRef.current = safeIndex + 1;
    setPhase("inProgress");
  };

  return {
    phase,
    records,
    currentIndex,
    currentQuestion,
    answeredCount,
    totalQuestions,
    inputAnswer,
    setInputAnswer,
    canSubmit,
    allQuestionsAnswered,
    willCompleteAllOnSubmit,
    canGoPrevious,
    correctCount,
    accuracy,
    currentStreak,
    bestStreak,
    averageSecondsPerQuestion,
    elapsedSeconds,
    lastSubmittedAnswer,
    lastCorrectAnswer,
    lastIsCorrect,
    lastQuestionDurationSeconds,
    totalDurationSeconds,
    start,
    submitCurrentAnswer,
    goPreviousQuestion,
    continuePractice,
    finishSession,
    jumpToQuestion,
    reset,
  };
}
