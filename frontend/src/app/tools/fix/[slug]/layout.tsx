import type { Metadata } from "next";
import { ERROR_FIX_SEO, ERROR_FIX_SLUGS, generateBreadcrumbSchema, generateHowToSchema } from "@/lib/tools-seo";
import { JsonLd } from "@/components/json-ld";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seo = ERROR_FIX_SEO[slug];
  if (!seo) {
    return {
      title: "CI Error Fix Guide | WarpFix",
      description: "Step-by-step guide to fix common CI/CD pipeline errors in GitHub Actions, GitLab CI, and more.",
    };
  }
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `https://warpfix.org/tools/fix/${slug}`,
      siteName: "WarpFix",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: {
      canonical: `https://warpfix.org/tools/fix/${slug}`,
    },
  };
}

export function generateStaticParams() {
  return ERROR_FIX_SLUGS.map((slug) => ({ slug }));
}

export default async function Layout({ params, children }: Props) {
  const { slug } = await params;
  const seo = ERROR_FIX_SEO[slug];
  const schemas = [
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Free Tools", url: "/tools" },
      { name: "Error Fix Database", url: "/tools/fix" },
      { name: seo?.title.split(" — ")[0] ?? slug, url: `/tools/fix/${slug}` },
    ]),
    ...(seo
      ? [
          generateHowToSchema(seo.title.split(" — ")[0], [
            "Check the failed step's log output",
            "Identify the specific error message",
            "Apply the fix for your specific case",
          ]),
        ]
      : []),
  ];
  return (
    <>
      <JsonLd data={schemas} />
      {children}
    </>
  );
}
