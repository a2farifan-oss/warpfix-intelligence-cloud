"use client";

import Link from "next/link";
import { Wrench, Search, ArrowRight } from "lucide-react";
import { useState } from "react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const ERRORS = [
  { slug: "exit-code-1", title: "Process completed with exit code 1", category: "General", severity: "common", searches: "45K/mo" },
  { slug: "exit-code-2", title: "Process completed with exit code 2", category: "General", severity: "common", searches: "12K/mo" },
  { slug: "exit-code-127", title: "Process completed with exit code 127", category: "Command Not Found", severity: "common", searches: "8K/mo" },
  { slug: "exit-code-128", title: "Process completed with exit code 128", category: "Git Error", severity: "medium", searches: "5K/mo" },
  { slug: "npm-eresolve", title: "npm ERR! ERESOLVE unable to resolve dependency tree", category: "npm", severity: "common", searches: "22K/mo" },
  { slug: "npm-enoent", title: "npm ERR! ENOENT no such file or directory", category: "npm", severity: "common", searches: "15K/mo" },
  { slug: "npm-audit-fix", title: "npm audit found vulnerabilities", category: "npm", severity: "medium", searches: "9K/mo" },
  { slug: "node-version-mismatch", title: "The engine 'node' is incompatible with this module", category: "Node.js", severity: "medium", searches: "7K/mo" },
  { slug: "eslint-errors", title: "ESLint found problems — X errors, Y warnings", category: "Lint", severity: "common", searches: "18K/mo" },
  { slug: "prettier-check-failed", title: "Prettier check failed — code style issues", category: "Lint", severity: "medium", searches: "6K/mo" },
  { slug: "typescript-errors", title: "TypeScript error TS2304: Cannot find name", category: "TypeScript", severity: "common", searches: "20K/mo" },
  { slug: "tsc-build-error", title: "tsc exited with code 2 — compilation errors", category: "TypeScript", severity: "medium", searches: "8K/mo" },
  { slug: "jest-test-failed", title: "Test suite failed to run — Jest encountered unexpected token", category: "Testing", severity: "common", searches: "14K/mo" },
  { slug: "vitest-timeout", title: "Vitest test timed out — exceeded 5000ms", category: "Testing", severity: "medium", searches: "4K/mo" },
  { slug: "docker-build-failed", title: "Docker build failed — COPY failed: file not found", category: "Docker", severity: "medium", searches: "11K/mo" },
  { slug: "docker-push-denied", title: "Docker push denied: access forbidden", category: "Docker", severity: "medium", searches: "6K/mo" },
  { slug: "pip-install-error", title: "pip install error: Could not find a version that satisfies", category: "Python", severity: "common", searches: "13K/mo" },
  { slug: "python-import-error", title: "ModuleNotFoundError: No module named", category: "Python", severity: "common", searches: "16K/mo" },
  { slug: "go-build-failed", title: "go build: cannot find package", category: "Go", severity: "medium", searches: "5K/mo" },
  { slug: "rust-cargo-error", title: "cargo build: error[E0308]: mismatched types", category: "Rust", severity: "medium", searches: "3K/mo" },
  { slug: "permission-denied", title: "Permission denied (publickey) — Git SSH error", category: "Git/SSH", severity: "common", searches: "25K/mo" },
  { slug: "github-token-expired", title: "GITHUB_TOKEN — Bad credentials or expired", category: "Auth", severity: "medium", searches: "8K/mo" },
  { slug: "actions-checkout-failed", title: "actions/checkout failed — repository not found", category: "GitHub Actions", severity: "medium", searches: "7K/mo" },
  { slug: "runner-out-of-disk", title: "No space left on device — runner disk full", category: "Runner", severity: "rare", searches: "4K/mo" },
  { slug: "oom-killed", title: "Process killed (OOM) — out of memory", category: "Runner", severity: "medium", searches: "6K/mo" },
];

const CATEGORIES = [...new Set(ERRORS.map((e) => e.category))];

export default function ErrorFixDatabase() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = ERRORS.filter((e) => {
    const matchesSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.slug.includes(search.toLowerCase());
    const matchesCategory = category === "All" || e.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CI Error Fix Database</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">{ERRORS.length}+ common CI/CD errors with root cause analysis and fixes</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search errors..."
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-[13px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]">
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Error List */}
        <div className="space-y-2">
          {filtered.map((error) => (
            <Link key={error.slug} href={`/tools/fix/${error.slug}`}
              className="group flex items-center justify-between bg-white border border-[var(--border-default)] rounded-lg px-5 py-4 hover:border-[var(--brand)] hover:shadow-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    error.severity === "common" ? "bg-red-50 text-red-600" : error.severity === "medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {error.category}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">~{error.searches}</span>
                </div>
                <code className="text-[13px] font-mono text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate block">{error.title}</code>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-1 transition-all shrink-0 ml-3" />
            </Link>
          ))}
        </div>

        <p className="text-center text-[12px] text-[var(--text-tertiary)] mt-6">
          {filtered.length} of {ERRORS.length} errors shown. More errors added weekly.
        </p>

        <ToolCTA feature="Stop Googling CI errors. WarpFix decodes, fixes, and prevents them — automatically, 24/7." />
      </main>
      <ToolFooter />
    </div>
  );
}
