import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://chatdesk.example";
  return { rules: [{ userAgent: "*", allow: ["/", "/terms", "/privacy", "/refund", "/contact"], disallow: ["/api/", "/dashboard", "/inbox", "/contacts", "/pipeline", "/tasks", "/broadcasts", "/templates", "/reports", "/team", "/billing", "/admin", "/settings", "/invite/", "/reset/"] }], sitemap: `${base}/sitemap.xml` };
}
