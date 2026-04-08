import type {
  AudienceItem,
  BenefitStoryItem,
  GameCategoryItem,
} from "@/types/landing";

/**
 * Landing 人群卡片配置
 */
export const LANDING_AUDIENCES: AudienceItem[] = [
  {
    key: "students",
    image: "/landing/who_is_this_for/1.png",
    accentClass: "from-sky-100 to-indigo-100",
  },
  {
    key: "children",
    image: "/landing/who_is_this_for/2.png",
    accentClass: "from-violet-100 to-pink-100",
  },
  {
    key: "educators",
    image: "/landing/who_is_this_for/3.png",
    accentClass: "from-emerald-100 to-cyan-100",
  },
  {
    key: "olderAdults",
    image: "/landing/who_is_this_for/4.png",
    accentClass: "from-amber-100 to-orange-100",
  },
];

/**
 * Landing 游戏分类配置
 */
export const LANDING_GAME_CATEGORIES: GameCategoryItem[] = [
  {
    key: "spatial",
    image: "/landing/brain_training/spatial.png",
    badgeClass: "bg-[#2D6A4F]",
    badgeTextClass: "text-white",
  },
  {
    key: "strategy",
    image: "/landing/brain_training/strategy.png",
    badgeClass: "bg-[#BC4749]",
    badgeTextClass: "text-white",
  },
  {
    key: "reaction",
    image: "/landing/brain_training/reaction.png",
    badgeClass: "bg-[#F77F00]",
    badgeTextClass: "text-white",
  },
  {
    key: "logic",
    image: "/landing/brain_training/logic.png",
    badgeClass: "bg-[#3A86FF]",
    badgeTextClass: "text-white",
  },
  {
    key: "focus",
    image: "/landing/brain_training/focus.png",
    badgeClass: "bg-[#6D597A]",
    badgeTextClass: "text-white",
  },
  {
    key: "reasoning",
    image: "/landing/brain_training/memory.png",
    badgeClass: "bg-[#4C566A]",
    badgeTextClass: "text-white",
  },
];

/**
 * Landing 价值说明配置
 */
export const LANDING_BENEFIT_STORIES: BenefitStoryItem[] = [
  {
    key: "executiveFunction",
    image: "/images/6.jpg",
    cardClass: "bg-[#FDE2E4]",
  },
  {
    key: "problemSolving",
    image: "/images/2.jpg",
    cardClass: "bg-[#DDF4E7]",
  },
  {
    key: "imagination",
    image: "/images/3.jpg",
    cardClass: "bg-[#DBEAFE]",
  },
  {
    key: "mentalLongevity",
    image: "/images/4.jpg",
    cardClass: "bg-[#E5E7EB]",
  },
];
