import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "See what's live and what's coming next to the WarpFix platform.",
  alternates: { canonical: "https://warpfix.org/roadmap" },
  openGraph: {
    title: "Roadmap | WarpFix",
    description: "See what's live and what's coming next to the WarpFix platform.",
    url: "https://warpfix.org/roadmap",
    siteName: "WarpFix",
    type: "website",
  },
};

type Status = "live" | "coming-soon";

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
  quarter?: string;
}

const statusConfig: Record<Status, { label: string; color: string; bg: string }> = {
  live: { label: "Live", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  "coming-soon": { label: "Coming Soon", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
};

const SECTIONS: { title: string; items: RoadmapItem[] }[] = [
  {
    title: "CI Repair Engine",
    items: [
      { title: "Multi-Agent Repair Pipeline", description: "6-agent system: parser, classifier, patcher, validator, scorer, shipper", status: "live" },
      { title: "Fingerprint Learning", description: "Hash-based error pattern matching with cross-org sharing and confidence scores", status: "live" },
      { title: "Sandbox Validation", description: "Isolated Docker containers for patch testing before PR creation", status: "live" },
      { title: "Predictive CI Failure", description: "Analyze PR diffs to warn about likely failures before CI runs", status: "live" },
      { title: "Auto-Retry with Variants", description: "When first patch fails validation, generate and test alternative approaches", status: "coming-soon", quarter: "Q3 2026" },
    ],
  },
  {
    title: "Code Review Intelligence",
    items: [
      { title: "PR Review Summaries", description: "Auto-generated PR summaries with effort estimates and risk scoring", status: "live" },
      { title: "Inline Review Comments", description: "Severity-tagged inline comments with suggested fixes", status: "live" },
      { title: "Mermaid Architecture Diagrams", description: "Auto-generated flow diagrams showing code change impact", status: "live" },
      { title: "Chat Agent (@warpfix)", description: "Interactive PR assistant for security analysis, test suggestions, refactoring", status: "live" },
      { title: "Multi-PR Impact Analysis", description: "Cross-PR dependency detection and conflict warnings", status: "coming-soon", quarter: "Q3 2026" },
    ],
  },
  {
    title: "Security & Quality",
    items: [
      { title: "Security Auto-Patching", description: "CVE and OWASP vulnerability fixes in CI pipeline", status: "live" },
      { title: "Dead Code Detection", description: "Identify and flag unused code across the codebase", status: "live" },
      { title: "Quality Gates (.warpfix.yaml)", description: "Custom rules and thresholds for code quality enforcement", status: "live" },
      { title: "Static Tool Auto-Fixes", description: "Automated ruff/eslint/prettier fixes at zero LLM cost", status: "live" },
      { title: "License Compliance Scanner", description: "Detect incompatible open-source licenses in dependencies", status: "coming-soon", quarter: "Q4 2026" },
    ],
  },
  {
    title: "Analytics & Insights",
    items: [
      { title: "Repair Dashboard", description: "Track repairs, success rates, and time savings", status: "live" },
      { title: "Failure Fingerprint Analytics", description: "Top failing patterns, frequency trends, and resolution rates", status: "live" },
      { title: "Flaky Test Detection", description: "CI history heuristics to identify non-deterministic test failures", status: "live" },
      { title: "Dependency Hygiene Alerts", description: "Outdated, deprecated, and breaking package notifications", status: "live" },
      { title: "Tech Debt Tracking", description: "Recurring issues, hotspot files, and debt scoring from CI data", status: "live" },
      { title: "Test Coverage Analysis", description: "Per-file test coverage from CI run history", status: "live" },
      { title: "Org Stability Score", description: "Composite score from test reliability, repair efficiency, and org memory", status: "live" },
      { title: "Predictive CI Failure", description: "Pre-CI predictions based on cross-repo network data", status: "live" },
    ],
  },
  {
    title: "Developer Experience",
    items: [
      { title: "GitHub App Installation", description: "One-click install, minimal permissions, instant activation", status: "live" },
      { title: "Simulation / Read-Only Mode", description: "Comment-only mode for patches suggested without opening PRs", status: "live" },
      { title: "Autopsy Reports", description: "Rich failure analysis with root cause, affected files, and historical context", status: "live" },
      { title: "CLI / Local Dry-Run", description: "Run WarpFix analysis locally without GitHub, prints proposed patches", status: "coming-soon", quarter: "Q3 2026" },
      { title: "VS Code Extension", description: "In-editor failure analysis and one-click repair from your IDE", status: "coming-soon", quarter: "Q4 2026" },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[var(--border-default)]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-warpfix.png" alt="WarpFix" width={32} height={32} />
            <span className="font-semibold text-[15px]">WarpFix</span>
          </Link>
          <Link href="/dashboard" className="text-[13px] font-medium text-[var(--brand)] hover:underline">
            Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Roadmap</h1>
        <p className="text-[var(--text-secondary)] text-[15px] mb-12">
          What&apos;s live and what&apos;s coming next.
        </p>

        <div className="space-y-12">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold mb-4 border-b border-[var(--border-default)] pb-2">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => {
                  const cfg = statusConfig[item.status];
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 p-4 bg-white rounded-lg border border-[var(--border-default)]"
                    >
                      <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm">{item.title}</h3>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{item.description}</p>
                        {item.quarter && (
                          <span className="text-[11px] text-[var(--text-tertiary)] mt-1 inline-block">
                            Target: {item.quarter}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
