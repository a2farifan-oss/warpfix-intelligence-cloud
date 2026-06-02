import type { Metadata } from "next";
import { GUIDE_SEO, GUIDE_SLUGS, generateBreadcrumbSchema, generateHowToSchema } from "@/lib/tools-seo";
import { JsonLd } from "@/components/json-ld";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seo = GUIDE_SEO[slug];
  if (!seo) {
    return {
      title: "CI/CD Framework Guide | WarpFix",
      description: "Complete CI/CD setup guides for popular frameworks using GitHub Actions.",
    };
  }
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `https://warpfix.org/tools/guides/${slug}`,
      siteName: "WarpFix",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: {
      canonical: `https://warpfix.org/tools/guides/${slug}`,
    },
  };
}

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export default async function Layout({ params, children }: Props) {
  const { slug } = await params;
  const seo = GUIDE_SEO[slug];
  const schemas = [
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Free Tools", url: "/tools" },
      { name: "Framework Guides", url: "/tools/guides" },
      { name: seo?.title.split(" — ")[0] ?? slug, url: `/tools/guides/${slug}` },
    ]),
    ...(seo
      ? [
          generateHowToSchema(seo.title.split(" — ")[0], [
            "Set up GitHub Actions workflow file",
            "Configure build and test steps",
            "Add caching for faster builds",
            "Push and verify CI passes",
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
