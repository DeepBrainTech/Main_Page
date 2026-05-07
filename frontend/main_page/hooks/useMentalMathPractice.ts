"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MentalMathPracticePhase, MentalMathQuestion } from "@/types/learning";

function calculateExpression(expression: string): number {
  const normalized = expression.replace("= ?", "").replaceAll(" ", "").replaceAll("−", "-");
  const numbers = normalized.split(/[+-]/).map((item) => Number(item));
  const operators = normalized.match(/[+-]/g) ?? [];

  if (numbers.length === 0 || Number.isNaN(numbers[0])) {
    return 0;
  }

  return operators.reduce((acc, operator, index) => {
    const next = numbers[index + 1];
    if (Number.isNaN(next)) {
      return acc;
    }
    return operator === "+" ? acc + next : acc - next;
  }, numbers[0]);
}

interface UseMentalMathPracticeOptions {
  generateQuestion?: () => MentalMathQuestion | null;
  questions?: MentalMathQuestion[];
  milestoneSize?: number;
}

export function useMentalMathPractice(options: UseMentalMathPracticeOptions) {
  const { generateQuestion, questions, milestoneSize = 10 } = options;
  const [phase, setPhase] = useState<MentalMathPracticePhase>("ready");
  const [currentQuestion, setCurrentQuestion] = useState<MentalMathQuestion | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputAnswer, setInputAnswer] = useState("");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<number | null>(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<number | null>(null);
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

  const canSubmit = useMemo(() => /^-?\d+$/.test(inputAnswer.trim()), [inputAnswer]);

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

  const getNextQuestion = () => {
    if (questions) {
      const nextQuestion = questions[questionCursorRef.current] ?? null;
      questionCursorRef.current += 1;
      return nextQuestion;
    }
    return generateQuestion?.() ?? null;
  };

  const openNextQuestion = () => {
    const nextQuestion = getNextQuestion();
    if (!nextQuestion) {
      setPhase("summary");
      return;
    }
    setCurrentQuestion(nextQuestion);
    setInputAnswer("");
    setLastSubmittedAnswer(null);
    setLastCorrectAnswer(null);
    setLastIsCorrect(false);
    setLastQuestionDurationSeconds(0);
    setCurrentIndex((index) => index + 1);
    setQuestionStartAt(Date.now());
    setPhase("inProgress");
  };

  const reset = () => {
    questionCursorRef.current = 0;
    setPhase("ready");
    setCurrentQuestion(null);
    setCurrentIndex(0);
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

  const start = (startIndex = 0) => {
    reset();
    const now = Date.now();
    setSessionStartAt(now);
    setQuestionStartAt(now);
    if (questions) {
      const maxIndex = Math.max(0, questions.length - 1);
      questionCursorRef.current = Math.max(0, Math.min(startIndex, maxIndex));
    }
    const firstQuestion = getNextQuestion();
    if (!firstQuestion) {
      setPhase("summary");
      return;
    }
    setCurrentQuestion(firstQuestion);
    setCurrentIndex(questions ? Math.max(0, Math.min(startIndex, questions.length - 1)) + 1 : 1);
    setPhase("inProgress");
  };

  const submitCurrentAnswer = () => {
    if (!currentQuestion || !canSubmit) {
      return;
    }

    const submittedAnswer = Number(inputAnswer.trim());
    const correctAnswer = calculateExpression(currentQuestion.expression);
    const isCorrect = submittedAnswer === correctAnswer;
    const now = Date.now();
    const elapsed = sessionStartAt ? Math.max(1, Math.round((now - sessionStartAt) / 1000)) : 0;
    const questionSeconds = questionStartAt ? Math.max(1, Math.round((now - questionStartAt) / 1000)) : 0;

    setLastSubmittedAnswer(submittedAnswer);
    setLastCorrectAnswer(correctAnswer);
    setLastIsCorrect(isCorrect);
    setLastQuestionDurationSeconds(questionSeconds);
    setElapsedSeconds(elapsed);
    setAnsweredCount((count) => count + 1);
    setTotalAnsweredSeconds((seconds) => seconds + questionSeconds);
    if (isCorrect) {
      setCorrectCount((count) => count + 1);
      setCurrentStreak((streak) => {
        const nextStreak = streak + 1;
        setBestStreak((best) => Math.max(best, nextStreak));
        return nextStreak;
      });
    } else {
      setCurrentStreak(0);
    }
    setPhase("questionResult");
  };

  const next = () => {
    const answered = answeredCount;
    if (questions && answered >= questions.length) {
      finishSession();
      return;
    }
    if (answered > 0 && answered % milestoneSize === 0) {
      setPhase("milestone");
      return;
    }
    openNextQuestion();
  };

  const continuePractice = () => {
    openNextQuestion();
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
    questionCursorRef.current = safeIndex + 1;
    const now = Date.now();
    setCurrentQuestion(questions[safeIndex] ?? null);
    setCurrentIndex(safeIndex + 1);
    setInputAnswer("");
    setLastSubmittedAnswer(null);
    setLastCorrectAnswer(null);
    setLastIsCorrect(false);
    setLastQuestionDurationSeconds(0);
    if (!sessionStartAt) {
      setSessionStartAt(now);
    }
    setQuestionStartAt(now);
    setPhase("inProgress");
  };

  return {
    phase,
    currentIndex,
    currentQuestion,
    answeredCount,
    totalQuestions,
    inputAnswer,
    setInputAnswer,
    canSubmit,
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
    next,
    continuePractice,
    finishSession,
    jumpToQuestion,
    reset,
  };
}
