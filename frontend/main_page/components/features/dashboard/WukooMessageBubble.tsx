"use client";

import Image from "next/image";
import { useTypewriterText } from "@/hooks/useTypewriterText";

interface WukooMessageBubbleProps {
  message: string;
  expandLabel: string;
  onExpand: () => void;
}

export default function WukooMessageBubble({ message, expandLabel, onExpand }: WukooMessageBubbleProps) {
  const visibleMessage = useTypewriterText(message);

  return (
    <div className="inline-flex w-full min-w-0 max-w-full items-start justify-start gap-2 rounded-bl-3xl rounded-tl-3xl rounded-tr-3xl bg-sky-50 p-4 shadow-sm">
      <div className="min-w-0 flex-1 whitespace-pre-wrap break-words font-app-body text-base font-normal leading-6 text-zinc-800">
        {visibleMessage}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onExpand();
        }}
        className="relative size-4 shrink-0 overflow-hidden transition hover:opacity-80"
        aria-label={expandLabel}
        title={expandLabel}
      >
        <Image
          src="/home-system/chat/message.svg"
          alt=""
          width={16}
          height={16}
          className="size-4"
          aria-hidden
        />
      </button>
    </div>
  );
}
