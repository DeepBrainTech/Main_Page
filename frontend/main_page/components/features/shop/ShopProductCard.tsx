"use client";

import Image from "next/image";

interface ShopProductCardProps {
  title: string;
  price: string;
  iconSrc: string;
  iconAlt: string;
  badge?: string;
  disabled?: boolean;
  onPurchase: () => void;
}

export default function ShopProductCard({
  title,
  price,
  iconSrc,
  iconAlt,
  badge,
  disabled = false,
  onPurchase,
}: ShopProductCardProps) {
  return (
    <article className="relative flex h-72 w-full overflow-hidden flex-col items-start justify-start gap-6 rounded-3xl bg-white/60 px-6 pt-6 shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60 backdrop-blur-sm">
      {badge ? (
        <div className="absolute right-[-2.8rem] top-7 w-40 rotate-45 bg-gradient-to-b from-yellow-300 to-yellow-400 py-1.5 text-center font-app-body text-sm font-semibold leading-4 text-white">
          {badge}
        </div>
      ) : null}

      <div className="flex h-32 w-full items-center justify-center">
        <Image src={iconSrc} alt={iconAlt} width={96} height={96} className="h-24 w-24 object-contain" />
      </div>

      <h2 className="flex h-7 w-full items-center justify-center overflow-hidden text-center font-app-body text-xl font-semibold leading-7 text-sky-700">
        <span className="truncate">{title}</span>
      </h2>

      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[100px] bg-[#E45C44] py-4 text-center font-app-body text-xl font-semibold leading-7 text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] transition-colors hover:bg-[#d94f39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E45C44] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled}
        onClick={onPurchase}
      >
        {price}
      </button>
    </article>
  );
}
