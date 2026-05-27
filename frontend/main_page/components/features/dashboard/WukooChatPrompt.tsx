"use client";

import Image from "next/image";
import { FormEvent } from "react";

interface WukooChatPromptProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function WukooChatPrompt({
  label,
  value,
  disabled = false,
  onChange,
  onSubmit,
}: WukooChatPromptProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(event) => event.stopPropagation()}
      className="flex h-[clamp(2.5rem,5vw,3rem)] w-full min-w-0 items-center gap-[clamp(0.35rem,1vw,0.5rem)] rounded-full border border-white/60 bg-white/85 px-[clamp(0.75rem,2vw,1.25rem)] shadow-sm backdrop-blur-md"
    >
      <input
        type="text"
        value={value}
        disabled={disabled}
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent font-app-body text-[clamp(0.78rem,1.7vw,1rem)] font-normal leading-6 text-zinc-800 outline-none placeholder:text-zinc-800/50 disabled:cursor-wait"
      />

      <button
        type="button"
        disabled={disabled}
        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full transition hover:opacity-80"
        aria-label={label}
      >
        <Image src="/home-system/chat/voice.svg" alt="" width={30} height={30} className="h-[30px] w-[30px]" aria-hidden />
      </button>

      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-800 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
        aria-label={label}
      >
        <Image src="/home-system/chat/send.svg" alt="" width={13} height={13} className="h-[13px] w-[13px]" aria-hidden />
      </button>
    </form>
  );
}
