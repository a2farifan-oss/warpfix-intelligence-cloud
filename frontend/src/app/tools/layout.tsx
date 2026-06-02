import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Free Developer Tools — CI/CD Utilities | WarpFix",
  description:
    "15 free online tools for developers: CI error decoder, GitHub Actions workflow generator, YAML validator, cost calculator, flaky test analyzer, and more. No signup required.",
  keywords: [
    "free developer tools",
    "CI/CD tools",
    "GitHub Actions generator",
    "CI error decoder",
    "YAML validator",
    "CI cost calculator",
    "flaky test detector",
    "cron expression builder",
    "dockerfile linter",
    "build time estimator",
    "github actions validator",
    "postmortem template",
    "CI health score",
    "env file generator",
    "flaky test analyzer",
  ],
  openGraph: {
    title: "15 Free Developer Tools — CI/CD Utilities | WarpFix",
    description:
      "Free CI/CD tools for developers. Decode errors, generate workflows, validate YAML, calculate costs — all in your browser. No signup.",
    url: "https://warpfix.org/tools",
    siteName: "WarpFix",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "15 Free Developer Tools | WarpFix",
    description:
      "Free CI/CD tools: error decoder, Actions generator, YAML validator, cost calculator, and more.",
  },
  alternates: {
    canonical: "https://warpfix.org/tools",
  },
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Free Developer Tools",
  description:
    "15 free online developer tools for CI/CD: error decoder, workflow generator, YAML validator, cost calculator, and more.",
  url: "https://warpfix.org/tools",
  provider: {
    "@type": "Organization",
    name: "WarpFix",
    url: "https://warpfix.org",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={collectionSchema} />
      {children}
    </>
  );
}
