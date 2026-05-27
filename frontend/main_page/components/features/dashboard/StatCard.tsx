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
    <div className={`${dashboardCardClass} p-5`}>
      <div className="mb-2 flex items-center gap-2 font-app-body text-lg font-semibold text-sky-700">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: iconBgColor }}>
          <Image src={iconSrc} alt={iconAlt} width={18} height={18} className="h-[18px] w-[18px]" />
        </span>
        <span>{title}</span>
      </div>
      <div className="text-2xl font-normal font-['Titan_One'] leading-none text-[#045E96]">{value}</div>
    </div>
  );
}
