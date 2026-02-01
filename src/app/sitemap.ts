import { MetadataRoute } from "next";

// Force cache bust v3 - Added SEO landing pages
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.plc.company";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // File format pages
    {
      url: `${baseUrl}/l5x-file`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/acd-file`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/rss-file`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // SEO landing pages
    {
      url: `${baseUrl}/view-l5x-without-studio-5000`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/studio-5000-alternative`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/allen-bradley-plc-viewer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ladder-logic-viewer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Legal pages
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
