"use client";

import Image from "next/image";
import { useState, type InputHTMLAttributes, type Ref } from "react";
import { useTranslations } from "next-intl";

type AuthFieldIcon = "email" | "password";

type AuthTextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  label: string;
  error?: string;
  icon?: AuthFieldIcon;
  inputRef?: Ref<HTMLInputElement>;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
};

/** Figma-aligned text control used throughout authentication forms. */
export default function AuthTextField({
  label,
  error,
  icon,
  id,
  inputRef,
  type = "text",
  ...inputProps
}: AuthTextFieldProps) {
  const t = useTranslations("auth");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && isPasswordVisible ? "text" : type;
  const describedBy = error && id ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium leading-none text-[#123a64]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <Image
            src={icon === "password" ? "/auth/password.svg" : "/auth/email.svg"}
            alt=""
            width={24}
            height={24}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2"
          />
        )}
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          type={inputType}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-[5px] border bg-white py-3 text-base leading-6 text-[#080808] outline-none transition placeholder:text-[#818181] ${
            icon ? "pl-[3.25rem]" : "px-4"
          } ${isPassword ? "pr-12" : "pr-4"} ${
            error
              ? "border-rose-400 ring-2 ring-rose-100"
              : "border-[#9e9e9e] focus:border-[#3692f6] focus:ring-2 focus:ring-[#3692f6]/15"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={isPasswordVisible ? t("hidePassword") : t("showPassword")}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#636363] transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3692f6]/25"
          >
            <Image src="/auth/eye.svg" alt="" width={24} height={24} aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </div>
      {error && (
        <p id={describedBy} className="text-xs leading-4 text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
