"use client";

import { useEffect, useRef, useState } from "react";

export function useTypewriterText(
  text: string,
  enabled = true,
  intervalMs = 18,
  onVisibleTextChange?: () => void,
  onComplete?: () => void
) {
  const [visibleText, setVisibleText] = useState(enabled ? "" : text);
  const onVisibleTextChangeRef = useRef(onVisibleTextChange);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onVisibleTextChangeRef.current = onVisibleTextChange;
  }, [onVisibleTextChange]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled) {
      setVisibleText(text);
      return;
    }

    setVisibleText("");
    if (!text) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));
      onVisibleTextChangeRef.current?.();
      if (index >= text.length) {
        window.clearInterval(timer);
        onCompleteRef.current?.();
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, text]);

  return visibleText;
}
