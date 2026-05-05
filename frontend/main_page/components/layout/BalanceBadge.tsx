"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface BalanceBadgeProps {
  iconSrc: string;
  iconAlt: string;
  value: number;
  variant: "coin" | "diamond" | "flower";
  highlight?: boolean;
  ready?: boolean;
}

const activeStyles = {
  coin: {
    badge: "scale-110 bg-amber-100 shadow-md shadow-amber-200/70",
    text: "text-amber-600",
    floating: "bg-amber-400",
  },
  diamond: {
    badge: "scale-110 bg-sky-100 shadow-md shadow-sky-200/70",
    text: "text-sky-600",
    floating: "bg-sky-400",
  },
  flower: {
    badge: "scale-110 bg-pink-100 shadow-md shadow-pink-200/70",
    text: "text-pink-600",
    floating: "bg-pink-400",
  },
};

export default function BalanceBadge({
  iconSrc,
  iconAlt,
  value,
  variant,
  highlight = false,
  ready = true,
}: BalanceBadgeProps) {
  const previousValueRef = useRef(value);
  const wasReadyRef = useRef(ready);
  const [increase, setIncrease] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const styles = activeStyles[variant];

  useEffect(() => {
    const previousValue = previousValueRef.current;
    const wasReady = wasReadyRef.current;
    previousValueRef.current = value;
    wasReadyRef.current = ready;

    if (!ready || !wasReady || !highlight || value <= previousValue) return;

    setIncrease(value - previousValue);
    setIsAnimating(true);

    const timer = window.setTimeout(() => {
      setIsAnimating(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [highlight, ready, value]);

  return (
    <div
      className={`relative flex min-h-9 min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-app-body text-sm font-medium leading-5 text-sky-700 transition-all duration-300 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2 md:min-h-11 md:px-5 md:text-lg md:leading-5 ${
        isAnimating ? styles.badge : "bg-indigo-50"
      }`}
    >
      <Image
        src={iconSrc}
        alt={iconAlt}
        width={20}
        height={20}
        className={`h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5 ${isAnimating ? "animate-bounce-custom" : ""}`}
      />
      <span className={`tabular-nums ${isAnimating ? styles.text : ""}`}>{value}</span>
      {increase > 0 && isAnimating ? (
        <span
          className={`pointer-events-none absolute -right-1 -top-5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-4 text-white shadow-sm md:-top-6 md:text-xs md:leading-4 animate-reward-rise ${styles.floating}`}
        >
          +{increase}
        </span>
      ) : null}
    </div>
  );
}
