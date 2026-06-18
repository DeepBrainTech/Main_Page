export type DiamondBundleId =
  | "diamonds10"
  | "diamonds25"
  | "diamonds70"
  | "diamonds200"
  | "diamonds300";

export type CoinBundleId = "coins100" | "coins250" | "coins800" | "coins1500" | "coins2500";

export type ShopBundleId = DiamondBundleId | CoinBundleId;

export interface ShopProduct {
  id: ShopBundleId;
  titleKey: string;
  priceKey: string;
  iconSrc: string;
  badgeKey?: string;
  kind: "diamond" | "coin";
}

export const shopProducts: ShopProduct[] = [
  {
    id: "diamonds10",
    titleKey: "products.diamonds10.title",
    priceKey: "products.diamonds10.price",
    iconSrc: "/shop/10diamonds.svg",
    kind: "diamond",
  },
  {
    id: "diamonds25",
    titleKey: "products.diamonds25.title",
    priceKey: "products.diamonds25.price",
    iconSrc: "/shop/25diamonds.svg",
    kind: "diamond",
  },
  {
    id: "diamonds70",
    titleKey: "products.diamonds70.title",
    priceKey: "products.diamonds70.price",
    iconSrc: "/shop/70diamonds.svg",
    kind: "diamond",
  },
  {
    id: "diamonds200",
    titleKey: "products.diamonds200.title",
    priceKey: "products.diamonds200.price",
    iconSrc: "/shop/200diamonds.svg",
    kind: "diamond",
  },
  {
    id: "diamonds300",
    titleKey: "products.diamonds300.title",
    priceKey: "products.diamonds300.price",
    iconSrc: "/shop/300diamonds.svg",
    badgeKey: "badges.bestValue",
    kind: "diamond",
  },
  {
    id: "coins100",
    titleKey: "products.coins100.title",
    priceKey: "products.coins100.price",
    iconSrc: "/shop/100coins.svg",
    kind: "coin",
  },
  {
    id: "coins250",
    titleKey: "products.coins250.title",
    priceKey: "products.coins250.price",
    iconSrc: "/shop/250coins.svg",
    kind: "coin",
  },
  {
    id: "coins800",
    titleKey: "products.coins800.title",
    priceKey: "products.coins800.price",
    iconSrc: "/shop/800coins.svg",
    kind: "coin",
  },
  {
    id: "coins1500",
    titleKey: "products.coins1500.title",
    priceKey: "products.coins1500.price",
    iconSrc: "/shop/1500coins.svg",
    kind: "coin",
  },
  {
    id: "coins2500",
    titleKey: "products.coins2500.title",
    priceKey: "products.coins2500.price",
    iconSrc: "/shop/2500coins.svg",
    badgeKey: "badges.bestValue",
    kind: "coin",
  },
];
