"use client";

import Link from "next/link";
import { GitBranch, ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const GUIDES = [
  { slug: "nextjs-ci", title: "Next.js", icon: "▲", description: "Build, test, and deploy Next.js apps with GitHub Actions", difficulty: "Beginner", buildTime: "~3 min" },
  { slug: "react-ci", title: "React (Vite)", icon: "⚛️", description: "CI/CD pipeline for React + Vite with testing and preview deploys", difficulty: "Beginner", buildTime: "~2 min" },
  { slug: "nodejs-ci", title: "Node.js", icon: "🟢", description: "Test and deploy Node.js APIs with caching and matrix builds", difficulty: "Beginner", buildTime: "~2 min" },
  { slug: "python-ci", title: "Python", icon: "🐍", description: "Pytest, linting with Ruff, and PyPI publishing via GitHub Actions", difficulty: "Beginner", buildTime: "~2 min" },
  { slug: "django-ci", title: "Django", icon: "🎸", description: "Django CI with PostgreSQL service container and migrations", difficulty: "Intermediate", buildTime: "~4 min" },
  { slug: "go-ci", title: "Go", icon: "🔵", description: "Go build, test, and lint with golangci-lint on GitHub Actions", difficulty: "Beginner", buildTime: "~2 min" },
  { slug: "rust-ci", title: "Rust", icon: "🦀", description: "Cargo build, test, and clippy with caching via sccache", difficulty: "Intermediate", buildTime: "~8 min" },
  { slug: "java-ci", title: "Java (Maven)", icon: "☕", description: "Maven build, test, and deploy with JDK matrix on GitHub Actions", difficulty: "Intermediate", buildTime: "~5 min" },
  { slug: "rails-ci", title: "Ruby on Rails", icon: "💎", description: "Rails CI with PostgreSQL, RSpec, and RuboCop on GitHub Actions", difficulty: "Intermediate", buildTime: "~5 min" },
  { slug: "docker-ci", title: "Docker Build & Push", icon: "🐳", description: "Multi-stage Docker builds with GitHub Container Registry", difficulty: "Intermediate", buildTime: "~4 min" },
  { slug: "terraform-ci", title: "Terraform", icon: "🏗️", description: "Terraform plan, validate, and apply with GitHub Actions", difficulty: "Advanced", buildTime: "~3 min" },
  { slug: "flutter-ci", title: "Flutter", icon: "🦋", description: "Flutter build, test, and deploy for Android/iOS with GitHub Actions", difficulty: "Advanced", buildTime: "~10 min" },
  { slug: "monorepo-ci", title: "Monorepo (Turborepo)", icon: "📦", description: "Turborepo CI with path filtering and remote caching", difficulty: "Advanced", buildTime: "~5 min" },
  { slug: "typescript-ci", title: "TypeScript Library", icon: "📘", description: "Build, typecheck, and publish TypeScript packages to npm", difficulty: "Beginner", buildTime: "~2 min" },
];

export default function FrameworkGuides() {
  const [search, setSearch] = useState("");
  const filtered = GUIDES.filter((g) => !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Framework CI/CD Guides</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Step-by-step CI setup for {GUIDES.length} frameworks with production-ready YAML</p>
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search frameworks..."
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[var(--border-default)] rounded-xl bg-white focus:outline-none focus:border-[var(--brand)]" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((guide) => (
            <Link key={guide.slug} href={`/tools/guides/${guide.slug}`}
              className="group bg-white border border-[var(--border-default)] rounded-xl p-5 hover:border-[var(--brand)] hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{guide.icon}</span>
                  <h3 className="font-semibold text-[14px] group-hover:text-[var(--brand)] transition-colors">{guide.title}</h3>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed mb-2">{guide.description}</p>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
                <span className={`px-2 py-0.5 rounded-full ${
                  guide.difficulty === "Beginner" ? "bg-green-50 text-green-600" : guide.difficulty === "Intermediate" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                }`}>{guide.difficulty}</span>
                <span>Build: {guide.buildTime}</span>
              </div>
            </Link>
          ))}
        </div>

        <ToolCTA feature="Set up CI in minutes. When it breaks, WarpFix fixes it in seconds — automatically." />
      </main>
      <ToolFooter />
    </div>
  );
}
