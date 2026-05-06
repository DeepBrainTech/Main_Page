"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AppShell, { type AppTab } from "@/components/layout/AppShell";
import CompleteProfileDialog from "@/components/features/profile/CompleteProfileDialog";
import { useAuth } from "@/hooks/useAuth";
import { AuthedUserProvider } from "@/components/layout/AuthedUserContext";

const SEGMENT_TO_TAB: Record<string, AppTab> = {
  dashboard: "dashboard",
  braingames: "brainGames",
  leaderboard: "leaderboard",
  test: "test",
  learning: "learning",
};

/**
 * 登录后路由组共享布局：常驻 AppShell，切页仅替换主内容
 */
export default function AuthedAppLayout({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const { username, email, dateOfBirth, country, avatarUrl, loading, needsProfileCompletion, refetch, logout } = useAuth();

  const currentSegment = pathname.split("/").filter(Boolean).pop()?.toLowerCase() ?? "dashboard";
  const activeTab = SEGMENT_TO_TAB[currentSegment] ?? null;

  const tabHrefMap: Record<AppTab, string> = {
    dashboard: `/${locale}/dashboard`,
    brainGames: `/${locale}/braingames`,
    leaderboard: `/${locale}/leaderboard`,
    test: `/${locale}/test`,
    learning: `/${locale}/learning`,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-gray-600">{tCommon("loading")}</div>
      </div>
    );
  }

  if (needsProfileCompletion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <CompleteProfileDialog
          open={true}
          initialUsername={username}
          onClose={() => {}}
          onSuccess={() => refetch()}
          required
        />
      </div>
    );
  }

  return (
    <AuthedUserProvider value={{ username, dateOfBirth, avatarUrl }}>
      <AppShell
        activeTab={activeTab}
        tabHrefMap={tabHrefMap}
        username={username}
        email={email}
        dateOfBirth={dateOfBirth}
        country={country}
        avatarUrl={avatarUrl}
        onLogout={() => {
          logout();
          router.push(`/${locale}/login`);
        }}
        onProfileUpdate={refetch}
      >
        {children}
      </AppShell>
    </AuthedUserProvider>
  );
}
