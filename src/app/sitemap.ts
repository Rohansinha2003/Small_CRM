import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://chatdesk.example";
  return ["", "/signup", "/login", "/terms", "/privacy", "/refund", "/contact"].map((p) => ({ url: base + p }));
}
