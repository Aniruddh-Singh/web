import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  // Before launch the whole site stays out of search engines.
  if (process.env.NEXT_PUBLIC_LAUNCHED !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/checkout", "/order", "/account", "/login", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
