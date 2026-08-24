interface CheckerBackgroundProps {
  className?: string;
  layout?: "default" | "frame1688";
}

const FIGMA_SQUARES = [
  { x: 640, y: 320, color: "#f4f8fb" },
  { x: 960, y: 160, color: "#f4f8fb" },
  { x: 1360, y: 480, color: "#f4f8fb" },
  { x: 720, y: 480, color: "#f4f8fb" },
  { x: 320, y: 560, color: "#f6fafe" },
  { x: 560, y: 720, color: "#f4f8fb" },
  { x: 1120, y: 560, color: "#f4f8fb" },
  { x: 1280, y: 160, color: "#f4f8fb" },
  { x: 1520, y: 720, color: "#f6fafe" },
  { x: 480, y: 80, color: "#f4f8fb" },
  { x: 560, y: 160, color: "#f4f8fb" },
  { x: 240, y: 320, color: "#f6fafe" },
  { x: 160, y: 160, color: "#f6fafe" },
  { x: 1600, y: 240, color: "#f6fafe" },
  { x: 1200, y: 0, color: "#f4f8fb" },
  { x: 1360, y: 80, color: "#f4f8fb" },
  { x: 880, y: 640, color: "#f4f8fb" },
  { x: 1040, y: 400, color: "#f4f8fb" },
  { x: 1440, y: 640, color: "#f6fafe" },
  { x: 1680, y: 560, color: "#f6fafe" },
] as const;

const FRAME_1688_SQUARES = [
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

/** Decorative squares positioned from the 1920px Figma landing-page layout. */
export default function CheckerBackground({ className = "", layout = "default" }: CheckerBackgroundProps) {
  if (layout === "frame1688") {
    return (
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
        <div className="absolute left-1/2 top-[13.91%] aspect-[2/1] w-[83.333333%] max-w-[100rem] -translate-x-1/2">
          {FRAME_1688_SQUARES.map((square) => (
            <span
              key={`${square.x}-${square.y}`}
              className="absolute block aspect-square w-[5%]"
              style={{
                backgroundColor: square.color,
                left: `${(square.x / 1600) * 100}%`,
                top: `${(square.y / 800) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 flex justify-center overflow-hidden ${className}`}>
      <div className="relative h-full w-full max-w-[120rem]">
        {FIGMA_SQUARES.map((square) => (
          <span
            key={`${square.x}-${square.y}`}
            className="absolute block size-[clamp(2.5rem,4.1667vw,5rem)]"
            style={{
              backgroundColor: square.color,
              left: `${(square.x / 1920) * 100}%`,
              top: `${(square.y / 800) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
