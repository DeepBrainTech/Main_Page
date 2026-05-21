"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationsApi";
import {
  mapNotification,
  measureNotificationListCap,
  NOTIFICATION_FALLBACK_ITEM_HEIGHT_PX,
  NOTIFICATION_LIST_GAP_PX,
  NOTIFICATION_LIST_PADDING_Y_PX,
  NOTIFICATION_PANEL_WIDTH,
  NOTIFICATION_VISIBLE_LIMIT,
  type NotificationItem,
} from "@/lib/notifications";

export function useNotifications(activeTab: string | null) {
  const tNotifications = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | null>(null);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    arrowRight: number;
  } | null>(null);
  const scrollIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollActive, setScrollActive] = useState(false);
  const [scrollbar, setScrollbar] = useState({
    canScroll: false,
    thumbHeight: 176,
    thumbTop: 0,
  });

  const mapRow = useCallback(
    (row: Parameters<typeof mapNotification>[0]) => mapNotification(row, tNotifications),
    [tNotifications],
  );

  const updateListHeight = useCallback(() => {
    const listRoot = listRef.current;
    if (!listRoot) return;
    setListMaxHeight(measureNotificationListCap(listRoot));
  }, []);

  const updatePanelPosition = useCallback(() => {
    const bellEl = bellRef.current;
    const alignEl =
      document.querySelector<HTMLElement>("[data-brainpower-panel]") ??
      document.querySelector<HTMLElement>("main");
    if (!bellEl || !alignEl) return;

    const alignRect = alignEl.getBoundingClientRect();
    const bellRect = bellEl.getBoundingClientRect();
    const panelWidth = Math.min(NOTIFICATION_PANEL_WIDTH, window.innerWidth - 32);
    const left = Math.max(16, Math.round(alignRect.right - panelWidth));
    const top = Math.round(bellRect.bottom + 8);
    const bellCenterX = bellRect.left + bellRect.width / 2;
    const panelRight = left + panelWidth;
    const arrowRight = Math.round(panelRight - bellCenterX - 6);

    setPanelPosition({ top, left, width: panelWidth, arrowRight });
  }, []);

  const updateScrollbar = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollHeight, clientHeight, scrollTop } = el;
    const canScroll = scrollHeight > clientHeight + 1;

    if (!canScroll) {
      setScrollbar({ canScroll: false, thumbHeight: 176, thumbTop: 0 });
      return;
    }

    const trackHeight = clientHeight;
    const thumbHeight = Math.max(44, Math.round((clientHeight / scrollHeight) * trackHeight));
    const maxThumbTop = trackHeight - thumbHeight;
    const scrollRatio = scrollTop / (scrollHeight - clientHeight);
    const thumbTop = Math.round(scrollRatio * maxThumbTop);

    setScrollbar({ canScroll: true, thumbHeight, thumbTop });
  }, []);

  const revealScrollbar = useCallback(() => {
    updateScrollbar();
    setScrollActive(true);
    if (scrollIdleRef.current) {
      clearTimeout(scrollIdleRef.current);
    }
    scrollIdleRef.current = setTimeout(() => {
      setScrollActive(false);
    }, 700);
  }, [updateScrollbar]);

  const hasUnread = notifications.some((n) => n.unread);
  const listNeedsScroll = !loading && notifications.length > NOTIFICATION_VISIBLE_LIMIT;
  const listScrollMaxHeight =
    listMaxHeight !== null
      ? listMaxHeight + NOTIFICATION_LIST_PADDING_Y_PX
      : listNeedsScroll
        ? NOTIFICATION_VISIBLE_LIMIT * NOTIFICATION_FALLBACK_ITEM_HEIGHT_PX +
          (NOTIFICATION_VISIBLE_LIMIT - 1) * NOTIFICATION_LIST_GAP_PX +
          NOTIFICATION_LIST_PADDING_Y_PX
        : null;

  const markAsRead = useCallback(
    (notificationId: number) => {
      const target = notifications.find((n) => n.id === notificationId);
      if (!target?.unread) return;
      setNotifications((current) =>
        current.map((n) => (n.id === notificationId ? { ...n, unread: false } : n)),
      );
      markNotificationRead(notificationId).catch(() => {
        setNotifications((current) =>
          current.map((n) => (n.id === notificationId ? { ...n, unread: true } : n)),
        );
      });
    },
    [notifications],
  );

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((n) => ({ ...n, unread: false })));
    markAllNotificationsRead().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNotifications()
      .then(({ notifications: rows }) => {
        if (!cancelled) {
          setNotifications(rows.map(mapRow));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mapRow]);

  useEffect(() => {
    return () => {
      if (scrollIdleRef.current) {
        clearTimeout(scrollIdleRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setScrollActive(false);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      setListMaxHeight(null);
      return;
    }

    const measureLayout = () => {
      updatePanelPosition();
      updateListHeight();
    };

    measureLayout();
    const raf1 = requestAnimationFrame(() => {
      measureLayout();
      requestAnimationFrame(measureLayout);
    });

    return () => cancelAnimationFrame(raf1);
  }, [open, activeTab, notifications, loading, updatePanelPosition, updateListHeight]);

  useEffect(() => {
    if (!open) return;

    updatePanelPosition();
    updateScrollbar();

    const el = scrollRef.current;
    const listRoot = listRef.current;
    const scrollObserver =
      el || listRoot
        ? new ResizeObserver(() => {
            updateListHeight();
            updateScrollbar();
            updatePanelPosition();
          })
        : null;
    if (el && scrollObserver) scrollObserver.observe(el);
    if (listRoot && scrollObserver) scrollObserver.observe(listRoot);

    const onLayoutChange = () => {
      updatePanelPosition();
      updateScrollbar();
    };
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    return () => {
      scrollObserver?.disconnect();
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, notifications, loading, updatePanelPosition, updateScrollbar, updateListHeight]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const onWheel = (event: WheelEvent) => {
      if (!panel.contains(event.target as Node)) return;

      event.preventDefault();
      event.stopPropagation();

      const scrollEl = scrollRef.current;
      if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 1) {
        scrollEl.scrollTop += event.deltaY;
      }

      revealScrollbar();
    };

    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, [open, revealScrollbar]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return {
    open,
    setOpen,
    notifications,
    loading,
    hasUnread,
    listNeedsScroll,
    listScrollMaxHeight,
    panelPosition,
    scrollActive,
    scrollbar,
    containerRef,
    bellRef,
    listRef,
    panelRef,
    scrollRef,
    markAsRead,
    markAllRead,
    revealScrollbar,
  };
}
