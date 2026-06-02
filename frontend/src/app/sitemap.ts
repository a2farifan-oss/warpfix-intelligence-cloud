import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";
import {
  TOOL_SEO,
  ERROR_FIX_SLUGS,
  GUIDE_SLUGS,
  COMPARE_SLUGS,
} from "@/lib/tools-seo";

const BASE_URL = "https://warpfix.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const blogPostEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.isoDate),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const toolEntries: MetadataRoute.Sitemap = Object.values(TOOL_SEO).map(
    (tool) => ({
      url: `${BASE_URL}${tool.path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })
  );

  const errorFixEntries: MetadataRoute.Sitemap = ERROR_FIX_SLUGS.map(
    (slug) => ({
      url: `${BASE_URL}/tools/fix/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })
  );

  const guideEntries: MetadataRoute.Sitemap = GUIDE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/tools/guides/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const compareEntries: MetadataRoute.Sitemap = COMPARE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/tools/compare/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/tools/fix`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/tools/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/tools/compare`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...toolEntries,
    ...errorFixEntries,
    ...guideEntries,
    ...compareEntries,
    {
      url: `${BASE_URL}/security`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/roadmap`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/permissions`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/refund`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/acceptable-use`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...blogPostEntries,
  ];
}
