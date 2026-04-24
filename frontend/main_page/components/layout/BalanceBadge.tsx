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
      className={`relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-sky-700 transition-all duration-300 ${
        isAnimating ? styles.badge : "bg-indigo-50"
      }`}
    >
      <Image
        src={iconSrc}
        alt={iconAlt}
        width={16}
        height={16}
        className={`h-4 w-4 ${isAnimating ? "animate-bounce-custom" : ""}`}
      />
      <span className={isAnimating ? styles.text : ""}>{value}</span>
      {increase > 0 && isAnimating ? (
        <span
          className={`pointer-events-none absolute -right-1 -top-5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-4 text-white shadow-sm animate-reward-rise ${styles.floating}`}
        >
          +{increase}
        </span>
      ) : null}
    </div>
  );
}
