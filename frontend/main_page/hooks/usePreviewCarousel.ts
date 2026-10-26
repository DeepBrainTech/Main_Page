"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Size a single row to reveal 20% of the next card when more items are available. */
export function usePreviewCarousel(itemCount: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollbar, setScrollbar] = useState({ value: 0, max: 0, thumbWidth: 32 });
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const dragging = useRef(false);

  const showScrollbar = useCallback(() => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    setScrollbarVisible(true);
    if (!dragging.current) {
      hideTimer.current = window.setTimeout(() => setScrollbarVisible(false), 1500);
    }
  }, []);

  useEffect(() => () => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateNavigation = () => {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const value = Math.max(0, Math.min(max, track.scrollLeft));
      const thumbWidth = Math.max(32, (track.clientWidth - 8) * track.clientWidth / Math.max(1, track.scrollWidth));
      setScrollbar((current) => current.value === value && current.max === max && current.thumbWidth === thumbWidth
        ? current : { value, max, thumbWidth });
    };
    const measure = () => {
      const styles = getComputedStyle(track);
      const width = track.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const gap = parseFloat(styles.columnGap) || 0;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const columns = width >= 48 * rem ? 3 : width >= 32 * rem ? 2 : 1;
      const hasMore = itemCount > columns;
      const cardWidth = (width - gap * (hasMore ? columns : columns - 1)) / (columns + (hasMore ? 0.2 : 0));
      track.style.setProperty("--preview-card-width", `${Math.max(1, cardWidth)}px`);
      updateNavigation();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    const handleScroll = () => {
      updateNavigation();
      showScrollbar();
    };
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", handleScroll);
    };
  }, [itemCount, showScrollbar]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    const firstCard = track?.firstElementChild;
    if (!track || !(firstCard instanceof HTMLElement)) return;
    showScrollbar();
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const startScrollbarDrag = () => {
    dragging.current = true;
    if (trackRef.current) trackRef.current.style.scrollSnapType = "none";
    showScrollbar();
  };

  const finishScrollbarDrag = () => {
    dragging.current = false;
    if (trackRef.current) trackRef.current.style.scrollSnapType = "";
    showScrollbar();
  };

  const scrollTo = (value: number) => {
    if (trackRef.current) trackRef.current.scrollLeft = value;
    showScrollbar();
  };

  return {
    trackRef, move, scrollbar, scrollbarVisible, showScrollbar,
    startScrollbarDrag, finishScrollbarDrag, scrollTo,
    navigation: { previous: scrollbar.value > 1, next: scrollbar.max - scrollbar.value > 1 },
  };
}
