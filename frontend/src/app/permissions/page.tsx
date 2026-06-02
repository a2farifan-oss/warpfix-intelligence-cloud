import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Permissions",
  description: "Detailed explanation of every GitHub App permission WarpFix requests and why.",
  alternates: { canonical: "https://warpfix.org/permissions" },
  openGraph: {
    title: "Permissions | WarpFix",
    description: "Detailed explanation of every GitHub App permission WarpFix requests and why.",
    url: "https://warpfix.org/permissions",
    siteName: "WarpFix",
    type: "website",
  },
};

interface Permission {
  scope: string;
  access: "Read" | "Read & Write";
  why: string;
  details: string;
}

const PERMISSIONS: Permission[] = [
  {
    scope: "Repository contents",
    access: "Read & Write",
    why: "Read source files for error context; write to create fix branches",
    details: "When a CI failure occurs, WarpFix reads only the specific files referenced in the error logs — not your entire repository. Write access is used exclusively to push fix branches and create pull requests. WarpFix never modifies your main/master branch directly.",
  },
  {
    scope: "Actions",
    access: "Read",
    why: "Read CI workflow run logs to diagnose failures",
    details: "WarpFix monitors GitHub Actions workflow runs for failures. When a failure is detected, it reads the job logs to identify the error. Only failed runs are analyzed — successful runs are ignored entirely.",
  },
  {
    scope: "Pull requests",
    access: "Read & Write",
    why: "Open fix PRs, post review comments, respond to @warpfix mentions",
    details: "Write access is used to: (1) create fix PRs with detailed descriptions, (2) post inline review comments with severity ratings, and (3) respond to @warpfix chat commands in PR comments. All PRs require human approval before merge.",
  },
  {
    scope: "Issues",
    access: "Read",
    why: "Cross-reference related issues when analyzing failures",
    details: "Read-only access to issues allows WarpFix to link repairs to relevant open issues and provide context in fix PRs. WarpFix never creates, modifies, or closes issues.",
  },
  {
    scope: "Metadata",
    access: "Read",
    why: "Basic repository information for configuration",
    details: "Standard metadata access provides repository name, language, default branch, and other basic info needed to configure the repair pipeline correctly for your project.",
  },
  {
    scope: "Checks",
    access: "Read",
    why: "Monitor CI check statuses for failure detection",
    details: "WarpFix reads check run results to determine which specific checks failed and correlate them with workflow logs. This enables precise failure classification.",
  },
  {
    scope: "Webhooks",
    access: "Read",
    why: "Receive real-time notifications of CI events",
    details: "Webhook events (workflow_run, check_run, pull_request) are how WarpFix learns about CI failures in real time. Events are processed and immediately discarded — they are not stored.",
  },
];

export default function PermissionsPage() {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">GitHub App Permissions</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-4">
          WarpFix follows the principle of least privilege. Here is every permission we request and exactly why.
        </p>
        <p className="text-[14px] text-[var(--text-secondary)] mb-12 bg-green-50 border border-green-100 rounded-lg p-4">
          WarpFix never auto-merges code. Every fix PR requires human review and approval before it reaches your codebase.
        </p>

        {/* Permissions table */}
        <div className="space-y-4">
          {PERMISSIONS.map((perm) => (
            <div key={perm.scope} className="bg-white rounded-xl border border-[var(--border-default)] overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{perm.scope}</h2>
                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                    perm.access === "Read" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {perm.access}
                  </span>
                </div>
                <p className="text-[14px] font-medium text-[var(--text-secondary)] mb-2">{perm.why}</p>
                <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed">{perm.details}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-5 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">7</div>
            <div className="text-[13px] text-[var(--text-tertiary)]">Permission scopes</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-5 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">5</div>
            <div className="text-[13px] text-[var(--text-tertiary)]">Read-only scopes</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-5 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">2</div>
            <div className="text-[13px] text-[var(--text-tertiary)]">Read & Write scopes</div>
          </div>
        </div>

        {/* Compare */}
        <div className="mt-12 bg-indigo-50 rounded-xl p-6 border border-indigo-100">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Minimal by design</h2>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            Many CI tools request broad permissions including organization management, team membership, and deployment access. WarpFix only requests what is strictly necessary to read logs, analyze code, and open PRs. You can review the exact permissions on the{" "}
            <a href="https://github.com/apps/warpfix-ci" className="text-indigo-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">GitHub App installation page</a>.
          </p>
        </div>

        {/* Security link */}
        <div className="mt-6 text-center">
          <p className="text-[14px] text-[var(--text-tertiary)]">
            For more details on data handling and encryption, see our{" "}
            <Link href="/security" className="text-indigo-600 hover:underline font-medium">Security & Data Practices</Link> page.
          </p>
        </div>
      </main>
    </div>
  );
}
