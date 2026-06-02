"use client";

import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const COMPARISONS = [
  { slug: "github-actions-vs-circleci", title: "GitHub Actions vs CircleCI", a: "GitHub Actions", b: "CircleCI", searches: "12K/mo" },
  { slug: "github-actions-vs-gitlab-ci", title: "GitHub Actions vs GitLab CI", a: "GitHub Actions", b: "GitLab CI", searches: "15K/mo" },
  { slug: "github-actions-vs-jenkins", title: "GitHub Actions vs Jenkins", a: "GitHub Actions", b: "Jenkins", searches: "18K/mo" },
  { slug: "github-actions-vs-travis-ci", title: "GitHub Actions vs Travis CI", a: "GitHub Actions", b: "Travis CI", searches: "8K/mo" },
  { slug: "circleci-vs-gitlab-ci", title: "CircleCI vs GitLab CI", a: "CircleCI", b: "GitLab CI", searches: "5K/mo" },
  { slug: "github-actions-vs-bitbucket", title: "GitHub Actions vs Bitbucket Pipelines", a: "GitHub Actions", b: "Bitbucket Pipelines", searches: "6K/mo" },
  { slug: "github-actions-vs-azure-devops", title: "GitHub Actions vs Azure DevOps", a: "GitHub Actions", b: "Azure DevOps", searches: "9K/mo" },
  { slug: "jest-vs-vitest", title: "Jest vs Vitest", a: "Jest", b: "Vitest", searches: "20K/mo" },
  { slug: "docker-vs-podman", title: "Docker vs Podman", a: "Docker", b: "Podman", searches: "10K/mo" },
  { slug: "eslint-vs-biome", title: "ESLint vs Biome", a: "ESLint", b: "Biome", searches: "7K/mo" },
];

export default function ComparisonIndex() {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CI/CD Tool Comparisons</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Detailed, data-driven comparisons between CI/CD platforms and developer tools</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {COMPARISONS.map((c) => (
            <Link key={c.slug} href={`/tools/compare/${c.slug}`}
              className="group flex items-center justify-between bg-white border border-[var(--border-default)] rounded-xl px-6 py-5 hover:border-[var(--brand)] hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[14px] font-semibold group-hover:text-[var(--brand)] transition-colors">{c.a}</span>
                  <span className="text-[12px] text-[var(--text-tertiary)] px-2 py-0.5 bg-[var(--bg-secondary)] rounded">vs</span>
                  <span className="text-[14px] font-semibold group-hover:text-[var(--brand)] transition-colors">{c.b}</span>
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)]">~{c.searches} searches</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

        <ToolCTA feature="Whichever CI platform you choose, WarpFix monitors it and auto-fixes failures — GitHub Actions, GitLab CI, or CircleCI." />
      </main>
      <ToolFooter />
    </div>
  );
}
