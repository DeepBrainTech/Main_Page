"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, type MutableRefObject, useEffect, useId, useMemo, useRef, useState } from "react";
import { getCountryOptions, getFlagImageSrcSet, getFlagImageUrl } from "@/constants/countries";

interface CountrySelectProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  locale: string;
  placeholder: string;
  className?: string;
  buttonRef?: MutableRefObject<HTMLButtonElement | null>;
  invalid?: boolean;
  describedBy?: string;
}

export default function CountrySelect({
  id,
  value,
  onChange,
  locale,
  placeholder,
  className = "",
  buttonRef,
  invalid,
  describedBy,
}: CountrySelectProps) {
  const t = useTranslations("common");
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const localButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);
  const selected = countryOptions.find((item) => item.code === value);
  const q = query.trim().toLowerCase();
  const options = q
    ? countryOptions.filter(({ code, label }) => label.toLowerCase().includes(q) || code.toLowerCase().includes(q))
    : [{ code: "", label: placeholder }, ...countryOptions];
  const triggerRef = buttonRef ?? localButtonRef;
  const activeOption = options[activeIndex];
  const activeOptionId = activeOption ? `${listId}-${activeOption.code || "empty"}` : undefined;

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openSearch(initialIndex = -1) {
    setQuery("");
    setActiveIndex(initialIndex);
    setOpen(true);
  }

  function selectCountry(code: string) {
    onChange(code);
    close(true);
  }

  useEffect(() => {
    if (!open) return;
    const onOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open && activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeOptionId, open]);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || (event.key === "Enter" && event.nativeEvent.keyCode === 229)) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (options.length) {
          setActiveIndex((index) => event.key === "ArrowDown"
            ? Math.min(index + 1, options.length - 1)
            : index === -1 ? options.length - 1 : Math.max(index - 1, 0));
        }
        break;
      case "Enter": {
        event.preventDefault();
        const option = activeOption ?? (q ? options[0] : undefined);
        if (option) selectCountry(option.code);
        break;
      }
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full min-w-0"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onClick={() => open ? close(true) : openSearch()}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            openSearch(event.key === "ArrowDown" ? 0 : countryOptions.length);
          }
        }}
        className={className}
      >
        <span className="inline-flex max-w-full items-center gap-2 truncate">
          {selected ? (
            <>
              <img
                src={getFlagImageUrl(selected.code)}
                srcSet={getFlagImageSrcSet(selected.code)}
                alt=""
                className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
              />
              <span className="truncate">{selected.label}</span>
            </>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </span>
      </button>

      {open && (
        <div className="absolute inset-x-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <input
            ref={searchRef}
            type="search"
            role="combobox"
            aria-label={t("searchCountry")}
            aria-autocomplete="list"
            aria-expanded={true}
            aria-controls={listId}
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("searchCountry")}
            className="mb-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
          />
          <ul id={listId} role="listbox" aria-label={t("searchCountry")} className="max-h-56 overflow-y-auto rounded-lg border border-slate-100">
            {options.map((item, index) => (
              <li
                key={item.code}
                id={`${listId}-${item.code || "empty"}`}
                role="option"
                aria-selected={item.code === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCountry(item.code)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-900 hover:bg-sky-50 ${index === activeIndex ? "bg-sky-100" : ""}`}
              >
                {item.code && (
                  <img
                    src={getFlagImageUrl(item.code)}
                    srcSet={getFlagImageSrcSet(item.code)}
                    alt=""
                    className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                  />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          {!options.length && <p role="status" className="px-3 py-2 text-sm text-slate-700">{t("noCountriesFound")}</p>}
        </div>
      )}
    </div>
  );
}
