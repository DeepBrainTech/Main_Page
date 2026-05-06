"use client";

type CircularProgressRingProps = {
  /** Progress 0–100 */
  value: number;
  /** SVG width/height in px */
  size?: number;
  className?: string;
};

/**
 * Small donut progress ring: bright green arc on pale green track, rounded caps.
 */
export default function CircularProgressRing({ value, size = 28, className }: CircularProgressRingProps) {
  const pct = Math.min(100, Math.max(0, value));
  const center = size / 2;
  const strokeWidth = Math.max(2, size * 0.107);
  const radius = center - strokeWidth / 2 - 0.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 ${className ?? ""}`}
      aria-hidden
    >
      <g transform={`rotate(-90 ${center} ${center})`}>
        <circle
          fill="none"
          stroke="#DCFCE7"
          strokeWidth={strokeWidth}
          r={radius}
          cx={center}
          cy={center}
        />
        <circle
          fill="none"
          stroke="#4ADE80"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={center}
          cy={center}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </g>
    </svg>
  );
}
