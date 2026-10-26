"use client";

import Image from "next/image";
import { useId, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { usePreviewCarousel } from "@/hooks/usePreviewCarousel";
import type { GameMediaItem } from "@/types/gameMedia";

interface GamePreviewCarouselProps {
  previews: GameMediaItem[];
  gameName: string;
  failed: ReadonlySet<string>;
  onSelect: (index: number) => void;
  onImageError: (key: string) => void;
}

export default function GamePreviewCarousel({ previews, gameName, failed, onSelect, onImageError }: GamePreviewCarouselProps) {
  const t = useTranslations("gameDetails");
  const trackId = useId();
  const {
    trackRef, navigation, move, scrollbar, scrollbarVisible, showScrollbar,
    startScrollbarDrag, finishScrollbarDrag, scrollTo,
  } = usePreviewCarousel(previews.length);
  const arrowClassName = "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#DDEDFF] bg-white text-[#045E96] shadow-md transition hover:bg-[#EDF4FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0075FF]";

  return (
    <div className="relative mt-4" onPointerDownCapture={showScrollbar} onWheelCapture={showScrollbar} onFocusCapture={showScrollbar}>
      <div id={trackId} ref={trackRef} role="region" aria-labelledby="preview-title" tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
        className="grid snap-x snap-mandatory scroll-px-1 grid-flow-col auto-cols-[var(--preview-card-width,85%)] gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0075FF]">
        {previews.map((item, index) => (
          <button key={item.key} type="button" disabled={failed.has(item.key)} onClick={() => onSelect(index)}
            aria-label={t("openPreview", { game: gameName, count: index + 1 })}
            className="relative aspect-[3/2] min-w-0 snap-start overflow-hidden rounded-3xl bg-[#EDF4FC] transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0075FF]">
            {failed.has(item.key) ? <span className="p-4 text-sm">{t("imageError")}</span> : (
              <Image src={item.url} alt={t("previewAlt", { game: gameName, count: index + 1 })} fill unoptimized sizes="(max-width: 640px) 85vw, 33vw" className="object-cover" onError={() => onImageError(item.key)} />
            )}
          </button>
        ))}
      </div>
      {scrollbar.max > 1 ? (
        <input type="range" min={0} max={scrollbar.max} step="any" value={scrollbar.value}
          aria-label={t("scrollPreviews")} aria-controls={trackId}
          onChange={(event) => scrollTo(event.currentTarget.valueAsNumber)}
          onPointerDown={startScrollbarDrag} onPointerUp={finishScrollbarDrag}
          onPointerCancel={finishScrollbarDrag} onLostPointerCapture={finishScrollbarDrag}
          onBlur={finishScrollbarDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              move(event.key === "ArrowRight" ? 1 : -1);
            }
          }}
          style={{ "--preview-thumb-width": `${scrollbar.thumbWidth}px` } as CSSProperties}
          className={`absolute -bottom-6 left-1 h-6 w-[calc(100%-0.5rem)] cursor-pointer appearance-none bg-transparent transition-opacity duration-500 motion-reduce:transition-none focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0075FF] [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#DDEDFF] [&::-webkit-slider-thumb]:-mt-px [&::-webkit-slider-thumb]:h-1.5 [&::-webkit-slider-thumb]:w-[var(--preview-thumb-width)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#318EFF] [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[#DDEDFF] [&::-moz-range-thumb]:h-1.5 [&::-moz-range-thumb]:w-[var(--preview-thumb-width)] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#318EFF] ${scrollbarVisible ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      ) : null}
      {navigation.previous ? (
        <button type="button" aria-label={t("previousPreviews")} onClick={() => move(-1)} className={`${arrowClassName} -left-9`}>
          <Image src="/game-details/ArrowLeft.svg" alt="" width={16} height={16} />
        </button>
      ) : null}
      {navigation.next ? (
        <button type="button" aria-label={t("nextPreviews")} onClick={() => move(1)} className={`${arrowClassName} -right-9`}>
          <Image src="/game-details/ArrowLeft.svg" alt="" width={16} height={16} className="rotate-180" />
        </button>
      ) : null}
    </div>
  );
}
