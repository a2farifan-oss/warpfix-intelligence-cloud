import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Recent updates, improvements, and new features shipped to the WarpFix platform.",
  alternates: { canonical: "https://warpfix.org/changelog" },
  openGraph: {
    title: "Changelog | WarpFix",
    description: "Recent updates, improvements, and new features shipped to the WarpFix platform.",
    url: "https://warpfix.org/changelog",
    siteName: "WarpFix",
    type: "website",
  },
};

const ENTRIES = [
  {
    version: "v1.8.0",
    date: "April 28, 2026",
    tag: "Latest",
    tagColor: "bg-green-50 text-green-700",
    changes: [
      { type: "feature", text: "Unlimited insights dashboards for free-tier users (fingerprints, flaky tests, slowest jobs)" },
      { type: "feature", text: "Simulation / read-only mode — WarpFix comments patches without opening PRs" },
      { type: "feature", text: "Autopsy reports for every CI failure with root cause analysis" },
      { type: "feature", text: "Static tool auto-fixes via ruff, eslint, and prettier (no LLM tokens needed)" },
      { type: "feature", text: "Dependency hygiene alerts for outdated and deprecated packages" },
      { type: "feature", text: "Flaky test detection using CI history heuristics" },
      { type: "improvement", text: "Polished GitHub PR formatting with collapsible sections, severity badges, and Mermaid diagrams" },
    ],
  },
  {
    version: "v1.7.0",
    date: "April 25, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feature", text: "Custom domain setup — warpfix.org with full SSL" },
      { type: "feature", text: "Admin panel with user management, tier gating, and promo codes" },
      { type: "feature", text: "Full legal pages — Privacy, Terms, Cookie Policy, Refund, Acceptable Use" },
      { type: "improvement", text: "Real API data for dashboard — GitHub avatar, live notifications, repair history" },
      { type: "improvement", text: "New WarpFix logo (bolt + wrench) deployed across all touchpoints" },
      { type: "fix", text: "OAuth callback URL updated to custom domain" },
    ],
  },
  {
    version: "v1.6.0",
    date: "April 20, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feature", text: "1,140 optimizations across SEO, speed, mobile, AI, and security" },
      { type: "feature", text: "PWA manifest with installable app support" },
      { type: "feature", text: "JSON-LD structured data — 11 schema types for AI citation" },
      { type: "feature", text: "llms.txt and llms-full.txt for AI crawler consumption" },
      { type: "improvement", text: "8 security headers (HSTS, CSP, X-Frame-Options, etc.)" },
      { type: "fix", text: "Hero text cutoff behind fixed nav bar" },
    ],
  },
  {
    version: "v1.5.0",
    date: "April 15, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feature", text: "Chat agent — @warpfix mention in PR comments for security analysis, test suggestions" },
      { type: "feature", text: "Predictive CI failure — inspects PR diffs before CI runs" },
      { type: "feature", text: "Quality gates via .warpfix.yaml configuration" },
      { type: "improvement", text: "Confidence scoring with per-patch reliability ratings" },
    ],
  },
  {
    version: "v1.0.0",
    date: "March 30, 2026",
    tag: "Launch",
    tagColor: "bg-indigo-50 text-indigo-700",
    changes: [
      { type: "feature", text: "Initial release — multi-agent CI repair pipeline" },
      { type: "feature", text: "Fingerprint learning with cross-org pattern sharing" },
      { type: "feature", text: "Sandbox validation for all generated patches" },
      { type: "feature", text: "PR review intelligence with inline comments and effort estimates" },
      { type: "feature", text: "GitHub App installation with minimal permissions" },
    ],
  },
];

const typeIcons: Record<string, { icon: string; color: string }> = {
  feature: { icon: "✦", color: "text-indigo-600" },
  improvement: { icon: "↑", color: "text-blue-600" },
  fix: { icon: "✓", color: "text-green-600" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[var(--border-default)]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-warpfix.png" alt="WarpFix" width={28} height={28} />
            <span className="font-semibold text-[15px] text-[var(--text-primary)]">WarpFix</span>
          </Link>
          <Link href="/" className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Changelog</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-12">
          Every feature, improvement, and fix shipped to WarpFix.
        </p>

        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--border-default)]" />

          <div className="space-y-10">
            {ENTRIES.map((entry) => (
              <div key={entry.version} className="relative pl-12">
                <div className="absolute left-2.5 top-1 w-[14px] h-[14px] rounded-full bg-white border-2 border-indigo-400" />
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{entry.version}</h2>
                  {entry.tag && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${entry.tagColor}`}>
                      {entry.tag}
                    </span>
                  )}
                  <span className="text-[13px] text-[var(--text-tertiary)]">{entry.date}</span>
                </div>
                <ul className="space-y-2">
                  {entry.changes.map((change, i) => {
                    const { icon, color } = typeIcons[change.type] || typeIcons.feature;
                    return (
                      <li key={i} className="flex items-start gap-2 text-[14px]">
                        <span className={`${color} mt-0.5 font-bold`}>{icon}</span>
                        <span className="text-[var(--text-secondary)]">{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
