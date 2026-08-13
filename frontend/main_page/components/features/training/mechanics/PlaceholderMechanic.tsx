"use client";

/**
 * Placeholder mechanic — real games live under mechanics/* later.
 * Does not touch cognitive test components.
 */
export default function PlaceholderMechanic({
  title,
  onComplete,
}: {
  title: string;
  onComplete: (stars: 0 | 1 | 2 | 3) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-dashed border-[#A0C4DB]/80 bg-[#F6FAFE] p-6">
      <p className="text-sm text-[#106FAA]">
        Mechanic placeholder for <span className="font-semibold">{title}</span>. Wire a real task
        component here later.
      </p>
      <div className="flex flex-wrap gap-2">
        {([0, 1, 2, 3] as const).map((stars) => (
          <button
            key={stars}
            type="button"
            onClick={() => onComplete(stars)}
            className="rounded-full bg-[#045E96] px-4 py-2 text-sm font-semibold text-white"
          >
            Simulate {stars}★
          </button>
        ))}
      </div>
    </div>
  );
}
