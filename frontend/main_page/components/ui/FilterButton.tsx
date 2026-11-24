import type { ComponentPropsWithoutRef } from "react";

type FilterButtonProps = Omit<ComponentPropsWithoutRef<"button">, "type" | "aria-pressed" | "className"> & {
  selected: boolean;
};

export default function FilterButton({ selected, ...props }: FilterButtonProps) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={selected}
      className={`min-h-10 rounded-xl border border-[#045E96] px-5 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#045E96] ${selected ? "bg-[#045E96] text-white" : "text-[#045E96] hover:bg-[#EDF4FC]"}`}
    />
  );
}
