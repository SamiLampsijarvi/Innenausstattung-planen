import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.RAUMLY_PUBLIC_PILOT_MODE === "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: [{ userAgent: "*", allow: "/", disallow: "/internal/" }] };
}
