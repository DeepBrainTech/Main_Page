"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n-navigation";
import { apiFetch } from "@/lib/api-config";
import {
  LandingHeader,
  LandingFooter,
  BrainTrainingPrinciples,
  FigmaHero,
  GameCategoriesShowcase,
  GamifiedLearningHighlights,
  NextGenTrainingBanner,
  AIPoweredTools,
  FinalTrainingCta,
  GameShowcase,
  PricingSection,
  TrustMarquee,
} from "@/components/landing";

/**
 * Landing 页面入口
 * 已登录用户会自动跳转到 dashboard
 */
export default function Home() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    // The cookie is HttpOnly; we cannot inspect it from JS. Probe the API instead.
    apiFetch("/api/auth/verify")
      .then((res) => {
        if (res.ok) {
          router.push("/dashboard");
        }
      })
      .catch(() => {
        // Unauthenticated visitors stay on the landing page; nothing to clean up.
      });
  }, [locale, router]);

  const goLogin = () => {
    router.push("/login");
  };

  const goRegister = () => {
    router.push("/register");
  };

  return (
    <div id="top" className="min-h-screen overflow-hidden bg-white">
      <div>
        <LandingHeader onLogin={goLogin} onRegister={goRegister} />

        <main>
          <FigmaHero onStart={goLogin} />
          <GameShowcase />
          <TrustMarquee />
          <BrainTrainingPrinciples />
          <GameCategoriesShowcase />
          <GamifiedLearningHighlights />
          <NextGenTrainingBanner />
          <AIPoweredTools />
          <PricingSection />
          <FinalTrainingCta onStart={goLogin} />
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}

