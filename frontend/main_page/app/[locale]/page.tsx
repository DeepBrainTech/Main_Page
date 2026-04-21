"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api-config";
import {
  DecorativeBackground,
  LandingHeader,
  HeroSection,
  AudienceSection,
  GameCategorySection,
  BenefitStorySection,
  LandingFooter,
} from "@/components/landing";
import {
  LANDING_AUDIENCES,
  LANDING_GAME_CATEGORIES,
  LANDING_BENEFIT_STORIES,
} from "@/config/landing";

/**
 * Landing 页面入口
 * 已登录用户会自动跳转到 dashboard
 */
export default function Home() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    fetch(getApiUrl("/api/auth/verify"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.ok) {
          router.push(`/${locale}/dashboard`);
          return;
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("token_expires_in");
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token_expires_in");
      });
  }, [locale, router]);

  const goLogin = () => {
    router.push(`/${locale}/login`);
  };

  const goRegister = () => {
    router.push(`/${locale}/register`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EDF4FC]">
      <DecorativeBackground />

      <div className="relative z-10">
        <LandingHeader onLogin={goLogin} onRegister={goRegister} />

        <main className="space-y-2">
          <HeroSection />
          <AudienceSection items={LANDING_AUDIENCES} />
          <GameCategorySection
            items={LANDING_GAME_CATEGORIES}
            onPlayClick={goLogin}
          />
          <BenefitStorySection items={LANDING_BENEFIT_STORIES} />
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}

