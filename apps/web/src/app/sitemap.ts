import type { MetadataRoute } from "next";
import { getMenu } from "@/lib/menu-data";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Generated from the live menu, so new dishes and categories are listed automatically. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, allItems } = await getMenu();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/menu`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/menu/${c.id}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...allItems.map((i) => ({ url: `${base}/dish/${i.id}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
