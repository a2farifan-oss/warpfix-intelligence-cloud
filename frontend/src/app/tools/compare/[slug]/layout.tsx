import type { Metadata } from "next";
import { COMPARE_SEO, COMPARE_SLUGS, generateBreadcrumbSchema, generateFAQSchema } from "@/lib/tools-seo";
import { JsonLd } from "@/components/json-ld";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seo = COMPARE_SEO[slug];
  if (!seo) {
    return {
      title: "CI/CD Platform Comparison | WarpFix",
      description: "Compare CI/CD platforms side-by-side — features, pricing, performance, and which is best for your team.",
    };
  }
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `https://warpfix.org/tools/compare/${slug}`,
      siteName: "WarpFix",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: {
      canonical: `https://warpfix.org/tools/compare/${slug}`,
    },
  };
}

export function generateStaticParams() {
  return COMPARE_SLUGS.map((slug) => ({ slug }));
}

export default async function Layout({ params, children }: Props) {
  const { slug } = await params;
  const seo = COMPARE_SEO[slug];
  const parts = slug.split("-vs-");
  const schemas = [
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Free Tools", url: "/tools" },
      { name: "CI/CD Comparisons", url: "/tools/compare" },
      { name: seo?.title.split(" — ")[0] ?? slug, url: `/tools/compare/${slug}` },
    ]),
    generateFAQSchema([
      {
        q: `Which is better, ${parts[0]?.replace(/-/g, " ")} or ${parts[1]?.replace(/-/g, " ")}?`,
        a: "It depends on your needs. See our detailed comparison above for pricing, features, and performance benchmarks.",
      },
      {
        q: "Can WarpFix work with both platforms?",
        a: "WarpFix currently integrates with GitHub Actions natively. Support for other CI platforms is on our roadmap.",
      },
    ]),
  ];
  return (
    <>
      <JsonLd data={schemas} />
      {children}
    </>
  );
}
