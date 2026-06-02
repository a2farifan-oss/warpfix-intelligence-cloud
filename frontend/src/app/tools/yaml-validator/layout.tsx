import type { Metadata } from "next";
import { TOOL_SEO, generateToolSchema, generateBreadcrumbSchema } from "@/lib/tools-seo";
import { JsonLd } from "@/components/json-ld";

const tool = TOOL_SEO["yaml-validator"];

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  keywords: tool.keywords,
  openGraph: {
    title: tool.title,
    description: tool.description,
    url: `https://warpfix.org/tools/yaml-validator`,
    siteName: "WarpFix",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: tool.title,
    description: tool.description,
  },
  alternates: {
    canonical: `https://warpfix.org/tools/yaml-validator`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const schemas = [
    generateToolSchema(tool),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Free Tools", url: "/tools" },
      { name: tool.title.split(" — ")[0], url: "/tools/yaml-validator" },
    ]),
  ];
  return (
    <>
      <JsonLd data={schemas} />
      {children}
    </>
  );
}
