import type { MetadataRoute } from "next";

const BASE_URL = "https://warpfix.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tools/", "/llms.txt", "/llms-full.txt", "/humans.txt"],
        disallow: ["/api/", "/dashboard/", "/admin/", "/_next/", "/auth-error"],
      },
      // AI Search Engine Crawlers — explicitly allowed
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "YouBot", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "cohere-ai", allow: "/" },
      { userAgent: "meta-externalagent", allow: "/" },
      // Traditional Search Engines
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Googlebot-Image", allow: "/" },
      { userAgent: "Googlebot-Video", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "Slurp", allow: "/" },
      { userAgent: "DuckDuckBot", allow: "/" },
      { userAgent: "Baiduspider", allow: "/" },
      { userAgent: "YandexBot", allow: "/" },
      // Social Media Crawlers
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "Twitterbot", allow: "/" },
      { userAgent: "LinkedInBot", allow: "/" },
      { userAgent: "Slackbot", allow: "/" },
      { userAgent: "Discordbot", allow: "/" },
      { userAgent: "WhatsApp", allow: "/" },
      { userAgent: "TelegramBot", allow: "/" },
      // Block bad bots
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
      { userAgent: "BLEXBot", disallow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
