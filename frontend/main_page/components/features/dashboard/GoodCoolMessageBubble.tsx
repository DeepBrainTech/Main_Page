"use client";

interface GoodCoolMessageBubbleProps {
  message: string;
}

export default function GoodCoolMessageBubble({ message }: GoodCoolMessageBubbleProps) {
  return (
    <div className="inline-flex w-72 max-w-[calc(100vw-3rem)] items-start justify-start gap-2.5 rounded-bl-3xl rounded-tl-3xl rounded-tr-3xl bg-sky-50 p-4 shadow-sm">
      <div className="flex-1 font-['Outfit'] text-base font-normal leading-6 text-zinc-800">{message}</div>
    </div>
  );
}
