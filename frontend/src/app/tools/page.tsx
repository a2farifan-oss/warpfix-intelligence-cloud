"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Terminal, Cpu, TestTube2, Calculator, ShieldCheck,
  Clock, FileCode, FileText, Timer, FileSearch,
  Heart, ArrowRight, Wrench, GitBranch, Layers,
  BarChart3, Globe, Zap,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" as const },
  }),
};

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const PRIORITY_TOOLS = [
  {
    icon: Terminal,
    title: "CI Error Decoder",
    description: "Paste any CI log — AI identifies the root cause and suggests a fix instantly.",
    href: "/tools/ci-error-decoder",
    badge: "AI-Powered",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: Cpu,
    title: "GitHub Actions Generator",
    description: "Visual builder for GitHub Actions workflow YAML. Pick your stack, get production-ready CI.",
    href: "/tools/github-actions-generator",
    badge: "Popular",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: TestTube2,
    title: "Flaky Test Analyzer",
    description: "Upload CI logs from multiple runs to find inconsistent tests wasting your build time.",
    href: "/tools/flaky-test-analyzer",
    badge: null,
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Calculator,
    title: "CI/CD Cost Calculator",
    description: "Calculate your monthly CI bill across GitHub Actions, GitLab CI, CircleCI. See savings from fewer failures.",
    href: "/tools/ci-cost-calculator",
    badge: null,
    color: "bg-green-50 text-green-600",
  },
  {
    icon: ShieldCheck,
    title: "GitHub Actions Validator",
    description: "Validate workflow YAML syntax, check for common mistakes, and get best practice suggestions.",
    href: "/tools/github-actions-validator",
    badge: null,
    color: "bg-purple-50 text-purple-600",
  },
];

const MORE_TOOLS = [
  {
    icon: Clock,
    title: "Cron Expression Builder",
    description: "Visual cron builder optimized for GitHub Actions schedule triggers.",
    href: "/tools/cron-builder",
  },
  {
    icon: FileCode,
    title: "YAML Validator & Formatter",
    description: "Validate and format YAML with presets for GitHub Actions, Docker Compose, Kubernetes.",
    href: "/tools/yaml-validator",
  },
  {
    icon: Layers,
    title: "Dockerfile Linter",
    description: "16-rule security and best practices audit for your Dockerfiles.",
    href: "/tools/dockerfile-linter",
  },
  {
    icon: FileText,
    title: ".env File Generator",
    description: "Generate .env templates from GitHub Actions secrets, Docker Compose, or Kubernetes configs.",
    href: "/tools/env-generator",
  },
  {
    icon: Timer,
    title: "Build Time Estimator",
    description: "Estimate CI build time for your stack with caching and parallelism recommendations.",
    href: "/tools/build-time-estimator",
  },
  {
    icon: FileSearch,
    title: "Postmortem Generator",
    description: "Generate structured incident postmortem reports from CI failure details.",
    href: "/tools/postmortem-generator",
  },
  {
    icon: Heart,
    title: "CI Health Score",
    description: "Input your failure rate, build time, and flaky test count to get a pipeline health grade.",
    href: "/tools/ci-health-score",
  },
];

const PROGRAMMATIC = [
  {
    icon: Wrench,
    title: "Error Fix Database",
    description: "500+ specific CI error fixes. Each error explained with root cause, manual fix, and how WarpFix automates it.",
    href: "/tools/fix",
    count: "500+ errors",
  },
  {
    icon: GitBranch,
    title: "Framework CI Guides",
    description: "Step-by-step CI/CD setup guides for every major framework — Next.js, Django, Rails, Go, Rust, and more.",
    href: "/tools/guides",
    count: "50+ frameworks",
  },
  {
    icon: BarChart3,
    title: "CI/CD Comparisons",
    description: "Detailed feature and pricing comparisons between CI/CD platforms. Data-driven, neutral analysis.",
    href: "/tools/compare",
    count: "25+ comparisons",
  },
];

export default function ToolsHub() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)] bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Image src="/icons/icon-192.png" alt="WarpFix" width={28} height={28} className="shrink-0" />
            <span className="font-semibold text-[14px] sm:text-[15px]">WarpFix</span>
            <span className="text-[var(--text-tertiary)] text-[13px] hidden sm:inline">/</span>
            <span className="text-[var(--text-secondary)] text-[13px] font-medium hidden sm:inline">Free Tools</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/tools"
              className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap hidden sm:inline"
            >
              All Tools
            </Link>
            <Link
              href="/docs"
              className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Docs
            </Link>
            <Link
              href="https://api.warpfix.org/auth/github"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[var(--brand)] text-white text-[12px] sm:text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] transition-colors whitespace-nowrap"
            >
              <GitHubIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Try WarpFix Free</span>
              <span className="sm:hidden">Try Free</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--brand-muted)] text-[var(--brand)] text-[12px] font-medium rounded-full mb-4">
              <Zap className="w-3 h-3" />
              100% Free — No Signup Required
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Free Developer Tools
              <br />
              <span className="text-[var(--brand)]">for CI/CD & DevOps</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto leading-relaxed">
              Decode CI errors, generate workflows, validate YAML, calculate costs, and more.
              Everything runs in your browser — your data never leaves your device.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center justify-center gap-4 mt-6 text-[13px] text-[var(--text-tertiary)]"
          >
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Client-side processing
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--border-default)]" />
            <span>No account needed</span>
            <span className="w-1 h-1 rounded-full bg-[var(--border-default)]" />
            <span>Open source</span>
          </motion.div>
        </div>
      </section>

      {/* Priority 1 Tools */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold tracking-tight mb-6">Most Popular</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRIORITY_TOOLS.map((tool, i) => (
              <motion.div key={tool.title} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Link
                  href={tool.href}
                  className="group block bg-white border border-[var(--border-default)] rounded-xl p-6 hover:border-[var(--brand)] hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tool.color}`}>
                      <tool.icon className="w-5 h-5" />
                    </div>
                    {tool.badge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--brand-muted)] text-[var(--brand)]">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[15px] mb-1.5 group-hover:text-[var(--brand)] transition-colors">{tool.title}</h3>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">{tool.description}</p>
                  <span className="inline-flex items-center gap-1 text-[12px] text-[var(--brand)] font-medium group-hover:gap-2 transition-all">
                    Open tool <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* More Tools */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold tracking-tight mb-6">More Utilities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {MORE_TOOLS.map((tool, i) => (
              <motion.div key={tool.title} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Link
                  href={tool.href}
                  className="group block bg-white border border-[var(--border-default)] rounded-lg p-4 hover:border-[var(--brand)] hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <tool.icon className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] transition-colors" />
                    <h3 className="font-medium text-[13px] group-hover:text-[var(--brand)] transition-colors">{tool.title}</h3>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">{tool.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Programmatic Sections */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold tracking-tight mb-6">Knowledge Base</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PROGRAMMATIC.map((item, i) => (
              <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Link
                  href={item.href}
                  className="group block bg-white border border-[var(--border-default)] rounded-xl p-6 hover:border-[var(--brand)] hover:shadow-md transition-all duration-200"
                >
                  <item.icon className="w-6 h-6 text-[var(--brand)] mb-3" />
                  <h3 className="font-semibold text-[15px] mb-1.5">{item.title}</h3>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--text-tertiary)]">{item.count}</span>
                    <ArrowRight className="w-4 h-4 text-[var(--brand)] group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WarpFix CTA */}
      <section className="py-16 px-6 bg-[var(--bg-inverse)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
            These tools fix errors manually.
            <br />
            WarpFix fixes them <span className="text-[var(--brand)]">automatically</span>.
          </h2>
          <p className="text-neutral-400 text-[14px] mb-6 max-w-lg mx-auto">
            WarpFix monitors your GitHub repos 24/7. When CI fails, it identifies the error,
            generates a fix, validates it in a sandbox, and opens a PR — before you even see the failure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="https://api.warpfix.org/auth/github"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--bg-inverse)] rounded-lg font-medium text-[13px] hover:bg-neutral-100 transition-colors"
            >
              <GitHubIcon className="w-4 h-4" />
              Install WarpFix — Free
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-700 text-neutral-300 rounded-lg text-[13px] hover:border-neutral-500 hover:text-white transition-colors"
            >
              Learn more
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)] py-8 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
            <Image src="/icons/icon-192.png" alt="WarpFix" width={20} height={20} />
            <span>&copy; {new Date().getFullYear()} WarpFix. All tools free to use.</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-[var(--text-tertiary)]">
            <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-[var(--text-secondary)] transition-colors">Docs</Link>
            <a href="https://github.com/apps/warpfix" className="hover:text-[var(--text-secondary)] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
