"use client";

import HomeTab from "@/components/features/dashboard/HomeTab";
import { useAuthedUser } from "@/components/layout/AuthedUserContext";

export default function DashboardPage() {
  const { username, avatarUrl } = useAuthedUser();
  return <HomeTab username={username} avatarUrl={avatarUrl} />;
}
