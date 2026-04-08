/**
 * Landing 页面的人群卡片类型
 */
export interface AudienceItem {
  key: string;
  image: string;
  accentClass: string;
}

/**
 * Landing 页面的游戏分类卡片类型
 */
export interface GameCategoryItem {
  key: string;
  image: string;
  badgeClass: string;
  badgeTextClass: string;
}

/**
 * Landing 页面的价值说明卡片类型
 */
export interface BenefitStoryItem {
  key: string;
  image: string;
  cardClass: string;
}
