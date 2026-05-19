export interface ShopProduct {
  id: string;
  titleKey: string;
  priceKey: string;
  iconSrc: string;
  badgeKey?: string;
}

export const shopProducts: ShopProduct[] = [
  {
    id: "diamonds10",
    titleKey: "products.diamonds10.title",
    priceKey: "products.diamonds10.price",
    iconSrc: "/shop/10diamonds.svg",
  },
  {
    id: "diamonds25",
    titleKey: "products.diamonds25.title",
    priceKey: "products.diamonds25.price",
    iconSrc: "/shop/25diamonds.svg",
  },
  {
    id: "diamonds70",
    titleKey: "products.diamonds70.title",
    priceKey: "products.diamonds70.price",
    iconSrc: "/shop/70diamonds.svg",
  },
  {
    id: "diamonds200",
    titleKey: "products.diamonds200.title",
    priceKey: "products.diamonds200.price",
    iconSrc: "/shop/200diamonds.svg",
  },
  {
    id: "diamonds300",
    titleKey: "products.diamonds300.title",
    priceKey: "products.diamonds300.price",
    iconSrc: "/shop/300diamonds.svg",
    badgeKey: "badges.bestValue",
  },
];
