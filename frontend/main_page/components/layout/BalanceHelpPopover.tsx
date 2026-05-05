"use client";

import Image from "next/image";

export interface BalanceHelpRow {
  label: string;
  value?: number;
}

interface BalanceHelpPopoverProps {
  title: string;
  rows: BalanceHelpRow[];
  rewardIconSrc: string;
  rewardIconAlt: string;
}

export default function BalanceHelpPopover({ title, rows, rewardIconSrc, rewardIconAlt }: BalanceHelpPopoverProps) {
  return (
    <div className="relative w-[320px] pt-1.5 font-app-body">
      <div className="absolute left-1/2 top-[1px] z-10 -translate-x-1/2">
        <div className="h-3 w-3 -rotate-45 rounded-[2px] border-r border-t border-[#b9cfe5] bg-[#f8fbff]" />
      </div>
      <div className="w-full rounded-[9.6px] border border-[#b9cfe5] bg-[#f8fbff] px-5 py-4 shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
        <div className="mb-1.5 text-base font-semibold leading-6 text-sky-700">{title}</div>
        <div className="flex flex-col gap-1.5">
          {rows.map(({ label, value }, index) => (
            <div key={`${index}-${label}`} className="flex w-full min-w-0 items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <span className="text-base font-normal leading-6 text-sky-700">{label}</span>
                {typeof value === "number" ? (
                  <>
                    <Image
                      src={rewardIconSrc}
                      alt={rewardIconAlt}
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 object-contain"
                    />
                    <span className="text-base font-medium leading-6 text-sky-700">{value}</span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
