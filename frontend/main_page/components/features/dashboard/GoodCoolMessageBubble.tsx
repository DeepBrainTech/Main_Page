"use client";

import { useTypewriterText } from "@/hooks/useTypewriterText";

interface GoodCoolMessageBubbleProps {
  message: string;
  expandLabel: string;
  onExpand: () => void;
}

export default function GoodCoolMessageBubble({ message, expandLabel, onExpand }: GoodCoolMessageBubbleProps) {
  const visibleMessage = useTypewriterText(message);

  return (
    <div className="relative flex w-full min-w-0 max-w-full items-start justify-start gap-2.5 rounded-bl-3xl rounded-tl-3xl rounded-tr-3xl bg-sky-50 p-[clamp(0.75rem,2vw,1rem)] pb-[clamp(1.6rem,3.4vw,2rem)] shadow-sm">
      <div
        className="scrollbar-thin flex-1 overflow-y-auto whitespace-pre-wrap break-words pr-1 font-app-body text-[clamp(0.82rem,1.7vw,1rem)] font-normal leading-[1.45] text-zinc-800"
        style={{ maxHeight: "5.8em" }}
      >
        {visibleMessage}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onExpand();
        }}
        className="absolute bottom-2 right-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white/80 text-zinc-800 shadow-sm ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300"
        aria-label={expandLabel}
        title={expandLabel}
      >
        <span className="relative block h-3.5 w-3.5" aria-hidden>
          <span className="absolute right-0 top-0 h-2 w-2 border-r-[1.5px] border-t-[1.5px] border-current" />
          <span className="absolute bottom-0 left-0 h-2 w-2 border-b-[1.5px] border-l-[1.5px] border-current" />
        </span>
      </button>
    </div>
  );
}
