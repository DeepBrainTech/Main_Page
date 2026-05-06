"use client";

type UnlockBannerProps = {
  title: string;
  description: string;
  buttonLabel: string;
  className?: string;
  onUnlockClick?: () => void;
};

export default function UnlockBanner({
  title,
  description,
  buttonLabel,
  className = "",
  onUnlockClick,
}: UnlockBannerProps) {
  return (
    <article
      className={`flex flex-col gap-5 rounded-[18px] bg-[#FFD22E] px-7 py-10 shadow-[0px_12px_20px_0px_rgba(125,77,0,0.16)] md:flex-row md:items-center md:justify-between ${className}`.trim()}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF6D6]/80 shadow-[0px_4px_10px_rgba(0,0,0,0.16)]">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5 fill-none stroke-[#7A4500] stroke-2"
          >
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-semibold leading-7 text-[#7A4500]">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-[#7A4500]">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onUnlockClick}
        className="flex h-12 min-w-44 items-center justify-center gap-2 rounded-full bg-[#704000] px-8 text-base font-semibold text-white shadow-[0px_8px_16px_0px_rgba(0,0,0,0.20)] transition hover:bg-[#5D3500]"
      >
        <span>{buttonLabel}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-white stroke-2">
          <path d="m6 3 5 5-5 5" />
        </svg>
      </button>
    </article>
  );
}
