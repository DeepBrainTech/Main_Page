"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import AvatarCharacter, { type AvatarConfig } from "./AvatarCharacter";
import GoodCoolChatPrompt from "./GoodCoolChatPrompt";
import GoodCoolConversationPanel from "./GoodCoolConversationPanel";
import GoodCoolMessageBubble from "./GoodCoolMessageBubble";
import { sendMonkeyChatMessage, type MonkeyChatMessage } from "@/services/monkeyChatApi";

interface HomesteadBlockProps {
  level: number;
  userAvatarUrl?: string | null;
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
  userAvatarUrl = null,
  activeCustomizeTab,
  menuOpen,
  onMenuOpenChange,
}: HomesteadBlockProps) {
  const tHome = useTranslations("dashboard");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);

  const [avatarConfig] = useState<AvatarConfig>({
    bodyColor: "#1A1A1A",
    hatType: "none",
    outfitType: "default",
  });
  const scene: SceneType = "island";
  const HOME_POSITION = { x: 50, y: 78 };
  const BOUNDS = { xMin: 20, xMax: 80, yMin: 20, yMax: 84 };

  const [position, setPosition] = useState(HOME_POSITION);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessage, setChatMessage] = useState(tHome("goodCoolMessage"));
  const [chatHistory, setChatHistory] = useState<MonkeyChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [shouldAnimateLatestAssistant, setShouldAnimateLatestAssistant] = useState(false);

  const targetRef = useRef(HOME_POSITION);
  const positionRef = useRef(HOME_POSITION);
  const returnCenterTimerRef = useRef<number | null>(null);

  const displayedChatMessages: MonkeyChatMessage[] = [
    { role: "assistant", content: tHome("goodCoolMessage") },
    ...chatHistory,
  ];
  const lastDisplayedMessage = displayedChatMessages[displayedChatMessages.length - 1];
  if (chatMessage && (!lastDisplayedMessage || lastDisplayedMessage.content !== chatMessage)) {
    displayedChatMessages.push({ role: "assistant", content: chatMessage });
  }

  const handleChatSubmit = async () => {
    const message = chatInput.trim();
    if (!message || isChatLoading) return;

    const nextHistory: MonkeyChatMessage[] = [...chatHistory, { role: "user" as const, content: message }].slice(-8);
    setChatInput("");
    setChatMessage(tHome("goodCoolThinking"));
    setChatHistory(nextHistory);
    setIsChatLoading(true);
    setShouldAnimateLatestAssistant(false);

    try {
      const result = await sendMonkeyChatMessage({
        message,
        locale: locale.startsWith("zh") ? "zh" : "en",
        history: chatHistory.slice(-8),
      });
      setChatMessage(result.answer);
      setChatHistory([...nextHistory, { role: "assistant" as const, content: result.answer }].slice(-8));
      setShouldAnimateLatestAssistant(true);
    } catch {
      const fallback = tHome("goodCoolError");
      setChatMessage(fallback);
      setChatHistory([...nextHistory, { role: "assistant" as const, content: fallback }].slice(-8));
      setShouldAnimateLatestAssistant(true);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCloseChatPanel = () => {
    setIsChatPanelOpen(false);
    setChatMessage(tHome("goodCoolMessage"));
    setShouldAnimateLatestAssistant(false);
  };

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
    <div className="relative flex h-full min-h-[340px] flex-col rounded-3xl border border-amber-100/50 p-[clamp(0.75rem,2vw,1.5rem)] shadow-sm transition-all select-none md:min-h-[390px] xl:min-h-[440px]">
      {/* Clips scene + avatar + chat to the card; customize panel is a sibling so it is not cut off. */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 z-0">
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

        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className="@container/hs absolute left-0 right-0 top-[clamp(5rem,10vw,6rem)] bottom-[clamp(0.5rem,1.8vw,1.25rem)] z-20 cursor-pointer px-[clamp(0.25rem,1.2vw,0.5rem)] lg:top-16"
        >
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
          <div className={`relative min-w-0 ${isWalking ? "avatar-walk" : ""}`}>
            {!isChatPanelOpen ? (
              <div
                className="pointer-events-auto absolute right-full -top-1 z-30 hidden w-[min(18rem,34cqi)] min-w-[14rem] pr-0 -mr-1.5 sm:block"
                onClick={(event) => event.stopPropagation()}
              >
                <GoodCoolMessageBubble
                  message={chatMessage}
                  expandLabel={tHome("goodCoolExpandChat")}
                  onExpand={() => setIsChatPanelOpen(true)}
                />
              </div>
            ) : null}
            <AvatarCharacter config={avatarConfig} level={level} direction={direction} />
          </div>
          <div className="absolute bottom-2 left-1/2 -z-10 h-4 w-24 -translate-x-1/2 rounded-[100%] bg-black/10 blur-sm" />
        </div>
        </div>

        <div
          className="@container/chat pointer-events-none absolute bottom-[clamp(1rem,2.5vw,1.5rem)] right-[clamp(1rem,2.5vw,1.5rem)] top-[clamp(0.75rem,2vw,1rem)] z-40 flex w-[min(20rem,38%,calc(100%-2rem))] min-w-[14rem] flex-col items-stretch justify-end gap-2"
        >
          {isChatPanelOpen ? (
          <GoodCoolConversationPanel
            messages={displayedChatMessages}
            userAvatarUrl={userAvatarUrl}
            closeLabel={tHome("goodCoolCloseChat")}
            animateLatestAssistant={shouldAnimateLatestAssistant && !isChatLoading}
            onLatestAssistantAnimationComplete={() => setShouldAnimateLatestAssistant(false)}
            onClose={handleCloseChatPanel}
          />
          ) : null}

          <div className="pointer-events-auto w-full min-w-0">
            <GoodCoolChatPrompt
              label={tHome("goodCoolChatHint")}
              value={chatInput}
              disabled={isChatLoading}
              onChange={setChatInput}
              onSubmit={handleChatSubmit}
            />
          </div>
        </div>
      </div>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+96px)] z-40 rounded-b-3xl bg-white px-5 pb-5 pt-3 transition-opacity duration-300 sm:top-[calc(100%+56px)] ${
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
