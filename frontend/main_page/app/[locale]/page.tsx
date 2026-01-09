"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getApiUrl } from "@/lib/api-config";
// 导入着陆页组件
import {
  HeroSection,
  GameCard,
  BenefitCard,
  TestimonialCard,
  CTASection,
  LandingFooter,
} from "@/components/landing";

/**
 * 主页 - 着陆页
 * 如果用户已登录，自动重定向到 /home
 */
export default function Home() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("beforelogin");
  const tCommon = useTranslations("common");

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem("access_token");
    if (token) {
      // 验证 token 是否有效
      fetch(getApiUrl("/api/auth/verify"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            // Token 有效，重定向到 home 页面
            router.push(`/${locale}/home`);
          } else {
            // Token 无效，清除
            localStorage.removeItem("access_token");
            localStorage.removeItem("token_expires_in");
          }
        })
        .catch(() => {
          // 验证失败，清除 token
          localStorage.removeItem("access_token");
          localStorage.removeItem("token_expires_in");
        });
    }
  }, [locale, router]);

  // 游戏数据配置
  const games = [
    {
      key: "cognigo",
      image: "/images/game-cognigo.jpg",
      hoverImage: "/images/1.jpg",
      buttonColor: "bg-[#5E81AC]",
      titleColor: "text-gray-800",
      taglineColor: "text-[#5E81AC]",
      descriptionColor: "text-gray-600",
      linkUrl: `/${locale}/login`,
    },
    {
      key: "fogOfWar",
      image: "/images/game-fog-of-war.jpg",
      hoverImage: "/images/2.jpg",
      buttonColor: "bg-[#D08770]",
      titleColor: "text-gray-800",
      taglineColor: "text-[#D08770]",
      descriptionColor: "text-gray-600",
      linkUrl: `/${locale}/login`,
    },
    {
      key: "sudoku",
      image: "/images/game-sudoku.jpg",
      hoverImage: "/images/3.jpg",
      buttonColor: "bg-[#A3BE8C]",
      titleColor: "text-gray-800",
      taglineColor: "text-[#A3BE8C]",
      descriptionColor: "text-gray-600",
      linkUrl: `/${locale}/login`,
    },
    {
      key: "sudokuBattle",
      image: "/images/game-sudoku-battle.jpg",
      hoverImage: "/images/4.jpg",
      buttonColor: "bg-[#EEC643]",
      titleColor: "text-gray-800",
      taglineColor: "text-[#EEC643]",
      descriptionColor: "text-gray-600",
      linkUrl: `/${locale}/login`,
    },
    {
      key: "chessMaster",
      image: "/images/game-chess-master.jpg",
      hoverImage: "/images/5.jpg",
      buttonColor: "bg-[#5E81AC]",
      titleColor: "text-gray-800",
      taglineColor: "text-[#5E81AC]",
      descriptionColor: "text-gray-600",
      linkUrl: `/${locale}/login`,
    },
    {
      key: "mathChess",
      image: "/images/game-math-chess.jpg",
      hoverImage: "/images/7.jpg",
      buttonColor: "bg-[#4F46E5]",
      titleColor: "text-gray-800",
      taglineColor: "text-[#4F46E5]",
      descriptionColor: "text-gray-600",
      linkUrl: `/${locale}/login`,
    },
    {
      key: "more",
      image: "/images/more.jpg",
      hoverImage: "/images/6.jpg",
      buttonColor: "bg-[#4C566A]",
      titleColor: "text-gray-800",
      taglineColor: "text-[#4C566A]",
      descriptionColor: "text-gray-600",
      linkUrl: `/${locale}/login`,
    },
  ];

  // 核心能力数据配置
  const benefits = [
    { key: "strategicThinking", icon: "🧠", color: "bg-blue-100 text-blue-600" },
    { key: "adaptability", icon: "🔄", color: "bg-orange-100 text-orange-600" },
    { key: "focus", icon: "🎯", color: "bg-green-100 text-green-600" },
    { key: "memory", icon: "🧩", color: "bg-yellow-100 text-yellow-600" },
    { key: "patternRecognition", icon: "🔍", color: "bg-indigo-100 text-indigo-600" },
  ];

  // 用户评价数据配置
  const testimonials = [
    { key: "testimonial1" },
    { key: "testimonial2" },
    { key: "testimonial3" },
  ];

  return (
    <div className="min-h-screen bg-[#FEF6EC] font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">🧠 DeepBrainTech Presents</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${locale}/login`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {tCommon("login")}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Hero Section - 使用组件 */}
      <HeroSection />

      {/* Games Section - 使用 GameCard 组件 */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl text-center mb-12 text-[#2C3539]" style={{ textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)' }}>
            {t("games.title")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {games.map((game) => (
              <GameCard
                key={game.key}
                gameKey={game.key}
                image={game.image}
                hoverImage={game.hoverImage}
                buttonColor={game.buttonColor}
                titleColor={game.titleColor}
                taglineColor={game.taglineColor}
                descriptionColor={game.descriptionColor}
                linkUrl={game.linkUrl}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - 使用 BenefitCard 组件 */}
      <section className="py-16 px-6 bg-[#FEF6EC]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
            {t("benefits.title")}
          </h2>
          <p className="text-center text-gray-800 mb-12 max-w-3xl mx-auto">
            {t("benefits.subtitle")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {benefits.map((benefit) => (
              <BenefitCard
                key={benefit.key}
                benefitKey={benefit.key}
                icon={benefit.icon}
                color={benefit.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - 使用 TestimonialCard 组件 */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
            {t("testimonials.title")}
          </h2>
          <p className="text-center text-gray-600 mb-12">
            {t("testimonials.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <TestimonialCard
                key={testimonial.key}
                testimonialKey={testimonial.key}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - 使用组件 */}
      <CTASection 
        onSignUp={() => router.push(`/${locale}/register`)}
        onLogin={() => router.push(`/${locale}/login`)}
      />

      {/* Footer - 使用组件 */}
      <LandingFooter />
    </div>
  );
}
