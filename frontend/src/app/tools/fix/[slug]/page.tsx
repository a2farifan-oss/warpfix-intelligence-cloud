"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Lightbulb, Terminal, Copy, Check, BookOpen } from "lucide-react";
import { useState } from "react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const ERROR_DATA: Record<string, { title: string; category: string; description: string; rootCause: string; steps: string[]; command: string; prevention: string; related: string[] }> = {
  "exit-code-1": {
    title: "Process completed with exit code 1",
    category: "General",
    description: "Exit code 1 is the most common CI failure. It means a process returned a generic error. The actual issue is in the output lines ABOVE this message.",
    rootCause: "A command in your workflow returned a non-zero exit code. This is a catch-all error — the real cause is in the preceding log lines. Common causes: lint errors, test failures, build compilation errors, missing dependencies, or type errors.",
    steps: [
      "Look at the STEP NAME that failed in the workflow run — this tells you which command errored",
      "Read the log lines ABOVE 'Process completed with exit code 1' — the actual error message is there",
      "Common causes: ESLint violations (run 'npx eslint . --fix'), test failures (run 'npm test' locally), TypeScript errors (run 'npx tsc --noEmit'), build failures (run 'npm run build')",
      "Run the exact same command locally to reproduce and fix the error",
      "Push the fix and re-run the workflow",
    ],
    command: "# Reproduce locally — run the exact step that failed:\nnpm test          # if test step failed\nnpm run build     # if build step failed\nnpm run lint      # if lint step failed\nnpx tsc --noEmit  # if typecheck step failed",
    prevention: "Add 'set -e' to shell scripts, use specific exit code handling, and add pre-commit hooks (lint, typecheck) to catch errors before they reach CI. WarpFix auto-detects these failures and opens fix PRs.",
    related: ["exit-code-2", "eslint-errors", "typescript-errors", "jest-test-failed"],
  },
  "npm-eresolve": {
    title: "npm ERR! ERESOLVE unable to resolve dependency tree",
    category: "npm",
    description: "npm v7+ enforces strict peer dependency resolution. This error occurs when two packages require incompatible versions of the same dependency.",
    rootCause: "Package A requires dependency@^2.0 but Package B requires dependency@^3.0. npm can't install both versions simultaneously. This happens most often when upgrading React, TypeScript, or other widely-used packages with strict peer dependencies.",
    steps: [
      "Read the error output to identify which packages are conflicting",
      "Option 1: Add --legacy-peer-deps to your install command (quick fix)",
      "Option 2: Update the conflicting package to a version compatible with your dependencies",
      "Option 3: Use npm overrides in package.json to force a specific version",
      "Update your CI workflow to use the same install command",
    ],
    command: "# Quick fix — add to CI workflow:\nnpm ci --legacy-peer-deps\n\n# Better fix — override in package.json:\n# Add to package.json:\n# \"overrides\": { \"react\": \"$react\" }",
    prevention: "Pin your dependency versions, use a lockfile (package-lock.json), run 'npm ci' instead of 'npm install' in CI, and regularly update dependencies to keep peer versions compatible.",
    related: ["npm-enoent", "node-version-mismatch", "exit-code-1"],
  },
  "eslint-errors": {
    title: "ESLint found problems — X errors, Y warnings",
    category: "Lint",
    description: "ESLint detected code style or potential bug violations in your code. CI is configured to fail when ESLint reports errors.",
    rootCause: "Your code violates one or more ESLint rules. Common violations: unused variables, missing semicolons, inconsistent formatting, unreachable code, or missing return types.",
    steps: [
      "Run 'npx eslint .' locally to see the exact errors",
      "Run 'npx eslint . --fix' to auto-fix formatting issues",
      "For non-auto-fixable errors, read the rule name and fix manually",
      "If a rule is too strict, disable it in .eslintrc or add // eslint-disable-next-line for specific lines",
    ],
    command: "# See all errors:\nnpx eslint .\n\n# Auto-fix what's possible:\nnpx eslint . --fix\n\n# Fix and show remaining:\nnpx eslint . --fix-dry-run",
    prevention: "Use pre-commit hooks (husky + lint-staged) to catch lint errors before they're committed. Configure your editor to show ESLint errors in real-time. WarpFix auto-fixes lint violations in CI.",
    related: ["prettier-check-failed", "exit-code-1", "typescript-errors"],
  },
  "permission-denied": {
    title: "Permission denied (publickey) — Git SSH error",
    category: "Git/SSH",
    description: "The CI runner cannot authenticate with the Git remote. The SSH key or deploy key is missing, expired, or doesn't have the necessary permissions.",
    rootCause: "The GITHUB_TOKEN or deploy key used by the workflow doesn't have read/write access to the repository. Common causes: wrong secret name, expired token, fork PR restrictions, or missing 'permissions: contents: write' in the workflow.",
    steps: [
      "Check if your workflow has a 'permissions' block — add 'contents: write' if pushing commits",
      "For deploy keys: verify the key is added in repo Settings → Deploy Keys",
      "For private submodules: use 'persist-credentials: true' in actions/checkout",
      "For forks: note that GITHUB_TOKEN has read-only access for fork PRs (security feature)",
    ],
    command: "# Add permissions to workflow:\npermissions:\n  contents: write\n  pull-requests: write\n\n# Or use a PAT:\n- uses: actions/checkout@v4\n  with:\n    token: ${{ secrets.PAT_TOKEN }}",
    prevention: "Use the minimum required permissions. For cross-repo access, create a GitHub App or use a scoped PAT stored in repo secrets.",
    related: ["github-token-expired", "actions-checkout-failed", "exit-code-128"],
  },
};

export default function ErrorFixPage() {
  const params = useParams();
  const slug = params.slug as string;
  const error = ERROR_DATA[slug];
  const [copied, setCopied] = useState(false);

  if (!error) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <ToolHeader />
        <main className="max-w-4xl mx-auto px-6 py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Error Page Coming Soon</h1>
          <p className="text-[var(--text-secondary)] text-[14px] mb-6">We&apos;re adding fixes for this error. Check back soon or try our CI Error Decoder.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/tools/fix" className="px-4 py-2 text-[13px] border border-[var(--border-default)] rounded-lg hover:bg-white transition-colors">Browse All Errors</Link>
            <Link href="/tools/ci-error-decoder" className="px-4 py-2 bg-[var(--brand)] text-white text-[13px] rounded-lg hover:bg-[var(--brand-hover)] transition-colors">CI Error Decoder</Link>
          </div>
        </main>
        <ToolFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/tools/fix" className="inline-flex items-center gap-1 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--brand)] mb-4 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Error Database
        </Link>

        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-4">
          <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-50 text-red-600 mb-2">{error.category}</span>
          <h1 className="text-xl font-bold tracking-tight mb-2 font-mono">{error.title}</h1>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{error.description}</p>
        </div>

        {/* Root Cause */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-red-800 mb-2">
            <AlertTriangle className="w-4 h-4" /> Root Cause
          </div>
          <p className="text-[13px] text-red-700 leading-relaxed">{error.rootCause}</p>
        </div>

        {/* Fix Steps */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-green-800 mb-3">
            <Lightbulb className="w-4 h-4" /> How to Fix
          </div>
          <ol className="space-y-2">
            {error.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-green-700">
                <span className="shrink-0 w-5 h-5 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Command */}
        <div className="bg-[var(--bg-inverse)] rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-400">
              <Terminal className="w-3.5 h-3.5" /> Commands
            </div>
            <button onClick={() => { navigator.clipboard.writeText(error.command); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="text-[11px] flex items-center gap-1 text-neutral-500 hover:text-neutral-300">
              {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
          <pre className="text-[12px] font-mono text-neutral-300 whitespace-pre-wrap">{error.command}</pre>
        </div>

        {/* Prevention */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-blue-800 mb-2">
            <BookOpen className="w-4 h-4" /> Prevention
          </div>
          <p className="text-[13px] text-blue-700 leading-relaxed">{error.prevention}</p>
        </div>

        {/* Related */}
        {error.related.length > 0 && (
          <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 mb-4">
            <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Related Errors</h3>
            <div className="flex flex-wrap gap-2">
              {error.related.map((r) => (
                <Link key={r} href={`/tools/fix/${r}`}
                  className="px-3 py-1.5 text-[12px] font-mono border border-[var(--border-default)] rounded-lg hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors">
                  {r}
                </Link>
              ))}
            </div>
          </div>
        )}

        <ToolCTA feature={`WarpFix detects "${error.title}" automatically and opens a fix PR — before you even see the error.`} />
      </main>
      <ToolFooter />
    </div>
  );
}
