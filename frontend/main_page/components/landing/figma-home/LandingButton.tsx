"use client";

import Image from "next/image";
interface LandingButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

/** Shared primary action used throughout the Figma landing page. */
export default function LandingButton({ children, onClick, className = "" }: LandingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-app-body inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#045e96] px-8 py-3 text-base font-semibold text-white transition hover:bg-[#034d7b] focus:outline-none focus:ring-4 focus:ring-[#045e96]/20 ${className}`}
    >
      {children}
      <Image
        src="/landing/hero/start-learning.svg"
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
        className="size-6"
      />
    </button>
  );
}
