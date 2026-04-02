"use client";

import { useMemo, useState } from "react";
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

export function useMentalMathPractice(questions: MentalMathQuestion[]) {
  const [phase, setPhase] = useState<MentalMathPracticePhase>("ready");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputAnswer, setInputAnswer] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<number | null>(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<number | null>(null);
  const [lastIsCorrect, setLastIsCorrect] = useState(false);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [sessionStartAt, setSessionStartAt] = useState<number | null>(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const canSubmit = useMemo(() => /^-?\d+$/.test(inputAnswer.trim()), [inputAnswer]);

  const reset = () => {
    setPhase("ready");
    setCurrentIndex(0);
    setInputAnswer("");
    setCorrectCount(0);
    setLastSubmittedAnswer(null);
    setLastCorrectAnswer(null);
    setLastIsCorrect(false);
    setTotalDurationSeconds(0);
    setSessionStartAt(null);
  };

  const start = () => {
    if (totalQuestions === 0) {
      return;
    }
    setPhase("inProgress");
    setCurrentIndex(0);
    setInputAnswer("");
    setCorrectCount(0);
    setLastSubmittedAnswer(null);
    setLastCorrectAnswer(null);
    setLastIsCorrect(false);
    setTotalDurationSeconds(0);
    setSessionStartAt(Date.now());
  };

  const submitCurrentAnswer = () => {
    if (!currentQuestion || !canSubmit) {
      return;
    }

    const submittedAnswer = Number(inputAnswer.trim());
    const correctAnswer = calculateExpression(currentQuestion.expression);
    const isCorrect = submittedAnswer === correctAnswer;

    setLastSubmittedAnswer(submittedAnswer);
    setLastCorrectAnswer(correctAnswer);
    setLastIsCorrect(isCorrect);
    if (isCorrect) {
      setCorrectCount((count) => count + 1);
    }
    setPhase("questionResult");
  };

  const next = () => {
    const isLastQuestion = currentIndex >= totalQuestions - 1;
    if (isLastQuestion) {
      const durationMs = sessionStartAt ? Date.now() - sessionStartAt : 0;
      setTotalDurationSeconds(Math.max(1, Math.round(durationMs / 1000)));
      setPhase("summary");
      return;
    }

    setCurrentIndex((index) => index + 1);
    setInputAnswer("");
    setLastSubmittedAnswer(null);
    setLastCorrectAnswer(null);
    setLastIsCorrect(false);
    setPhase("inProgress");
  };

  return {
    phase,
    currentIndex,
    currentQuestion,
    totalQuestions,
    inputAnswer,
    setInputAnswer,
    canSubmit,
    correctCount,
    lastSubmittedAnswer,
    lastCorrectAnswer,
    lastIsCorrect,
    totalDurationSeconds,
    start,
    submitCurrentAnswer,
    next,
    reset,
  };
}
