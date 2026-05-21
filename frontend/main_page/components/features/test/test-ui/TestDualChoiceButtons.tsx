import { testChoiceButtonClass } from "./testTheme";

interface TestDualChoiceButtonsProps {
  leftLabel: string;
  rightLabel: string;
  onLeft: () => void;
  onRight: () => void;
  selected?: "left" | "right" | null;
  disabled?: boolean;
}

/** 双选项按钮 In Set / Not in Set */
export default function TestDualChoiceButtons({
  leftLabel,
  rightLabel,
  onLeft,
  onRight,
  selected = null,
  disabled = false,
}: TestDualChoiceButtonsProps) {
  const idle = `${testChoiceButtonClass} bg-[#edf4fc] text-[#333] hover:bg-[#dceaf8]`;
  const active = `${testChoiceButtonClass} bg-[#d6e3f2] text-[#333] shadow-[0px_10px_15px_0px_rgba(214,227,242,0.4)]`;

  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-10">
      <button
        type="button"
        disabled={disabled}
        onClick={onLeft}
        className={selected === "left" ? active : idle}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onRight}
        className={selected === "right" ? active : idle}
      >
        {rightLabel}
      </button>
    </div>
  );
}
