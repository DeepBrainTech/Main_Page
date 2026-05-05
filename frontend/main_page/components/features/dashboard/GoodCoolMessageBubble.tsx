"use client";

interface GoodCoolMessageBubbleProps {
  message: string;
}

export default function GoodCoolMessageBubble({ message }: GoodCoolMessageBubbleProps) {
  return (
    <div className="inline-flex w-full min-w-0 max-w-full items-start justify-start gap-2.5 rounded-bl-3xl rounded-tl-3xl rounded-tr-3xl bg-sky-50 p-[clamp(0.75rem,2vw,1rem)] shadow-sm">
      <div
        className="flex-1 overflow-hidden font-app-body text-[clamp(0.82rem,1.7vw,1rem)] font-normal leading-[1.45] text-zinc-800"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
        }}
      >
        {message}
      </div>
    </div>
  );
}
