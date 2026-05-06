"use client";

import { type MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { getCountryOptions, getFlagImageSrcSet, getFlagImageUrl } from "@/constants/countries";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  locale: string;
  placeholder: string;
  className?: string;
  dropdownClassName?: string;
  buttonRef?: MutableRefObject<HTMLButtonElement | null>;
}

export default function CountrySelect({
  value,
  onChange,
  locale,
  placeholder,
  className = "",
  dropdownClassName = "",
  buttonRef,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const localButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);
  const selected = countryOptions.find((item) => item.code === value);
  const filtered = countryOptions.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (!open) return;
    const onDocClick = (evt: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(evt.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!buttonRef) return;
    buttonRef.current = localButtonRef.current;
  }, [buttonRef, localButtonRef.current]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={localButtonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={className}
      >
        <span className="inline-flex items-center gap-2 truncate">
          {selected ? (
            <>
              <img
                src={getFlagImageUrl(selected.code)}
                srcSet={getFlagImageSrcSet(selected.code)}
                alt={selected.code}
                className="h-3.5 w-5 rounded-sm object-cover"
              />
              <span className="truncate">{selected.label}</span>
            </>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </span>
      </button>

      {open && (
        <div className={`absolute z-50 mt-1 min-w-[320px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl ${dropdownClassName}`}>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country"
            className="mb-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
          />
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {placeholder}
            </button>
            {filtered.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50"
              >
                <img
                  src={getFlagImageUrl(item.code)}
                  srcSet={getFlagImageSrcSet(item.code)}
                  alt={item.code}
                  className="h-3.5 w-5 rounded-sm object-cover"
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
