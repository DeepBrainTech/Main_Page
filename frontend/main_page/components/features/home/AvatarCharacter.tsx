"use client";

import { useState } from "react";

export interface AvatarConfig {
  bodyColor: string;
  hatType: "none" | "cap" | "beanie" | "crown";
}

interface AvatarCharacterProps {
  config: AvatarConfig;
  level: number;
  onClick?: () => void;
  direction?: "left" | "right";
}

export default function AvatarCharacter({ config, level, onClick, direction = "right" }: AvatarCharacterProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const hatLeft = direction === "left" ? "45%" : "55%";
  const avatarImageSrc = level >= 2 ? "/home-system/1.png" : "/home-system/0.png";

  const handleClick = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    onClick?.();
    setTimeout(() => setIsAnimating(false), 500);
  };

  const hatEmoji = (() => {
    switch (config.hatType) {
      case "cap":
        return "\uD83E\uDDE2";
      case "beanie":
        return "\uD83E\uDDF6";
      case "crown":
        return "\uD83D\uDC51";
      default:
        return null;
    }
  })();

  return (
    <div
      className={`relative w-64 h-64 cursor-pointer transition-transform duration-300 ${
        isAnimating ? "animate-bounce-custom" : ""
      }`}
      onClick={handleClick}
    >
      <img
        src={avatarImageSrc}
        alt="home character"
        width={300}
        height={300}
        draggable={false}
        className="w-full h-full object-contain drop-shadow-xl select-none pointer-events-none"
        style={{
          transform: direction === "left" ? "scaleX(-1)" : "scaleX(1)",
          transformOrigin: "center center",
        }}
      />

      {hatEmoji && (
        <div
          className="absolute text-3xl drop-shadow pointer-events-none"
          style={{
            left: hatLeft,
            top: "20%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {hatEmoji}
        </div>
      )}

      {isAnimating && (
        <div
          className="absolute bg-white px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 shadow-md animate-fade-in-up border border-gray-100 z-20 whitespace-nowrap pointer-events-none"
          style={{
            left: "66%",
            top: "16%",
            transform: "translate(0, -50%)",
          }}
        >
          {"\uD83D\uDC35 Ooh!"}
        </div>
      )}
    </div>
  );
}
