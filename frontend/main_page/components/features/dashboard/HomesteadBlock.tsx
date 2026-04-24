"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import AvatarCharacter, { type AvatarConfig } from "./AvatarCharacter";
import GoodCoolChatPrompt from "./GoodCoolChatPrompt";
import GoodCoolMessageBubble from "./GoodCoolMessageBubble";

interface HomesteadBlockProps {
  level: number;
  activeCustomizeTab: "head" | "body" | "hand" | "background" | null;
  menuOpen: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
}

export type SceneType = "island";

/** 平滑插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 家园主场景：保持原样展示，配置面板从容器下方展开
 */
export default function HomesteadBlock({
  level,
  activeCustomizeTab,
  menuOpen,
  onMenuOpenChange,
}: HomesteadBlockProps) {
  const tHome = useTranslations("dashboard");
  const containerRef = useRef<HTMLDivElement>(null);

  const [avatarConfig] = useState<AvatarConfig>({
    bodyColor: "#1A1A1A",
    hatType: "none",
    outfitType: "default",
  });
  const scene: SceneType = "island";
  const HOME_POSITION = { x: 50, y: 82 };
  const BOUNDS = { xMin: 12, xMax: 88, yMin: 18, yMax: 86 };

  const [position, setPosition] = useState(HOME_POSITION);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);

  const targetRef = useRef(HOME_POSITION);
  const positionRef = useRef(HOME_POSITION);
  const returnCenterTimerRef = useRef<number | null>(null);

  // 点击场景移动角色
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    targetRef.current = {
      x: Math.max(BOUNDS.xMin, Math.min(BOUNDS.xMax, x)),
      y: Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, y)),
    };
    if (returnCenterTimerRef.current) {
      window.clearTimeout(returnCenterTimerRef.current);
      returnCenterTimerRef.current = null;
    }
    returnCenterTimerRef.current = window.setTimeout(() => {
      returnCenterTimerRef.current = null;
      targetRef.current = HOME_POSITION;
    }, 2000);
  };

  useEffect(() => {
    const WALK_THRESHOLD = 1.2;
    let rafId: number;

    const tick = () => {
      const target = targetRef.current;
      const pos = positionRef.current;
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let t: number;
      if (distance > 25) t = 0.035;
      else if (distance > 12) t = 0.025;
      else if (distance > 4) t = 0.018;
      else if (distance > 1.5) t = 0.01;
      else t = 0.005;

      const newX = lerp(pos.x, target.x, t);
      const newY = lerp(pos.y, target.y, t);
      positionRef.current = { x: newX, y: newY };

      setPosition({ x: newX, y: newY });
      setDirection(target.x >= pos.x ? "right" : "left");
      setIsWalking(distance > WALK_THRESHOLD);

      rafId = requestAnimationFrame(tick);
    };

    targetRef.current = HOME_POSITION;
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (returnCenterTimerRef.current) window.clearTimeout(returnCenterTimerRef.current);
    };
  }, []);

  return (
    <div className="relative flex h-full min-h-[340px] flex-col overflow-visible rounded-3xl border border-amber-100/50 p-6 shadow-sm transition-all select-none md:min-h-[390px] xl:min-h-[440px]">
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          {scene === "island" && (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-[#87CEEB] via-[#98D8F0] to-[#5BA3E8]" />
              <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#D4A574] via-[#E8C9A0] to-[#7EC8E3]" />
              <svg className="absolute bottom-[42%] left-0 right-0 h-12 w-full opacity-40" viewBox="0 0 400 20" preserveAspectRatio="none">
                <path d="M0,10 Q50,4 100,10 T200,10 T300,10 T400,10" fill="none" stroke="white" strokeWidth="3" />
                <path d="M0,14 Q80,8 160,14 T320,14 T400,14" fill="none" stroke="white" strokeWidth="2" />
              </svg>
            </>
          )}
        </div>

        <div ref={containerRef} onClick={handleContainerClick} className="absolute inset-0 top-16 z-0 cursor-pointer">
          <div
            className="absolute will-change-transform"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: Math.floor(position.y),
              transition: "none",
            }}
          >
            <div className={`relative ${isWalking ? "avatar-walk" : ""}`}>
              <div className="pointer-events-none absolute right-[80%] -top-8 z-20">
                <GoodCoolMessageBubble message={tHome("goodCoolMessage")} />
              </div>
              <AvatarCharacter config={avatarConfig} level={level} direction={direction} />
            </div>
            <div className="absolute bottom-2 left-1/2 -z-10 h-4 w-24 -translate-x-1/2 rounded-[100%] bg-black/10 blur-sm" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative z-20 mt-auto flex justify-end">
        <div className="pointer-events-auto">
          <GoodCoolChatPrompt label={tHome("goodCoolChatHint")} />
        </div>
      </div>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+56px)] z-40 rounded-b-3xl bg-white px-5 pb-5 pt-3 transition-opacity duration-300 ${
          menuOpen && activeCustomizeTab ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => onMenuOpenChange?.(false)}
          className="absolute right-4 top-3 p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="pt-2">
          {activeCustomizeTab === "background" ? (
            <button
              type="button"
              className="min-w-[128px] rounded-2xl border-2 border-[#E45C44] bg-[#FFF5F5] p-3 transition"
            >
              <div className="h-14 rounded-xl bg-gradient-to-b from-sky-500 to-sky-100" />
              <div className="mt-2 text-center text-lg text-sky-700">Free</div>
            </button>
          ) : activeCustomizeTab ? (
            <div className="py-6 text-center text-sm text-slate-500">
              {tHome("homesteadNoItemsYet")}
            </div>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        @keyframes avatar-walk-keyframes {
          0% { transform: rotate(-3deg) translateY(0) scale(1); }
          25% { transform: rotate(2deg) translateY(-5px) scale(1.02); }
          50% { transform: rotate(3deg) translateY(0) scale(1); }
          75% { transform: rotate(-2deg) translateY(-5px) scale(1.02); }
          100% { transform: rotate(-3deg) translateY(0) scale(1); }
        }
        .avatar-walk {
          animation: avatar-walk-keyframes 0.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
