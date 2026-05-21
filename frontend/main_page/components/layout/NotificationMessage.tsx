"use client";

import type { NotificationItem } from "@/lib/notifications";

export default function NotificationMessage({ notification }: { notification: NotificationItem }) {
  if (notification.messageParts) {
    const { before, highlight, after } = notification.messageParts;
    return (
      <p className="w-full text-sm font-normal leading-5 text-sky-700">
        {before}
        <span className="font-semibold">{highlight}</span>
        {after}
      </p>
    );
  }

  return <p className="w-full text-sm font-normal leading-5 text-sky-700">{notification.message}</p>;
}
