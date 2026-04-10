import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const publicRoutes = ["/en", "/zh"];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "/en" ? 1 : 0.9,
  }));
}
