"use client";

import { useTranslations } from "next-intl";
import BalanceHelpPopover from "@/components/layout/BalanceHelpPopover";

export default function CoinHelpPopover() {
  const tNav = useTranslations("nav");

  return (
    <BalanceHelpPopover
      title={tNav("coinHelpTitle")}
      rewardIconSrc="/dashboard/coin.svg"
      rewardIconAlt="Coins"
      rows={[
        { label: tNav("coinHelpDailyTasks"), value: 50 },
        { label: tNav("coinHelpDailyCheckIn"), value: 50 },
        { label: tNav("coinHelpSevenDayStreak"), value: 200 },
        { label: tNav("coinHelpGameBadges") },
        { label: tNav("coinHelpBuyInShop") },
      ]}
    />
  );
}
