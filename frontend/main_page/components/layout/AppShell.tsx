"use client";

import { useEffect, useRef, useState } from "react";
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

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  icon: string;
  time: string;
  iconSrc: string;
  iconAlt: string;
  unread: boolean;
};

function notificationIcon(icon: string): { src: string; alt: string } {
  if (icon === "purchase") {
    return { src: "/notification/purchase.svg", alt: "Purchase successful" };
  }
  return { src: "/notification/subscription.svg", alt: "Subscription" };
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
    icon: notification.icon,
    iconSrc: icon.src,
    iconAlt: icon.alt,
    time: formatNotificationTime(notification.created_at),
    unread: !notification.is_read,
  };
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
  const { loading: rewardsLoading, coins, diamonds, flowers } = useRewards();
  const resolvedAvatarSrc = !avatarFailed && avatarUrl ? avatarUrl : "/dashboard/default.png";
  const hasUnreadNotifications = notifications.some((notification) => notification.unread);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 pb-8 text-slate-800">
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
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  setSettingsOpen(false);
                  setNotificationsOpen((open) => !open);
                }}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sky-700 hover:bg-indigo-100 sm:h-10 sm:w-10 md:h-11 md:w-11"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <img src="/notification/mail.svg" alt="" width={20} height={20} className="h-5 w-5" />
                {hasUnreadNotifications ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F44F44]" aria-hidden="true" />
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="absolute right-[-130px] top-full z-50 mt-2 w-[465px] max-w-[calc(100vw-2rem)] pt-1.5 font-app-body">
                  <div className="absolute right-[148px] top-[1px] z-10">
                    <div className="h-3 w-3 -rotate-45 rounded-[2px] border-r border-t border-[#b9cfe5] bg-white" />
                  </div>

                  <div className="h-[588px] overflow-hidden rounded-3xl bg-white shadow-[0px_20px_30px_0px_rgba(0,0,0,0.15)] outline outline-[1.2px] outline-offset-[-1.2px] outline-slate-300">
                    <div className="flex h-20 items-center justify-between border-b border-zinc-800/10 px-6">
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

                    <div
                      className="max-h-[495px] overscroll-contain overflow-y-auto px-3 py-3"
                      onWheel={(event) => event.stopPropagation()}
                    >
                      <div className="space-y-3">
                        {notificationsLoading ? (
                          <div className="flex w-96 max-w-full items-center justify-center rounded-[10px] px-4 py-10 text-sm text-slate-400">
                            Loading notifications...
                          </div>
                        ) : null}
                        {!notificationsLoading && notifications.length === 0 ? (
                          <div className="flex w-96 max-w-full items-center justify-center rounded-[10px] px-4 py-10 text-sm text-slate-400">
                            No notifications yet.
                          </div>
                        ) : null}
                        {!notificationsLoading && notifications.map((notification) => (
                          <div
                            key={notification.id}
                            role={notification.unread ? "button" : undefined}
                            tabIndex={notification.unread ? 0 : undefined}
                            onClick={() => markNotificationAsRead(notification.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                markNotificationAsRead(notification.id);
                              }
                            }}
                            className={`flex w-96 max-w-full items-start gap-3 rounded-[10px] px-4 py-4 ${
                              notification.unread ? "bg-[#EFF6FF]" : "bg-white"
                            } ${notification.unread ? "cursor-pointer" : ""}`}
                          >
                            <img
                              src={notification.iconSrc}
                              alt={notification.iconAlt}
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="truncate text-base font-semibold text-zinc-800">
                                  {notification.title}
                                </h3>
                                {notification.unread ? (
                                  <img
                                    src="/notification/unread.svg"
                                    alt="Unread"
                                    width={10}
                                    height={10}
                                    className="h-2.5 w-2.5 shrink-0"
                                  />
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm font-normal leading-5 text-sky-700">{notification.message}</p>
                              <p className="mt-2 text-xs font-normal leading-4 text-slate-400">{notification.time}</p>
                            </div>
                          </div>
                        ))}
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
