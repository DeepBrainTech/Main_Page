"use client";

import ShopProductCard from "@/components/features/shop/ShopProductCard";
import { shopProducts, type CoinBundleId, type DiamondBundleId, type ShopBundleId } from "@/constants/shopProducts";
import { createCoinCheckoutSession, createDiamondCheckoutSession } from "@/services/userApi";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ShopCheckoutError = "checkoutFailed" | "stripeNotConfigured" | "generic";

export default function ShopPage() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const tShop = useTranslations("shop");
  const [redirectingProductId, setRedirectingProductId] = useState<string | null>(null);
  const [error, setError] = useState<ShopCheckoutError | null>(null);
  const [successMessage, setSuccessMessage] = useState<"checkoutSuccess" | "checkoutCanceled" | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setSuccessMessage("checkoutSuccess");
      setError(null);
      router.replace(pathname);
    } else if (checkout === "canceled") {
      setSuccessMessage("checkoutCanceled");
      setError(null);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  const handlePurchase = async (productId: ShopBundleId, kind: "diamond" | "coin") => {
    if (redirectingProductId) return;
    setError(null);
    setSuccessMessage(null);
    setRedirectingProductId(productId);
    try {
      const url =
        kind === "coin"
          ? await createCoinCheckoutSession({ bundle_id: productId as CoinBundleId, locale })
          : await createDiamondCheckoutSession({ bundle_id: productId as DiamondBundleId, locale });
      window.location.href = url;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "checkout_failed";
      setError(detail === "stripe_not_configured" || detail === "stripe_price_not_configured" ? "stripeNotConfigured" : "checkoutFailed");
      setRedirectingProductId(null);
    }
  };

  return (
    <section className="min-h-[calc(100vh-7rem)] space-y-8 pb-8">
      <div className="font-app-body text-xl font-semibold leading-5 text-sky-700">{tNav("shop")}</div>

      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center font-app-body text-sm font-medium text-emerald-700">
          {tShop(successMessage)}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center font-app-body text-sm text-red-600" role="alert">
          {tShop(`errors.${error}`)}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {shopProducts.map((product) => {
          const title = tShop(product.titleKey);

          return (
            <ShopProductCard
              key={product.id}
              title={title}
              price={tShop(product.priceKey)}
              iconSrc={product.iconSrc}
              iconAlt={title}
              badge={product.badgeKey ? tShop(product.badgeKey) : undefined}
              disabled={Boolean(redirectingProductId)}
              onPurchase={() => void handlePurchase(product.id, product.kind)}
            />
          );
        })}
      </div>
    </section>
  );
}
