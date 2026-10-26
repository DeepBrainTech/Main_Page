"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import GamePreviewCarousel from "./GamePreviewCarousel";
import type { GameMediaItem } from "@/types/gameMedia";

export default function GameMediaGallery({ previews, tutorials, gameName }: {
  previews: GameMediaItem[]; tutorials: GameMediaItem[]; gameName: string;
}) {
  const t = useTranslations("gameDetails");
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedTutorial, setSelectedTutorial] = useState<number | null>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const activeImage = selected === null ? null : previews[selected];
  const activeTutorial = selectedTutorial === null ? null : tutorials[selectedTutorial];
  const markFailed = (key: string) => setFailed((previous) => new Set([...previous, key]));

  useEffect(() => {
    if (selected === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") { event.preventDefault(); setSelected((value) => value === null ? null : (value + 1) % previews.length); }
      if (event.key === "ArrowLeft") { event.preventDefault(); setSelected((value) => value === null ? null : (value - 1 + previews.length) % previews.length); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, previews.length]);

  return (
    <>
      <section className="mt-9" aria-labelledby="preview-title">
        <h2 id="preview-title" className="text-lg font-semibold">{t("preview")}</h2>
        {previews.length ? (
          <GamePreviewCarousel previews={previews} gameName={gameName} failed={failed} onSelect={setSelected} onImageError={markFailed} />
        ) : <p className="mt-4 rounded-2xl bg-[#EDF4FC] p-6 text-sm text-[#66758D]">{t("previewEmpty")}</p>}
      </section>
      <section className="mt-10" aria-labelledby="tutorial-title">
        <h2 id="tutorial-title" className="text-lg font-semibold">{t("howToPlay")}</h2>
        {tutorials.length ? (
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {tutorials.map((item, index) => (
              <button key={item.key} type="button" aria-label={t("playTutorial", { count: index + 1 })}
                onClick={() => {
                  setFailed((previous) => { const next = new Set(previous); next.delete(item.key); return next; });
                  setSelectedTutorial(index);
                }}
                className="group relative aspect-video overflow-hidden rounded-2xl bg-[#0B2439] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0075FF]">
                <video muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true"
                  onLoadedMetadata={(event) => { event.currentTarget.currentTime = 0.1; }}
                  className="pointer-events-none h-full w-full object-cover" src={item.url} />
                <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/30" aria-hidden="true">
                  <span className="flex size-10 items-center justify-center rounded-full bg-white/95 text-[#045E96] shadow-md sm:size-12">
                    <Image src="/game-details/PlayIconTriangle.svg" alt="" width={20} height={20} className="brightness-0" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : <p className="mt-4 rounded-2xl bg-[#EDF4FC] p-6 text-sm text-[#66758D]">{t("tutorialEmpty")}</p>}
      </section>
      {activeTutorial && selectedTutorial !== null ? (
        <Modal labelledBy="tutorial-dialog-title" onClose={() => setSelectedTutorial(null)} className="max-w-6xl rounded-3xl">
          <div className="flex items-center justify-between gap-4 p-4">
            <h2 id="tutorial-dialog-title" className="font-semibold">{t("howToPlay")}</h2>
            <button type="button" onClick={() => setSelectedTutorial(null)} className="rounded-full bg-[#EDF4FC] px-4 py-2">{t("close")}</button>
          </div>
          {failed.has(activeTutorial.key) ? <p role="status" className="p-6 text-sm">{t("videoError")}</p> : (
            <video key={activeTutorial.key} controls autoPlay playsInline preload="auto"
              aria-label={t("tutorialNumber", { count: selectedTutorial + 1 })}
              onError={() => markFailed(activeTutorial.key)}
              className="aspect-video max-h-[75dvh] w-full bg-[#0B2439]" src={activeTutorial.url} />
          )}
        </Modal>
      ) : null}
      {activeImage && selected !== null ? (
        <Modal labelledBy="preview-dialog-title" onClose={() => setSelected(null)} className="max-w-6xl rounded-3xl">
          <div className="flex items-center justify-between gap-4 p-4">
            <h2 id="preview-dialog-title" className="font-semibold">{t("previewAlt", { game: gameName, count: selected + 1 })}</h2>
            <button type="button" onClick={() => setSelected(null)} className="rounded-full bg-[#EDF4FC] px-4 py-2">{t("close")}</button>
          </div>
          <div className="relative aspect-video bg-[#EDF4FC]">
            {failed.has(activeImage.key) ? <p className="p-6">{t("imageError")}</p> : <Image key={activeImage.key} src={activeImage.url} alt={t("previewAlt", { game: gameName, count: selected + 1 })} fill unoptimized sizes="100vw" className="object-contain" onError={() => markFailed(activeImage.key)} />}
          </div>
          {previews.length > 1 ? <div className="flex items-center justify-between p-4">
            <button type="button" onClick={() => setSelected((selected - 1 + previews.length) % previews.length)} className="rounded-full bg-[#EDF4FC] px-4 py-2">{t("previous")}</button>
            <span aria-live="polite">{selected + 1} / {previews.length}</span>
            <button type="button" onClick={() => setSelected((selected + 1) % previews.length)} className="rounded-full bg-[#EDF4FC] px-4 py-2">{t("next")}</button>
          </div> : null}
        </Modal>
      ) : null}
    </>
  );
}
