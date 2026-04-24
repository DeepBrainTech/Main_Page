"use client";

import Image from "next/image";

interface GoodCoolChatPromptProps {
  label: string;
}

export default function GoodCoolChatPrompt({ label }: GoodCoolChatPromptProps) {
  return (
    <div className="flex h-12 w-[min(24rem,calc(100vw-4rem))] items-center gap-2 rounded-full border border-white/60 bg-white/80 px-5 shadow-sm backdrop-blur-md">
      <span className="min-w-0 flex-1 truncate font-['Outfit'] text-base font-normal leading-6 text-zinc-800/60">
        {label}
      </span>

      <button
        type="button"
        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full transition hover:opacity-80"
        aria-label={label}
      >
        <Image src="/dashboard/voice.svg" alt="" width={30} height={30} className="h-[30px] w-[30px]" aria-hidden />
      </button>

      <button
        type="button"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-800 text-white transition hover:bg-zinc-700"
        aria-label={label}
      >
        <Image src="/dashboard/send.svg" alt="" width={13} height={13} className="h-[13px] w-[13px]" aria-hidden />
      </button>
    </div>
  );
}
