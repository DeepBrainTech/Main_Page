"use client";

import Image from "next/image";
import type { MonkeyChatMessage } from "@/services/monkeyChatApi";

interface GoodCoolConversationPanelProps {
  messages: MonkeyChatMessage[];
  closeLabel: string;
  onClose: () => void;
}

export default function GoodCoolConversationPanel({
  messages,
  closeLabel,
  onClose,
}: GoodCoolConversationPanelProps) {
  return (
    <div
      className="pointer-events-auto flex h-[min(24rem,calc(100cqh-4.75rem))] min-h-[12rem] w-full flex-col rounded-3xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-md"
      role="dialog"
      aria-modal="false"
      aria-label="GoodCool chat"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-white/75 text-zinc-800 shadow-sm ring-1 ring-zinc-200 transition hover:bg-white"
        aria-label={closeLabel}
        title={closeLabel}
      >
        <span className="relative block h-4 w-4" aria-hidden>
          <span className="absolute left-1/2 top-1/2 h-3 w-[1.5px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
          <span className="absolute left-1/2 top-1/2 h-3 w-[1.5px] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
        </span>
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto px-[clamp(0.75rem,2.4vw,1rem)] pb-[clamp(0.75rem,2.4vw,1rem)] pr-[clamp(1rem,3vw,1.4rem)] pt-[clamp(2.75rem,8vw,3.5rem)] scrollbar-thin">
        <div className="flex flex-col gap-[clamp(0.75rem,2vw,1rem)]">
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                className={`flex items-start gap-2 ${isAssistant ? "justify-start" : "justify-end"}`}
              >
                {isAssistant ? (
                  <Image
                    src="/dashboard/default.png"
                    alt=""
                    width={32}
                    height={32}
                    className="mt-1 h-8 w-8 shrink-0 rounded-full object-cover"
                    aria-hidden
                  />
                ) : null}
                <div
                  className={`max-w-[82%] rounded-tl-3xl rounded-tr-3xl px-[clamp(0.85rem,2.5vw,1rem)] py-[clamp(0.7rem,2vw,0.85rem)] font-app-body text-[clamp(0.86rem,2.6vw,1rem)] font-normal leading-6 text-zinc-800 shadow-sm ${
                    isAssistant ? "rounded-br-3xl bg-sky-100" : "rounded-bl-3xl bg-white"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
