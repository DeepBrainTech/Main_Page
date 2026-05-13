"use client";

import { useTranslations } from "next-intl";
import BalanceHelpPopover from "@/components/layout/BalanceHelpPopover";

export default function DiamondHelpPopover() {
  const tNav = useTranslations("nav");

  return (
    <BalanceHelpPopover
      title={tNav("diamondHelpTitle")}
      rewardIconSrc="/dashboard/dimond.svg"
      rewardIconAlt="Diamonds"
      rows={[
        { label: tNav("diamondHelpAllDailyTasks"), value: 2 },
        { label: tNav("diamondHelpSevenDayStreak"), value: 5 },
        { label: tNav("diamondHelpGameBadges") },
        { label: tNav("diamondHelpBuyInShop") },
      ]}
    />
  );
}
