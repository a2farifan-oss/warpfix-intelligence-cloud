import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Documentation — WarpFix",
  description:
    "Complete WarpFix documentation: installation, configuration, CLI commands, PR chat commands, free developer tools, API reference, integrations, and troubleshooting.",
  keywords: [
    "WarpFix documentation",
    "WarpFix setup",
    "CI auto-repair",
    "GitHub Actions auto-fix",
    "WarpFix CLI",
    "warpfix.yaml config",
  ],
  openGraph: {
    title: "WarpFix Documentation",
    description: "Everything you need to install, configure, and use WarpFix — the AI-powered CI auto-repair platform.",
    url: "https://warpfix.org/docs",
    siteName: "WarpFix",
    type: "website",
  },
  alternates: {
    canonical: "https://warpfix.org/docs",
  },
};

const NAV_ITEMS = [
  { label: "Getting Started", id: "getting-started" },
  { label: "Installation", id: "installation" },
  { label: "Configuration", id: "configuration" },
  { label: "CLI Commands", id: "cli-commands" },
  { label: "PR Chat Commands", id: "pr-chat" },
  { label: "Dashboard Features", id: "dashboard" },
  { label: "Free Tools", id: "free-tools" },
  { label: "Integrations", id: "integrations" },
  { label: "Plans & Billing", id: "plans" },
  { label: "Troubleshooting", id: "troubleshooting" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icons/icon-192.png" alt="WarpFix" width={28} height={28} />
            <span className="font-semibold text-[15px] text-[var(--text-primary)]">WarpFix</span>
            <span className="text-[var(--text-tertiary)] text-[13px]">/</span>
            <span className="text-[var(--text-secondary)] text-[13px] font-medium">Docs</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/tools" className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors hidden sm:inline">
              Free Tools
            </Link>
            <Link href="/changelog" className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors hidden sm:inline">
              Changelog
            </Link>
            <Link href="https://api.warpfix.org/auth/github" className="px-3 py-1.5 bg-[var(--brand)] text-white text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
          <h3 className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">On this page</h3>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="block text-[13px] text-[var(--text-tertiary)] hover:text-[var(--brand)] transition-colors py-1">
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">WarpFix Documentation</h1>
          <p className="text-[var(--text-tertiary)] text-[14px] mb-10">
            Everything you need to install, configure, and use WarpFix — the AI-powered CI auto-repair platform for GitHub.
          </p>

          {/* Getting Started */}
          <section id="getting-started" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Getting Started</h2>
            <div className="space-y-4 text-[14px] text-[var(--text-secondary)] leading-relaxed">
              <p>
                WarpFix monitors your GitHub repositories for CI failures and automatically generates fix PRs. It works with any language, any framework, and any GitHub Actions workflow.
              </p>
              <div className="bg-white rounded-xl border border-[var(--border-default)] p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">How it works</h3>
                <ol className="list-decimal list-inside space-y-2 text-[13px]">
                  <li>Install the WarpFix GitHub App on your repositories</li>
                  <li>When a CI workflow fails, WarpFix receives the webhook</li>
                  <li>AI reads the error logs, classifies the failure, and generates a patch</li>
                  <li>The patch is validated in a Docker sandbox environment</li>
                  <li>If confidence is high enough, WarpFix opens a PR with the fix</li>
                </ol>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <div className="text-lg mb-1">2 min</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">Setup time</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <div className="text-lg mb-1">30s avg</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">Time to fix PR</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <div className="text-lg mb-1">0 config</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">Works out of the box</div>
                </div>
              </div>
            </div>
          </section>

          {/* Installation */}
          <section id="installation" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Installation</h2>
            <div className="space-y-4 text-[14px] text-[var(--text-secondary)] leading-relaxed">
              <div className="bg-white rounded-xl border border-[var(--border-default)] p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Step 1: Connect GitHub</h3>
                <p className="text-[13px] mb-3">Visit <a href="https://warpfix.org" className="text-[var(--brand)] hover:underline font-medium">warpfix.org</a> and click &quot;Connect GitHub&quot;. This authorizes WarpFix via GitHub OAuth.</p>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border-default)] p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Step 2: Install the GitHub App</h3>
                <p className="text-[13px] mb-3">Install the <a href="https://github.com/apps/warpfix" className="text-[var(--brand)] hover:underline font-medium" target="_blank" rel="noopener noreferrer">WarpFix GitHub App</a> on your repositories. You can install it on all repos or select specific ones.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-800">
                  <strong>Permissions required:</strong> Read access to code, metadata, actions. Write access to pull requests, issues, checks.
                  <Link href="/permissions" className="text-[var(--brand)] hover:underline ml-1">View full permissions list →</Link>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border-default)] p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Step 3: Done</h3>
                <p className="text-[13px]">WarpFix starts monitoring immediately. The next time a CI workflow fails, you&apos;ll get an auto-fix PR. No configuration file needed — WarpFix works with zero config.</p>
              </div>
            </div>
          </section>

          {/* Configuration */}
          <section id="configuration" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Configuration</h2>
            <div className="space-y-4 text-[14px] text-[var(--text-secondary)] leading-relaxed">
              <p>WarpFix works without any configuration. Optionally, create a <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-[13px] font-mono">.warpfix.yaml</code> in your repo root to customize behavior.</p>
              <div className="bg-[#1e1e2e] rounded-xl p-5 overflow-x-auto">
                <pre className="text-[13px] text-green-400 font-mono leading-relaxed whitespace-pre">{`# .warpfix.yaml — WarpFix configuration
version: 1

repair:
  auto_fix: true                  # Enable automatic fix PRs
  confidence_threshold: 0.75      # Minimum AI confidence to open PR (0.0-1.0)
  max_retries: 2                  # Max repair attempts per failure
  sandbox_timeout: 300            # Sandbox validation timeout (seconds)

quality_gates:
  min_confidence: 0.8             # Block PRs below this confidence
  require_tests: true             # Require test pass in sandbox
  max_patch_lines: 50             # Max lines changed per fix
  block_on_security: true         # Block fixes with security concerns

review:
  auto_comment: true              # Comment on existing PRs with analysis
  severity_labels: true           # Add severity labels to issues
  mermaid_diagrams: true          # Include architecture diagrams
  effort_estimates: true          # Estimate fix effort in hours

ignore:
  paths:
    - "node_modules/**"
    - "dist/**"
    - "*.lock"
  errors:
    - "ECONNRESET"                # Ignore transient network errors
    - "rate limit"                # Ignore rate limiting

notifications:
  slack:
    channel: "#ci-repairs"
    on_repair: true
    on_failure: true
  email:
    to: "team@yourcompany.com"
    on_security: true`}</pre>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <h4 className="font-semibold text-[13px] text-[var(--text-primary)] mb-2">Quality Gates</h4>
                  <p className="text-[12px] text-[var(--text-tertiary)]">Set minimum confidence scores, required test coverage, and maximum patch complexity for auto-approval of fix PRs.</p>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <h4 className="font-semibold text-[13px] text-[var(--text-primary)] mb-2">Ignore Rules</h4>
                  <p className="text-[12px] text-[var(--text-tertiary)]">Skip specific paths, file patterns, or error types that you don&apos;t want WarpFix to auto-repair.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CLI Commands */}
          <section id="cli-commands" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">CLI Commands</h2>
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">Trigger WarpFix actions from PR comments or the dashboard.</p>
            <div className="space-y-3">
              {[
                { cmd: "fix-ci", desc: "Trigger an auto-repair for a failing CI workflow.", usage: "@warpfix fix-ci or /fix-ci in PR comments" },
                { cmd: "fix-tests", desc: "Fix broken test cases. Analyzes test output, identifies root cause, generates targeted patches.", usage: "@warpfix fix-tests" },
                { cmd: "fix-deps", desc: "Resolve dependency conflicts. Detects version mismatches, lockfile issues, and breaking updates.", usage: "@warpfix fix-deps" },
                { cmd: "predict-failure", desc: "Analyze PR diffs before CI runs. Warns about likely failures based on historical patterns.", usage: "@warpfix predict-failure" },
                { cmd: "repair-last", desc: "Show the most recent repair — patch details, confidence score, validation status.", usage: "@warpfix repair-last" },
              ].map((item) => (
                <div key={item.cmd} className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="bg-indigo-50 text-[var(--brand)] px-2 py-0.5 rounded text-[13px] font-mono font-semibold">{item.cmd}</code>
                  </div>
                  <p className="text-[13px] text-[var(--text-secondary)] mb-1">{item.desc}</p>
                  <p className="text-[12px] text-[var(--text-tertiary)]">Usage: <code className="font-mono">{item.usage}</code></p>
                </div>
              ))}
            </div>
          </section>

          {/* PR Chat Commands */}
          <section id="pr-chat" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">PR Chat Commands</h2>
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">Mention <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-[13px] font-mono">@warpfix</code> in any PR comment to trigger AI analysis.</p>
            <div className="space-y-3">
              {[
                { cmd: "@warpfix explain", desc: "Get a detailed explanation of why a specific code change was made in a repair PR." },
                { cmd: "@warpfix security", desc: "Run a security analysis — checks for CVEs, OWASP issues, and unsafe patterns." },
                { cmd: "@warpfix test", desc: "Generate test cases for new or modified code in the PR." },
                { cmd: "@warpfix refactor", desc: "Get refactoring suggestions — cleaner patterns, performance improvements." },
                { cmd: "@warpfix performance", desc: "Analyze performance implications — algorithmic complexity, memory usage, bottlenecks." },
              ].map((item) => (
                <div key={item.cmd} className="bg-white rounded-xl border border-[var(--border-default)] p-4 flex items-start gap-3">
                  <code className="bg-indigo-50 text-[var(--brand)] px-2 py-0.5 rounded text-[12px] font-mono font-semibold shrink-0">{item.cmd}</code>
                  <p className="text-[13px] text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Dashboard Features */}
          <section id="dashboard" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Dashboard Features</h2>
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">Your WarpFix dashboard at <a href="https://warpfix.org/dashboard" className="text-[var(--brand)] hover:underline font-medium">warpfix.org/dashboard</a> provides:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: "CI Brain", desc: "AI-powered analytics showing failure patterns, trends, and predictions across all repos." },
                { title: "Failure Genome", desc: "Fingerprint and categorize every CI failure. See which error types affect your codebase most." },
                { title: "Autopsy Reports", desc: "Automated incident postmortems for every CI failure with root cause analysis." },
                { title: "Flaky Test Detection", desc: "Identify unreliable tests that pass/fail inconsistently across runs." },
                { title: "PR Reviewer", desc: "AI-powered code review with severity labels, security checks, and refactoring suggestions." },
                { title: "Org Stability Score", desc: "Real-time health score across all repositories measuring CI reliability." },
                { title: "Predictive Failures", desc: "Analyze PR diffs and predict likely CI failures before the workflow runs." },
                { title: "Dependency Radar", desc: "Track outdated, vulnerable, or breaking dependencies across all repos." },
                { title: "Network Intelligence", desc: "Cross-repository pattern detection — learn from fixes in similar codebases." },
                { title: "Org Memory", desc: "Persistent knowledge base of past failures and fixes for faster future repairs." },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <h4 className="font-semibold text-[13px] text-[var(--text-primary)] mb-1">{item.title}</h4>
                  <p className="text-[12px] text-[var(--text-tertiary)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Free Tools */}
          <section id="free-tools" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Free Developer Tools</h2>
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">
              WarpFix offers <Link href="/tools" className="text-[var(--brand)] hover:underline font-medium">15 free developer tools</Link> at <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-[13px] font-mono">warpfix.org/tools</code> — no signup required.
            </p>

            <h3 className="font-semibold text-[14px] text-[var(--text-primary)] mb-3">Interactive Tools (12)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {[
                { name: "CI Error Decoder", path: "/tools/ci-error-decoder", desc: "AI-powered CI log analysis with root cause and fix suggestions" },
                { name: "GitHub Actions Generator", path: "/tools/github-actions-generator", desc: "Generate workflow YAML for any language/framework" },
                { name: "Flaky Test Analyzer", path: "/tools/flaky-test-analyzer", desc: "Detect unreliable tests from CI log comparisons" },
                { name: "CI/CD Cost Calculator", path: "/tools/ci-cost-calculator", desc: "Calculate pipeline costs across major CI platforms" },
                { name: "GitHub Actions Validator", path: "/tools/github-actions-validator", desc: "Validate workflow YAML syntax and best practices" },
                { name: "Cron Builder", path: "/tools/cron-builder", desc: "Visual cron expression editor for Actions schedules" },
                { name: "YAML Validator", path: "/tools/yaml-validator", desc: "Validate and format YAML with CI/Docker/K8s presets" },
                { name: "Dockerfile Linter", path: "/tools/dockerfile-linter", desc: "16-rule security and best practices audit" },
                { name: ".env Generator", path: "/tools/env-generator", desc: "Generate environment variable templates" },
                { name: "Build Time Estimator", path: "/tools/build-time-estimator", desc: "Estimate CI build duration and optimization" },
                { name: "Postmortem Generator", path: "/tools/postmortem-generator", desc: "Generate structured incident postmortem docs" },
                { name: "CI Health Score", path: "/tools/ci-health-score", desc: "Calculate pipeline reliability score" },
              ].map((tool) => (
                <Link key={tool.path} href={tool.path} className="bg-white rounded-xl border border-[var(--border-default)] p-4 hover:border-indigo-200 transition-colors block">
                  <h4 className="font-semibold text-[13px] text-[var(--brand)] mb-1">{tool.name}</h4>
                  <p className="text-[12px] text-[var(--text-tertiary)]">{tool.desc}</p>
                </Link>
              ))}
            </div>

            <h3 className="font-semibold text-[14px] text-[var(--text-primary)] mb-3">Programmatic Content Pages</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/tools/fix" className="bg-white rounded-xl border border-[var(--border-default)] p-4 hover:border-indigo-200 transition-colors">
                <h4 className="font-semibold text-[13px] text-[var(--brand)] mb-1">Error Fix Database</h4>
                <p className="text-[12px] text-[var(--text-tertiary)]">Step-by-step fixes for common CI errors</p>
              </Link>
              <Link href="/tools/guides" className="bg-white rounded-xl border border-[var(--border-default)] p-4 hover:border-indigo-200 transition-colors">
                <h4 className="font-semibold text-[13px] text-[var(--brand)] mb-1">Framework Guides</h4>
                <p className="text-[12px] text-[var(--text-tertiary)]">CI/CD setup guides for popular frameworks</p>
              </Link>
              <Link href="/tools/compare" className="bg-white rounded-xl border border-[var(--border-default)] p-4 hover:border-indigo-200 transition-colors">
                <h4 className="font-semibold text-[13px] text-[var(--brand)] mb-1">CI/CD Comparisons</h4>
                <p className="text-[12px] text-[var(--text-tertiary)]">Side-by-side CI platform comparisons</p>
              </Link>
            </div>
          </section>

          {/* Integrations */}
          <section id="integrations" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Integrations</h2>
            <div className="space-y-3">
              {[
                { title: "GitHub Actions", desc: "Native integration — WarpFix listens to workflow_run webhooks. No extra CI config needed.", status: "Live" },
                { title: "Slack", desc: "Get repair notifications, review summaries, and failure alerts in your channels. Configure in dashboard or .warpfix.yaml.", status: "Live" },
                { title: "Webhooks", desc: "Send repair events to any HTTP endpoint — integrate with PagerDuty, Datadog, or custom dashboards.", status: "Live" },
                { title: "GitLab CI", desc: "GitLab CI/CD integration for auto-repair of GitLab pipelines.", status: "Roadmap" },
                { title: "CircleCI", desc: "CircleCI integration for cross-platform CI monitoring.", status: "Roadmap" },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl border border-[var(--border-default)] p-4 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-[13px] text-[var(--text-primary)] mb-1">{item.title}</h4>
                    <p className="text-[12px] text-[var(--text-tertiary)]">{item.desc}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${item.status === "Live" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Plans & Billing */}
          <section id="plans" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Plans & Billing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-[var(--border-default)] p-5">
                <h3 className="font-semibold text-[14px] text-[var(--text-primary)] mb-1">Free</h3>
                <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">$0<span className="text-[13px] font-normal text-[var(--text-tertiary)]">/month</span></p>
                <ul className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                  <li>3 auto CI repairs / month</li>
                  <li>1 connected repo</li>
                  <li>Community support</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl border-2 border-[var(--brand)] p-5 relative">
                <span className="absolute -top-2.5 right-3 bg-[var(--brand)] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Popular</span>
                <h3 className="font-semibold text-[14px] text-[var(--text-primary)] mb-1">Pro</h3>
                <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">$12<span className="text-[13px] font-normal text-[var(--text-tertiary)]">/month</span></p>
                <ul className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                  <li>Unlimited auto CI repairs</li>
                  <li>Unlimited repos</li>
                  <li>CI Brain analytics</li>
                  <li>Failure fingerprinting</li>
                  <li>Flaky test detection</li>
                  <li>Auto PR reviews</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border-default)] p-5">
                <h3 className="font-semibold text-[14px] text-[var(--text-primary)] mb-1">Team</h3>
                <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">$36<span className="text-[13px] font-normal text-[var(--text-tertiary)]">/month</span></p>
                <ul className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                  <li>Everything in Pro</li>
                  <li>Up to 10 team members</li>
                  <li>Org stability score</li>
                  <li>Network intelligence</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-4">
              Manage your plan at <Link href="/dashboard/billing" className="text-[var(--brand)] hover:underline font-medium">Dashboard → Billing</Link>. Payments processed via Dodo Payments.
            </p>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting" className="mb-14 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-default)] pb-2">Troubleshooting</h2>
            <div className="space-y-3">
              {[
                { q: "WarpFix isn't creating fix PRs", a: "Verify the GitHub App is installed on the repo (Settings → GitHub Apps). Check that your plan has remaining repair credits. Ensure the workflow uses 'workflow_run' event." },
                { q: "Fix PR has low confidence score", a: "WarpFix may not open a PR if confidence is below your threshold. Check .warpfix.yaml confidence_threshold setting. Complex multi-file errors may need manual review." },
                { q: "Repair was incorrect", a: "Close the PR and leave feedback. WarpFix learns from rejected fixes. You can also adjust quality gates in .warpfix.yaml to require higher confidence." },
                { q: "Webhook not receiving events", a: "The webhook URL is https://api.warpfix.org/webhooks/github. Verify in your GitHub App settings that the webhook is active and the secret matches." },
                { q: "How do I uninstall WarpFix?", a: "Go to GitHub Settings → Applications → WarpFix → Configure → Uninstall. Your WarpFix account and data will be retained for 30 days." },
              ].map((item) => (
                <div key={item.q} className="bg-white rounded-xl border border-[var(--border-default)] p-4">
                  <h4 className="font-semibold text-[13px] text-[var(--text-primary)] mb-1">{item.q}</h4>
                  <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Help */}
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 text-center">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Need help?</h2>
            <p className="text-[14px] text-[var(--text-secondary)]">
              Reach out at{" "}
              <a href="mailto:support@warpfix.org" className="text-indigo-600 hover:underline font-medium">support@warpfix.org</a>{" "}
              or open an issue on{" "}
              <a href="https://github.com/bytepassperks/warpfix-intelligence-cloud" className="text-indigo-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">GitHub</a>.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
