import { MetadataRoute } from "next";

// Force cache bust v2
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.plc.company";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
