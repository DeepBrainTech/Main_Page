"use client";

import Image from "next/image";
import { dashboardCardClass } from "@/components/features/dashboard/dashboardCardStyles";

interface StatCardProps {
  iconSrc: string;
  iconAlt: string;
  iconBgColor: string;
  title: string;
  value: string;
}

/**
 * 顶部统计卡片
 */
export default function StatCard({ iconSrc, iconAlt, iconBgColor, title, value }: StatCardProps) {
  return (
    <div className={`${dashboardCardClass} p-5 xl:min-h-[8.4375rem] xl:p-6`}>
      <div className="mb-2 flex items-center gap-2 font-app-body text-lg font-semibold text-sky-700 xl:mb-3 xl:gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg xl:size-10 xl:rounded-xl" style={{ backgroundColor: iconBgColor }}>
          <Image src={iconSrc} alt={iconAlt} width={18} height={18} className="size-[18px] xl:size-6" />
        </span>
        <span>{title}</span>
      </div>
      <div className="text-2xl font-normal font-['Titan_One'] leading-none text-[#045E96] xl:text-[2rem]">{value}</div>
    </div>
  );
}
