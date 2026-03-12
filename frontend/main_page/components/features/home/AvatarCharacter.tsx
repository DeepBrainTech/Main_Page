"use client";

import { useState } from "react";

export interface AvatarConfig {
  bodyColor: string;
  hatType: "none" | "cap" | "beanie" | "crown";
}

interface AvatarCharacterProps {
  config: AvatarConfig;
  onClick?: () => void;
  direction?: "left" | "right";
}

/**
 * 可爱的 2D 小猴子（纯 SVG 绘制）
 */
export default function AvatarCharacter({ config, onClick, direction = "right" }: AvatarCharacterProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    onClick?.();
    setTimeout(() => setIsAnimating(false), 500);
  };

  const fur = "#8B6914";
  const face = "#FFE0BD";
  const earInner = "#E8C9A0";
  const eye = "#2C1810";
  const cheek = "#FFAB91";

  return (
    <div
      className={`relative w-40 h-40 cursor-pointer transition-transform duration-300 ${
        isAnimating ? "animate-bounce-custom" : ""
      }`}
      style={{
        transform: direction === "left" ? "scaleX(-1)" : "scaleX(1)",
      }}
      onClick={handleClick}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        {/* 左耳 */}
        <circle cx="42" cy="75" r="28" fill={fur} />
        <circle cx="42" cy="75" r="16" fill={earInner} />
        {/* 右耳 */}
        <circle cx="158" cy="75" r="28" fill={fur} />
        <circle cx="158" cy="75" r="16" fill={earInner} />

        {/* 头部 */}
        <circle cx="100" cy="100" r="72" fill={fur} />

        {/* 脸部（椭圆） */}
        <ellipse cx="100" cy="105" rx="48" ry="52" fill={face} />

        {/* 眼睛 */}
        <ellipse cx="78" cy="95" rx="14" ry="16" fill="white" stroke={eye} strokeWidth="2" />
        <ellipse cx="122" cy="95" rx="14" ry="16" fill="white" stroke={eye} strokeWidth="2" />
        <circle cx="82" cy="97" r="8" fill={eye} />
        <circle cx="126" cy="97" r="8" fill={eye} />
        <circle cx="85" cy="93" r="3" fill="white" />
        <circle cx="129" cy="93" r="3" fill="white" />

        {/* 腮红 */}
        <ellipse cx="62" cy="112" rx="14" ry="8" fill={cheek} opacity="0.5" />
        <ellipse cx="138" cy="112" rx="14" ry="8" fill={cheek} opacity="0.5" />

        {/* 鼻子 */}
        <ellipse cx="100" cy="115" rx="8" ry="6" fill={eye} />

        {/* 嘴巴（微笑） */}
        <path
          d="M82 128 Q100 142 118 128"
          fill="none"
          stroke={eye}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 帽子（在猴子图层之上） */}
        {config.hatType === "cap" && (
          <g transform="translate(12, -28) scale(1.05) rotate(8 100 75)">
            <path d="M48,60 L152,60 L145,55 L55,55 Z" fill="rgba(0,0,0,0.15)" />
            <path d="M50,60 L150,60 L140,30 L60,30 Z" fill="#EF5350" />
            <rect x="50" y="55" width="100" height="10" fill="#D32F2F" />
            <path d="M130,60 L180,60 L180,65 L130,65 Z" fill="#EF5350" />
          </g>
        )}
        {config.hatType === "beanie" && (
          <g transform="translate(2, -32) scale(1.08)">
            <path d="M50,65 Q100,10 150,65" fill="#42A5F5" />
            <rect x="45" y="60" width="110" height="15" rx="5" fill="#1E88E5" />
            <circle cx="100" cy="35" r="12" fill="#1E88E5" />
          </g>
        )}
        {config.hatType === "crown" && (
          <g transform="translate(18, -42) scale(1.02) rotate(12 100 75)">
            <path d="M60,65 L60,35 L80,50 L100,25 L120,50 L140,35 L140,65 Z" fill="#FFCA28" stroke="#FFA000" strokeWidth="2" />
            <circle cx="60" cy="35" r="3" fill="#FFF" />
            <circle cx="100" cy="25" r="3" fill="#FFF" />
            <circle cx="140" cy="35" r="3" fill="#FFF" />
          </g>
        )}
      </svg>

      {isAnimating && (
        <div className="absolute -top-6 -right-6 bg-white px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 shadow-md animate-fade-in-up border border-gray-100 z-20 whitespace-nowrap">
          🐵 Ooh!
        </div>
      )}
    </div>
  );
}
