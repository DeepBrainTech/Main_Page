"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n-navigation";
import Image from "next/image";
import { type MembershipPlan } from "@/components/features/membership/MembershipPlans";
import ProfileDialog from "@/components/features/profile/ProfileDialog";
import SettingsDialog from "@/components/features/settings/SettingsDialog";
import BalanceBadge from "@/components/layout/BalanceBadge";
import CoinHelpPopover from "@/components/layout/CoinHelpPopover";
import DiamondHelpPopover from "@/components/layout/DiamondHelpPopover";
import { useRewards } from "@/hooks/useRewards";
import {
  fetchAuthMeMembership,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationData,
} from "@/services/userApi";

export type AppTab = "dashboard" | "learning" | "test" | "brainGames" | "leaderboard";

type NotificationMessageParts = {
  before: string;
  highlight: string;
  after: string;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  messageParts: NotificationMessageParts | null;
  icon: string;
  time: string;
  iconSrc: string;
  iconAlt: string;
  iconBgClass: string;
  iconImgClass: string;
  unread: boolean;
};

function notificationIcon(icon: string): {
  src: string;
  alt: string;
  bgClass: string;
  imgClass: string;
} {
  switch (icon) {
    case "achievement":
      return {
        src: "/notification/achievement.svg",
        alt: "Achievement",
        bgClass: "bg-amber-100",
        imgClass: "h-5 w-5",
      };
    case "course_expire":
      return {
        src: "/notification/course_expire.svg",
        alt: "Course expiring",
        bgClass: "bg-purple-100",
        imgClass: "h-5 w-5",
      };
    case "purchase":
      return {
        src: "/notification/purchase.svg",
        alt: "Purchase successful",
        bgClass: "bg-rose-100",
        imgClass: "h-5 w-5",
      };
    case "subscription":
    default:
      return {
        src: "/notification/subscription.svg",
        alt: "Subscription",
        bgClass: "bg-blue-200",
        imgClass: "h-6 w-6",
      };
  }
}

function parseMessageParts(metadata: Record<string, unknown>): NotificationMessageParts | null {
  const before = metadata.message_before;
  const highlight = metadata.message_highlight;
  const after = metadata.message_after;
  if (
    typeof before === "string" &&
    typeof highlight === "string" &&
    typeof after === "string"
  ) {
    return { before, highlight, after };
  }
  return null;
}

function formatNotificationTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const createdAt = new Date(value);
  const elapsedMs = Date.now() - createdAt.getTime();
  if (!Number.isFinite(elapsedMs)) {
    return "";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (elapsedMs < minute) {
    return "Just now";
  }
  if (elapsedMs < hour) {
    const minutes = Math.max(1, Math.floor(elapsedMs / minute));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsedMs < day) {
    const hours = Math.floor(elapsedMs / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (elapsedMs < 2 * day) {
    return "Yesterday";
  }
  const days = Math.floor(elapsedMs / day);
  return `${days} days ago`;
}

function mapNotification(notification: UserNotificationData): NotificationItem {
  const icon = notificationIcon(notification.icon);
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    messageParts: parseMessageParts(notification.metadata ?? {}),
    icon: notification.icon,
    iconSrc: icon.src,
    iconAlt: icon.alt,
    iconBgClass: icon.bgClass,
    iconImgClass: icon.imgClass,
    time: formatNotificationTime(notification.created_at),
    unread: !notification.is_read,
  };
}

function NotificationMessage({ notification }: { notification: NotificationItem }) {
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

const NOTIFICATION_VISIBLE_LIMIT = 4;
const NOTIFICATION_LIST_GAP_PX = 12;
const NOTIFICATION_LIST_PADDING_Y_PX = 24;
const NOTIFICATION_FALLBACK_ITEM_HEIGHT_PX = 104;

function measureNotificationListCap(listRoot: HTMLElement): number | null {
  const items = Array.from(listRoot.querySelectorAll<HTMLElement>("[data-notification-item]"));
  if (items.length <= NOTIFICATION_VISIBLE_LIMIT) {
    return null;
  }

  let contentHeight = 0;
  for (let i = 0; i < NOTIFICATION_VISIBLE_LIMIT; i += 1) {
    if (i > 0) {
      contentHeight += NOTIFICATION_LIST_GAP_PX;
    }
    const measured = items[i].getBoundingClientRect().height || items[i].offsetHeight;
    contentHeight += measured;
  }

  if (contentHeight <= 0) {
    contentHeight =
      NOTIFICATION_VISIBLE_LIMIT * NOTIFICATION_FALLBACK_ITEM_HEIGHT_PX +
      (NOTIFICATION_VISIBLE_LIMIT - 1) * NOTIFICATION_LIST_GAP_PX;
  }

  return Math.ceil(contentHeight);
}

interface AppShellProps {
  activeTab: AppTab | null;
  tabHrefMap: Record<AppTab, string>;
  username: string;
  email?: string;
  /** Date of birth in YYYY-MM-DD format */
  dateOfBirth?: string | null;
  /** Country is optional */
  country?: string | null;
  /** Current user avatar URL. Falls back to local default when empty. */
  avatarUrl?: string | null;
  onLogout: () => void;
  /** Callback after profile update */
  onProfileUpdate?: () => void;
  children: React.ReactNode;
}

/**
 * Post-login shell: sidebar + top bar + content area
 */
export default function AppShell({
  activeTab,
  tabHrefMap,
  username,
  email,
  dateOfBirth,
  country,
  avatarUrl,
  onLogout,
  onProfileUpdate,
  children,
}: AppShellProps) {
  const tNav = useTranslations("nav");
  const tHome = useTranslations("dashboard");
  const tMembership = useTranslations("membership");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [membershipPlan, setMembershipPlan] = useState<MembershipPlan>("free");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationBellRef = useRef<HTMLButtonElement | null>(null);
  const notificationListRef = useRef<HTMLDivElement | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const notificationScrollRef = useRef<HTMLDivElement | null>(null);
  const [notificationListMaxHeight, setNotificationListMaxHeight] = useState<number | null>(null);
  const [notificationPanelPosition, setNotificationPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    arrowRight: number;
  } | null>(null);
  const notificationScrollIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notificationScrollActive, setNotificationScrollActive] = useState(false);
  const [notificationScrollbar, setNotificationScrollbar] = useState({
    canScroll: false,
    thumbHeight: 176,
    thumbTop: 0,
  });
  const { loading: rewardsLoading, coins, diamonds, flowers } = useRewards();

  const NOTIFICATION_PANEL_WIDTH = 465;

  const updateNotificationListHeight = () => {
    const listRoot = notificationListRef.current;
    if (!listRoot) {
      return;
    }
    setNotificationListMaxHeight(measureNotificationListCap(listRoot));
  };

  const updateNotificationPanelPosition = () => {
    const bellEl = notificationBellRef.current;
    const alignEl =
      document.querySelector<HTMLElement>("[data-brainpower-panel]") ??
      document.querySelector<HTMLElement>("main");
    if (!bellEl || !alignEl) {
      return;
    }

    const alignRect = alignEl.getBoundingClientRect();
    const bellRect = bellEl.getBoundingClientRect();
    const panelWidth = Math.min(NOTIFICATION_PANEL_WIDTH, window.innerWidth - 32);
    const left = Math.max(16, Math.round(alignRect.right - panelWidth));
    const top = Math.round(bellRect.bottom + 8);
    const bellCenterX = bellRect.left + bellRect.width / 2;
    const panelRight = left + panelWidth;
    const arrowRight = Math.round(panelRight - bellCenterX - 6);

    setNotificationPanelPosition({ top, left, width: panelWidth, arrowRight });
  };

  const updateNotificationScrollbar = () => {
    const el = notificationScrollRef.current;
    if (!el) {
      return;
    }

    const { scrollHeight, clientHeight, scrollTop } = el;
    const canScroll = scrollHeight > clientHeight + 1;

    if (!canScroll) {
      setNotificationScrollbar({ canScroll: false, thumbHeight: 176, thumbTop: 0 });
      return;
    }

    const trackHeight = clientHeight;
    const thumbHeight = Math.max(44, Math.round((clientHeight / scrollHeight) * trackHeight));
    const maxThumbTop = trackHeight - thumbHeight;
    const scrollRatio = scrollTop / (scrollHeight - clientHeight);
    const thumbTop = Math.round(scrollRatio * maxThumbTop);

    setNotificationScrollbar({ canScroll: true, thumbHeight, thumbTop });
  };

  const revealNotificationScrollbar = () => {
    updateNotificationScrollbar();
    setNotificationScrollActive(true);
    if (notificationScrollIdleRef.current) {
      clearTimeout(notificationScrollIdleRef.current);
    }
    notificationScrollIdleRef.current = setTimeout(() => {
      setNotificationScrollActive(false);
    }, 700);
  };
  const resolvedAvatarSrc = !avatarFailed && avatarUrl ? avatarUrl : "/dashboard/default.png";
  const hasUnreadNotifications = notifications.some((notification) => notification.unread);
  const notificationListNeedsScroll =
    !notificationsLoading && notifications.length > NOTIFICATION_VISIBLE_LIMIT;
  const notificationListScrollMaxHeight =
    notificationListMaxHeight !== null
      ? notificationListMaxHeight + NOTIFICATION_LIST_PADDING_Y_PX
      : notificationListNeedsScroll
        ? NOTIFICATION_VISIBLE_LIMIT * NOTIFICATION_FALLBACK_ITEM_HEIGHT_PX +
          (NOTIFICATION_VISIBLE_LIMIT - 1) * NOTIFICATION_LIST_GAP_PX +
          NOTIFICATION_LIST_PADDING_Y_PX
        : null;

  const markNotificationAsRead = (notificationId: number) => {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target?.unread) {
      return;
    }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, unread: false } : notification,
      ),
    );
    markNotificationRead(notificationId).catch(() => {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, unread: true } : notification,
        ),
      );
    });
  };

  useEffect(() => {
    const syncMembershipPlan = () => {
      fetchAuthMeMembership()
        .then((m) => {
          const p = m.membership_plan;
          if (p === "free" || p === "plus" || p === "premium") {
            setMembershipPlan(p);
          }
        })
        .catch(() => {});
    };

    syncMembershipPlan();
    window.addEventListener("membership-plan-change", syncMembershipPlan);
    return () => window.removeEventListener("membership-plan-change", syncMembershipPlan);
  }, []);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    let cancelled = false;
    setNotificationsLoading(true);
    fetchNotifications()
      .then(({ notifications: rows }) => {
        if (!cancelled) {
          setNotifications(rows.map(mapNotification));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (notificationScrollIdleRef.current) {
        clearTimeout(notificationScrollIdleRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) {
      setNotificationScrollActive(false);
    }
  }, [notificationsOpen]);

  useLayoutEffect(() => {
    if (!notificationsOpen) {
      setNotificationPanelPosition(null);
      setNotificationListMaxHeight(null);
      return;
    }

    const measureLayout = () => {
      updateNotificationPanelPosition();
      updateNotificationListHeight();
    };

    measureLayout();
    const raf1 = requestAnimationFrame(() => {
      measureLayout();
      requestAnimationFrame(measureLayout);
    });

    return () => cancelAnimationFrame(raf1);
  }, [notificationsOpen, activeTab, notifications, notificationsLoading]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    updateNotificationPanelPosition();
    updateNotificationScrollbar();

    const el = notificationScrollRef.current;
    const listRoot = notificationListRef.current;
    const scrollObserver =
      el || listRoot
        ? new ResizeObserver(() => {
            updateNotificationListHeight();
            updateNotificationScrollbar();
            updateNotificationPanelPosition();
          })
        : null;
    if (el && scrollObserver) {
      scrollObserver.observe(el);
    }
    if (listRoot && scrollObserver) {
      scrollObserver.observe(listRoot);
    }

    const onLayoutChange = () => {
      updateNotificationPanelPosition();
      updateNotificationScrollbar();
    };
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    return () => {
      scrollObserver?.disconnect();
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [notificationsOpen, notifications, notificationsLoading]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const panel = notificationPanelRef.current;
    if (!panel) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (!panel.contains(event.target as Node)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const scrollEl = notificationScrollRef.current;
      if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 1) {
        scrollEl.scrollTop += event.deltaY;
      }

      revealNotificationScrollbar();
    };

    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [notificationsOpen]);

  const tabs: { key: AppTab; label: string; iconSrc: string; iconAlt: string }[] = [
    { key: "dashboard", label: tHome("dashboardTab"), iconSrc: "/dashboard/dashboard.svg", iconAlt: "Dashboard" },
    { key: "learning", label: tNav("learning"), iconSrc: "/dashboard/learning.svg", iconAlt: "Learning" },
    { key: "brainGames", label: tNav("brainGames"), iconSrc: "/dashboard/brain_game.svg", iconAlt: "Brain Games" },
    { key: "leaderboard", label: tNav("leaderboard"), iconSrc: "/dashboard/leaderboard.svg", iconAlt: "Leaderboard" },
    { key: "test", label: tNav("test"), iconSrc: "/dashboard/test.svg", iconAlt: "Test" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] pb-8 text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-2 px-4 py-3 sm:min-h-[4.75rem] sm:gap-3 sm:px-6 sm:py-3.5 lg:min-h-24 lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center">
            <Image
              src="/dashboard/logo.png"
              alt="DeepBrain Technology logo"
              width={220}
              height={64}
              className="h-8 w-auto max-w-full object-contain sm:h-10 lg:h-12"
              priority
            />
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 xl:max-w-[759px]">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-2 md:gap-3">
              <div className="group relative">
                <button
                  type="button"
                  className="rounded-full"
                  aria-label={tHome("coins")}
                >
                  <BalanceBadge
                    iconSrc="/dashboard/coin.svg"
                    iconAlt="Coins"
                    value={coins}
                    variant="coin"
                    highlight
                    ready={!rewardsLoading}
                  />
                </button>
                <div
                  className="pointer-events-none invisible absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100"
                >
                  <CoinHelpPopover />
                </div>
              </div>
              <div className="group relative">
                <button
                  type="button"
                  className="rounded-full"
                  aria-label={tHome("diamonds")}
                >
                  <BalanceBadge
                    iconSrc="/dashboard/dimond.svg"
                    iconAlt="Diamonds"
                    value={diamonds}
                    variant="diamond"
                    highlight
                    ready={!rewardsLoading}
                  />
                </button>
                <div
                  className="pointer-events-none invisible absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100"
                >
                  <DiamondHelpPopover />
                </div>
              </div>
              <BalanceBadge
                iconSrc="/dashboard/flower.svg"
                iconAlt="Flowers"
                value={flowers}
                variant="flower"
                highlight
                ready={!rewardsLoading}
              />
            </div>

            <Link
              href="/shop"
              onClick={() => {
                setProfileOpen(false);
                setSettingsOpen(false);
                setNotificationsOpen(false);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl text-sky-700 hover:bg-indigo-100 sm:h-10 sm:w-10 sm:text-2xl md:h-11 md:w-11"
              aria-label={tNav("shop")}
            >
              <img src="/dashboard/shop.svg" alt="" width={20} height={20} className="h-5 w-5" />
            </Link>

            <div ref={notificationsRef} className="relative shrink-0">
              <button
                ref={notificationBellRef}
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  setSettingsOpen(false);
                  setNotificationsOpen((open) => !open);
                }}
                className="relative inline-flex size-9 shrink-0 flex-col items-start justify-start rounded-xl bg-indigo-50 px-2 pt-2 text-sky-700 hover:bg-indigo-100 sm:size-10 sm:px-2.5 sm:pt-2.5 md:size-11 md:px-3 md:pt-3"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <div className="relative size-5 shrink-0">
                  <img src="/notification/mail.svg" alt="" width={15} height={15} className="h-5 w-5" />
                  {hasUnreadNotifications ? (
                    <img
                      src="/notification/unread.svg"
                      alt=""
                      width={10}
                      height={10}
                      className="absolute bottom-0 right-0 h-2 w-2 translate-x-[2px] translate-y-[-1px]"
                      aria-hidden
                    />
                  ) : null}
                </div>
              </button>

              {notificationsOpen && notificationPanelPosition ? (
                <div
                  ref={notificationPanelRef}
                  className="fixed z-50 overscroll-contain pt-1.5 font-app-body"
                  style={{
                    top: notificationPanelPosition.top,
                    left: notificationPanelPosition.left,
                    width: notificationPanelPosition.width,
                  }}
                >
                  <div
                    className="absolute top-[1px] z-10"
                    style={{ right: notificationPanelPosition.arrowRight }}
                  >
                    <div className="h-3 w-3 -rotate-45 rounded-[2px] border-r border-t border-[#b9cfe5] bg-white" />
                  </div>

                  <div
                    className="relative w-full overflow-hidden overscroll-contain rounded-3xl bg-white shadow-[0px_20px_30px_0px_rgba(0,0,0,0.15)] outline outline-[1.2px] outline-offset-[-1.2px] outline-slate-300"
                  >
                    <div className="flex h-20 items-center justify-between px-6">
                      <h2 className="font-app-heading text-xl font-bold leading-8 text-sky-700">Notifications</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifications((current) =>
                            current.map((notification) => ({ ...notification, unread: false })),
                          );
                          markAllNotificationsRead().catch(() => {});
                        }}
                        className="text-sm font-medium leading-8 text-zinc-800/50 hover:text-zinc-800"
                      >
                        Mark all as read
                      </button>
                    </div>
                    <div className="mx-3 h-px bg-zinc-800/10" />

                    <div className="relative">
                      <div
                        ref={notificationScrollRef}
                        className={`notification-panel-scroll-hide overscroll-contain px-3 py-3 ${
                          notificationListNeedsScroll ? "overflow-y-auto" : "overflow-y-visible"
                        }`}
                        style={
                          notificationListScrollMaxHeight !== null
                            ? { maxHeight: notificationListScrollMaxHeight }
                            : undefined
                        }
                        onScroll={revealNotificationScrollbar}
                      >
                        <div ref={notificationListRef} className="space-y-3">
                        {notificationsLoading ? (
                          <div
                            data-notification-item
                            className="flex min-h-[104px] w-full items-center justify-center rounded-[10px] px-4 py-4 text-center text-sm text-slate-400"
                          >
                            Loading notifications...
                          </div>
                        ) : null}
                        {!notificationsLoading && notifications.length === 0 ? (
                          <div
                            data-notification-item
                            className="flex min-h-[104px] w-full items-center justify-center rounded-[10px] px-4 py-4"
                          >
                            <p className="text-center text-sm text-slate-400">No notifications yet.</p>
                          </div>
                        ) : null}
                        {!notificationsLoading && notifications.map((notification) => (
                          <div
                            key={notification.id}
                            data-notification-item
                            role={notification.unread ? "button" : undefined}
                            tabIndex={notification.unread ? 0 : undefined}
                            onClick={() => markNotificationAsRead(notification.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                markNotificationAsRead(notification.id);
                              }
                            }}
                            className={`flex w-full items-start gap-3 rounded-[10px] px-4 py-4 ${
                              notification.unread ? "bg-blue-50" : ""
                            } ${notification.unread ? "cursor-pointer" : ""}`}
                          >
                            <div
                              className={`flex size-10 shrink-0 items-center justify-center rounded-full px-2.5 ${notification.iconBgClass}`}
                            >
                              <img
                                src={notification.iconSrc}
                                alt={notification.iconAlt}
                                className={notification.iconImgClass}
                              />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                              <div className="flex w-full items-center justify-between gap-3">
                                <h3 className="min-w-0 flex-1 text-base font-semibold text-zinc-800">
                                  {notification.title}
                                </h3>
                                {notification.unread ? (
                                  <img
                                    src="/notification/unread.svg"
                                    alt="Unread"
                                    width={10}
                                    height={10}
                                    className="h-2 w-2 shrink-0"
                                  />
                                ) : null}
                              </div>
                              <NotificationMessage notification={notification} />
                              <p className="w-full text-xs font-normal leading-4 text-slate-400">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>

                      <div
                        className={`pointer-events-none absolute bottom-3 right-0 top-3 overflow-hidden transition-opacity duration-200 ${
                          notificationScrollActive && notificationScrollbar.canScroll
                            ? "w-2.5 opacity-100"
                            : "w-2.5 opacity-0"
                        }`}
                        aria-hidden
                      >
                        <div className="relative h-full w-2.5 rounded-[100px] bg-[#E8E8E8]">
                          <div
                            className="absolute left-0 w-2.5 rounded-[100px] bg-[#7A7A7A]"
                            style={{
                              height: `${notificationScrollbar.thumbHeight}px`,
                              top: `${notificationScrollbar.thumbTop}px`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setNotificationsOpen(false);
                setSettingsOpen(true);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl text-sky-700 hover:bg-indigo-100 sm:h-10 sm:w-10 sm:text-2xl md:h-11 md:w-11"
              aria-label={tNav("settings")}
            >
              {"\u2699"}
            </button>

            <Link
              href="/membership"
              className="shrink-0 transition hover:scale-105"
              aria-label={tMembership("statusLabel", { plan: tMembership(`plans.${membershipPlan}`) })}
            >
              <Image
                src={`/membership/${membershipPlan}.png`}
                alt=""
                width={150}
                height={50}
                className="h-4 w-auto object-contain sm:h-2 md:h-4"
              />
            </Link>

            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                setNotificationsOpen(false);
                setProfileOpen(true);
              }}
              className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white sm:h-10 sm:w-10 md:h-11 md:w-11"
              aria-label={tNav("profile")}
            >
              <img
                src={resolvedAvatarSrc}
                alt={tNav("profile")}
                className="h-full w-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
          {tabs.map(({ key, label, iconSrc, iconAlt }) => (
            <Link
              key={key}
              href={tabHrefMap[key]}
              prefetch
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeTab === key ? "bg-[#E45C44] text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Image src={iconSrc} alt={iconAlt} width={14} height={14} className="h-3.5 w-3.5" />
                <span>{label}</span>
              </span>
            </Link>
          ))}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-64 shrink-0 px-4 py-5 lg:block">
          <div className="sticky top-24 flex h-[calc(100vh-8rem)] min-h-[640px] flex-col rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
            <nav className="space-y-2">
              {tabs.map(({ key, label, iconSrc, iconAlt }) => (
                <Link
                  key={key}
                  href={tabHrefMap[key]}
                  prefetch
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                    activeTab === key
                      ? "bg-[#E45C44] text-white shadow-md shadow-red-200"
                      : "text-zinc-800 hover:bg-slate-100"
                  }`}
                >
                  <Image src={iconSrc} alt={iconAlt} width={18} height={18} className="h-[18px] w-[18px]" />
                  <span className="font-app-body text-base font-normal leading-5">{label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <span>{tHome("friends")}</span>
                <span>+</span>
              </div>
              <div className="space-y-2">
                {["Alex", "Maya", "Sam"].map((friendName) => (
                  <div key={friendName} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-2">
                    <div className="h-7 w-7 rounded-full bg-amber-100 text-center text-sm leading-7">{"\uD83D\uDE42"}</div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-700">{friendName}</div>
                      <div className="truncate text-[11px] text-sky-700">{tHome("friendStatus")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="px-4 pt-5 sm:px-6">{children}</main>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        username={username}
        email={email}
        dateOfBirth={dateOfBirth}
        country={country}
        avatarUrl={avatarUrl}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
}
