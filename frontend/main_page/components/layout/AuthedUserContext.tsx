"use client";

import { createContext, useContext } from "react";

interface AuthedUserContextValue {
  username: string;
  dateOfBirth?: string | null;
}

const AuthedUserContext = createContext<AuthedUserContextValue | null>(null);

export function AuthedUserProvider({
  value,
  children,
}: {
  value: AuthedUserContextValue;
  children: React.ReactNode;
}) {
  return <AuthedUserContext.Provider value={value}>{children}</AuthedUserContext.Provider>;
}

export function useAuthedUser() {
  const ctx = useContext(AuthedUserContext);
  if (!ctx) {
    throw new Error("useAuthedUser must be used within AuthedUserProvider");
  }
  return ctx;
}
