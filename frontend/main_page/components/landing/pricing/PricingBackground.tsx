const PRICING_SQUARES = [
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

/** Decorative squares from the pricing frame, scaled against the responsive section. */
export default function PricingBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="relative mx-auto h-full w-full max-w-[120rem]">
        {PRICING_SQUARES.map((square) => (
          <span
            key={`${square.x}-${square.y}`}
            className="absolute block size-[clamp(2.5rem,4.1667vw,5rem)]"
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
