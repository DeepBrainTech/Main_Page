import Image from "next/image";
import { useTranslations } from "next-intl";

const BACKGROUND_SQUARES = [
  { x: 640, y: 474, color: "#f4f8fb" },
  { x: 960, y: 314, color: "#f4f8fb" },
  { x: 1360, y: 634, color: "#f4f8fb" },
  { x: 720, y: 634, color: "#f4f8fb" },
  { x: 320, y: 714, color: "#f6fafe" },
  { x: 560, y: 874, color: "#f4f8fb" },
  { x: 1120, y: 714, color: "#f4f8fb" },
  { x: 1280, y: 314, color: "#f4f8fb" },
  { x: 1520, y: 874, color: "#f6fafe" },
  { x: 480, y: 234, color: "#f4f8fb" },
  { x: 560, y: 314, color: "#f4f8fb" },
  { x: 240, y: 474, color: "#f6fafe" },
  { x: 160, y: 314, color: "#f6fafe" },
  { x: 1600, y: 394, color: "#f6fafe" },
  { x: 1200, y: 154, color: "#f4f8fb" },
  { x: 1360, y: 234, color: "#f4f8fb" },
  { x: 880, y: 794, color: "#f4f8fb" },
  { x: 1040, y: 554, color: "#f4f8fb" },
  { x: 1440, y: 794, color: "#f6fafe" },
  { x: 1680, y: 714, color: "#f6fafe" },
] as const;

function BackgroundSquares() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 mx-auto h-full w-full max-w-[120rem]">
        {BACKGROUND_SQUARES.map((square) => (
          <span
            key={`${square.x}-${square.y}`}
            className="absolute block aspect-square w-[clamp(2.5rem,4.1667vw,5rem)]"
            style={{
              backgroundColor: square.color,
              left: `${(square.x / 1920) * 100}%`,
              top: `${(square.y / 1107) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** AI-powered learning tools section from the Figma 1394:10706 frame. */
export default function AIPoweredTools() {
  const t = useTranslations("figmaHome");

  return (
    <section className="relative isolate overflow-hidden bg-white px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28 2xl:min-h-[69.2rem] 2xl:px-0 2xl:py-0">
      <BackgroundSquares />

      <div className="relative mx-auto flex w-full max-w-[120rem] flex-col items-start gap-12 lg:gap-16 xl:flex-row xl:items-center xl:gap-8 2xl:block 2xl:h-[69.2rem]">
        <div className="relative z-10 w-full max-w-[44.875rem] xl:w-[43%] 2xl:absolute 2xl:left-[4.2708%] 2xl:top-[calc(50%-1.40625rem)] 2xl:w-[37.4%] 2xl:-translate-y-1/2">
          <div className="flex items-center gap-3 text-black">
            <Image src="/landing/AI-Powered/lightbulb.svg" alt="" width={40} height={40} className="size-10 shrink-0" aria-hidden="true" />
            <span className="font-app-body text-lg leading-9 sm:text-2xl">{t("aiPoweredEyebrow")}</span>
          </div>
          <h2 className="font-figma-heading mt-8 text-balance text-4xl font-bold leading-tight text-black sm:text-5xl 2xl:mt-10 2xl:text-[3rem] 2xl:leading-[3.75rem]">
            {t("aiPoweredTitle")}
          </h2>
          <p className="font-app-body mt-7 max-w-[36.25rem] text-pretty text-lg leading-relaxed text-black sm:text-2xl 2xl:mt-10 2xl:leading-[2.25rem]">
            {t("aiPoweredDescription")}
          </p>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[61rem] xl:ml-auto xl:mr-0 xl:w-[57%] 2xl:absolute 2xl:left-[49.1667%] 2xl:top-1/2 2xl:mx-0 2xl:w-[50.9%] 2xl:-translate-y-1/2">
          <Image
            src="/landing/AI-Powered/ai-powered-imac-frame.svg"
            alt=""
            width={977}
            height={950}
            sizes="(min-width: 1536px) 51vw, (min-width: 1280px) 57vw, 100vw"
            className="h-auto w-full"
            aria-hidden="true"
          />
          {/* Replace this screen layer with the final GIF or video when it is ready. */}
          <div
            className="absolute left-[2.85%] top-[2.8%] flex h-[64.2%] w-[97.15%] items-center justify-center overflow-hidden rounded-[2px] border border-[#cfe1eb] bg-[#e7f2f8]"
            role="img"
            aria-label={t("aiPoweredMediaPlaceholder")}
          >
            <span className="rounded-full border border-dashed border-[#8fb2c5] bg-white/70 px-4 py-2 font-app-body text-xs text-[#4d7185] sm:text-sm">
              {t("aiPoweredMediaPlaceholder")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
