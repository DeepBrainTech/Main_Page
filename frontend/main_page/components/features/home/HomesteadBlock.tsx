"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import AvatarCharacter, { type AvatarConfig } from "./AvatarCharacter";

interface HomesteadBlockProps {
  coins: number;
  diamonds: number;
  level: number;
  expCurrent: number;
  expTarget: number;
}

const HAT_OPTIONS = [
  { id: "none", icon: "😶", labelKey: "none" },
  { id: "cap", icon: "🧢", labelKey: "cap" },
  { id: "beanie", icon: "🧶", labelKey: "beanie" },
  { id: "crown", icon: "👑", labelKey: "crown" },
] as const;

export type SceneType = "island" | "forest" | "city";

const SCENE_OPTIONS: { id: SceneType; icon: string; labelKey: SceneType }[] = [
  { id: "island", icon: "🏝️", labelKey: "island" },
  { id: "forest", icon: "🌲", labelKey: "forest" },
  { id: "city", icon: "🌆", labelKey: "city" },
];

/** 平滑插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 家园：猴子在框内自主移动，点击框内时移动到点击位置
 */
export default function HomesteadBlock({
  coins,
  diamonds,
  level,
  expCurrent,
  expTarget,
}: HomesteadBlockProps) {
  const tHome = useTranslations("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const expPercent = expTarget > 0 ? Math.round((expCurrent / expTarget) * 100) : 0;

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    bodyColor: "#1A1A1A",
    hatType: "none",
  });

  const [scene, setScene] = useState<SceneType>("island");

  // 活动区边界（百分比）
  const BOUNDS = { xMin: 12, xMax: 88, yMin: 18, yMax: 86 };
  const ARRIVED_THRESHOLD = 1.8;

  // 当前显示位置（平滑后的）
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);

  const targetRef = useRef({ x: 50, y: 50 });
  const positionRef = useRef({ x: 50, y: 50 });
  const arrivedTimerRef = useRef<number | null>(null);

  // 点击框内：猴子移动到点击位置
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
    if (arrivedTimerRef.current) {
      window.clearTimeout(arrivedTimerRef.current);
      arrivedTimerRef.current = null;
    }
  };

  // 每帧向目标移动；到达后过一段时间随机新目标（自主溜达）
  useEffect(() => {
    const WALK_THRESHOLD = 1.2;

    let rafId: number;

    const tick = () => {
      const target = targetRef.current;
      const pos = positionRef.current;

      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < ARRIVED_THRESHOLD) {
        // 到达：安排一段时间后随机下一个目标
        if (!arrivedTimerRef.current) {
          arrivedTimerRef.current = window.setTimeout(() => {
            arrivedTimerRef.current = null;
            targetRef.current = {
              x: BOUNDS.xMin + Math.random() * (BOUNDS.xMax - BOUNDS.xMin),
              y: BOUNDS.yMin + Math.random() * (BOUNDS.yMax - BOUNDS.yMin),
            };
          }, 800 + Math.random() * 2200);
        }
      }

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

    // 初始随机目标，让猴子自己先动起来
    targetRef.current = {
      x: BOUNDS.xMin + Math.random() * (BOUNDS.xMax - BOUNDS.xMin),
      y: BOUNDS.yMin + Math.random() * (BOUNDS.yMax - BOUNDS.yMin),
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (arrivedTimerRef.current) window.clearTimeout(arrivedTimerRef.current);
    };
  }, []);

  const handleHatSelect = (hatType: AvatarConfig["hatType"]) => {
    setAvatarConfig((prev) => ({ ...prev, hatType }));
  };

  return (
    <div className="h-full relative overflow-hidden rounded-3xl p-6 shadow-sm border border-amber-100/50 transition-all select-none">
      {/* 场景背景层 */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden">
        {scene === "island" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#87CEEB] via-[#98D8F0] to-[#5BA3E8]" />
            <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#D4A574] via-[#E8C9A0] to-[#7EC8E3]" />
            <div className="absolute top-4 right-8 w-14 h-14 rounded-full bg-[#FFE066] shadow-lg opacity-95" />
            <svg className="absolute bottom-[42%] left-0 right-0 w-full h-12 opacity-40" viewBox="0 0 400 20" preserveAspectRatio="none">
              <path d="M0,10 Q50,4 100,10 T200,10 T300,10 T400,10" fill="none" stroke="white" strokeWidth="3" />
              <path d="M0,14 Q80,8 160,14 T320,14 T400,14" fill="none" stroke="white" strokeWidth="2" />
            </svg>
          </>
        )}
        {scene === "forest" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#87CEEB] via-[#A8D8B9] to-[#2D5A27]" />
            <div className="absolute bottom-0 left-0 right-0 h-[55%] bg-gradient-to-t from-[#1E3D1A] via-[#2D5A27] to-[#3D7A35]" />
            <div className="absolute bottom-0 left-[5%] w-24 h-32 bg-[#1a2f18] rounded-t-full opacity-90" />
            <div className="absolute bottom-0 left-[25%] w-20 h-28 bg-[#243d21] rounded-t-full opacity-90" />
            <div className="absolute bottom-0 right-[25%] w-20 h-28 bg-[#1e3520] rounded-t-full opacity-90" />
            <div className="absolute bottom-0 right-[8%] w-16 h-24 bg-[#2a4525] rounded-t-full opacity-90" />
          </>
        )}
        {scene === "city" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#2C3E50] via-[#FF7E5F] to-[#6B5B95]" />
            <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-[#1a1a2e]" />
            <div className="absolute bottom-0 left-0 w-[18%] h-full bg-[#0f0f1a]" />
            <div className="absolute bottom-0 left-[18%] w-[15%] h-[85%] bg-[#16162a]" />
            <div className="absolute bottom-0 left-[33%] w-[12%] h-[70%] bg-[#1a1a2e]" />
            <div className="absolute bottom-0 left-[45%] w-[20%] h-[95%] bg-[#0d0d18]" />
            <div className="absolute bottom-0 left-[65%] w-[14%] h-[75%] bg-[#12122a]" />
            <div className="absolute bottom-0 left-[79%] w-[16%] h-[88%] bg-[#0f0f1a]" />
            <div className="absolute bottom-0 right-0 w-[21%] h-full bg-[#16162a]" />
          </>
        )}
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
        <div className="pointer-events-auto space-y-2">
          <div className="mx-auto w-full max-w-sm rounded-xl bg-white/65 px-3 py-2 backdrop-blur-sm border border-white/50 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-amber-900">
              <span>{tHome("levelLabel", { level })}</span>
              <span className="tabular-nums">{tHome("expProgress", { current: expCurrent, target: expTarget })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-amber-100/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                style={{ width: `${expPercent}%` }}
              />
            </div>
          </div>
          <div className="flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-sm px-3 py-1.5 border border-white/40 shadow-sm hover:bg-white/80 transition-colors text-amber-900 font-medium text-sm"
          >
            <span className="text-lg">👕</span>
            <span>{tHome("changeOutfit")}</span>
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-sm px-3 py-1.5 border border-white/40 shadow-sm">
              <span className="text-lg">🪙</span>
              <span className="text-sm font-bold text-amber-800 tabular-nums">{coins}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-sm px-3 py-1.5 border border-white/40 shadow-sm">
              <span className="text-lg">💎</span>
              <span className="text-sm font-bold text-sky-800 tabular-nums">{diamonds}</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* 角色活动区：自主移动，点击框内则移动到点击位置 */}
      <div ref={containerRef} onClick={handleContainerClick} className="absolute inset-0 top-16 bottom-0 z-0 cursor-pointer">
        <div
          className="absolute will-change-transform"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: `translate(-50%, -50%)`,
            zIndex: Math.floor(position.y),
            transition: "none",
          }}
        >
          <div className={`pointer-events-auto ${isWalking ? "avatar-walk" : ""}`}>
            <AvatarCharacter
              config={avatarConfig}
              level={level}
              direction={direction}
            />
          </div>
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/10 rounded-[100%] blur-sm -z-10"
            style={{ transition: "none" }}
          />
        </div>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-white/50 rounded-t-3xl p-5 transition-transform duration-300 z-30 shadow-[-10px] ${
          isMenuOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{tHome("labels.scene")}</h4>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {SCENE_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScene(s.id)}
                  className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl border-2 transition-all ${
                    scene === s.id ? "border-amber-400 bg-amber-50" : "border-transparent bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-2xl mb-1">{s.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600">{tHome(`scenes.${s.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{tHome("labels.accessories")}</h4>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {HAT_OPTIONS.map((hat) => (
                <button
                  key={hat.id}
                  onClick={() => handleHatSelect(hat.id)}
                  className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl border-2 transition-all ${
                    avatarConfig.hatType === hat.id ? "border-amber-400 bg-amber-50" : "border-transparent bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-2xl mb-1">{hat.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600">{tHome(`hats.${hat.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* 走路特效：左右摇摆 + 上下起伏 */}
      <style jsx global>{`
        @keyframes avatar-walk-keyframes {
          0%   { transform: rotate(-3deg) translateY(0) scale(1); }
          25%  { transform: rotate(2deg) translateY(-5px) scale(1.02); }
          50%  { transform: rotate(3deg) translateY(0) scale(1); }
          75%  { transform: rotate(-2deg) translateY(-5px) scale(1.02); }
          100% { transform: rotate(-3deg) translateY(0) scale(1); }
        }
        .avatar-walk {
          animation: avatar-walk-keyframes 0.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
