"use client";

import Image from "next/image";
import type { NotificationItem } from "@/lib/notifications";

const assetIcons = {
  coins: { src: "/dashboard/coin.svg", alt: "Coins" },
  diamonds: { src: "/dashboard/dimond.svg", alt: "Diamonds" },
  flowers: { src: "/dashboard/flower.svg", alt: "Flowers" },
} as const;

function renderMessageText(text: string, emphasize = false) {
  const pieces = text.split(/\[\[asset:(coins|diamonds|flowers)\]\]/g);
  return pieces.map((piece, index) => {
    if (piece in assetIcons) {
      const asset = assetIcons[piece as keyof typeof assetIcons];
      return (
        <Image
          key={`asset-${index}`}
          src={asset.src}
          alt={asset.alt}
          width={16}
          height={16}
          className="mx-0.5 inline-block h-4 w-4 align-[-3px] object-contain"
        />
      );
    }
    return emphasize ? (
      <span key={`text-${index}`} className="font-semibold">
        {piece}
      </span>
    ) : (
      piece
    );
  });
}

export default function NotificationMessage({ notification }: { notification: NotificationItem }) {
  if (notification.messageParts) {
    const { before, highlight, after } = notification.messageParts;
    return (
      <p className="w-full text-sm font-normal leading-5 text-sky-700">
        {renderMessageText(before)}
        {renderMessageText(highlight, true)}
        {renderMessageText(after)}
      </p>
    );
  }

  return (
    <p className="w-full text-sm font-normal leading-5 text-sky-700">
      {renderMessageText(notification.message)}
    </p>
  );
}
