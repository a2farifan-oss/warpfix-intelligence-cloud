import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Learn about WarpFix security practices, data handling, LLM provider details, and our commitment to protecting your code.",
  alternates: { canonical: "https://warpfix.org/security" },
  openGraph: {
    title: "Security & Data | WarpFix",
    description: "Learn about WarpFix security practices, data handling, LLM provider details, and our commitment to protecting your code.",
    url: "https://warpfix.org/security",
    siteName: "WarpFix",
    type: "website",
  },
};

const DATA_FLOW_STEPS = [
  { step: "1", title: "CI Failure Detected", desc: "GitHub webhook notifies WarpFix of a failed workflow run." },
  { step: "2", title: "Log Retrieval", desc: "WarpFix reads only the failed job logs via GitHub API (read-only)." },
  { step: "3", title: "Error Classification", desc: "Logs are parsed and classified locally — no external calls yet." },
  { step: "4", title: "LLM Patch Generation", desc: "Relevant code context + error snippet sent to OpenAI GPT-4o for patch generation. No full repo sent." },
  { step: "5", title: "Sandbox Validation", desc: "Candidate patch is tested in an isolated Docker container. No access to production." },
  { step: "6", title: "PR Submission", desc: "If validation passes, a PR is opened via GitHub API. Humans review before merge." },
];

const PERMISSIONS = [
  { scope: "Repository contents (read/write)", reason: "Read source files for context; write to create fix branches and PRs." },
  { scope: "Actions (read)", reason: "Read CI workflow run logs to diagnose failures." },
  { scope: "Pull requests (read/write)", reason: "Open fix PRs, post review comments, and respond to @warpfix mentions." },
  { scope: "Issues (read)", reason: "Cross-reference related issues when analyzing failures." },
  { scope: "Metadata (read)", reason: "Basic repository metadata for configuration." },
];

export default function SecurityPage() {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Security & Data Practices</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-12">
          Transparency about how WarpFix handles your code, data, and security.
        </p>

        {/* LLM Provider */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold">AI</span>
            LLM Provider
          </h2>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-6">
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-4">
              WarpFix uses <strong>OpenAI GPT-4o</strong> as its primary LLM for patch generation, code review intelligence, and chat agent responses.
            </p>
            <ul className="space-y-2 text-[14px] text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>Zero data retention:</strong> We use the OpenAI API with data retention disabled. OpenAI does not store or train on any data sent through our API calls.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>Minimal context:</strong> Only the specific error logs and directly relevant source files are sent — never your entire repository.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>No fine-tuning:</strong> Your code is never used for model training or fine-tuning. Period.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Data Flow Diagram */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-bold">↓</span>
            Data Flow
          </h2>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-6">
            <p className="text-[14px] text-[var(--text-secondary)] mb-6">
              Here is exactly what happens when WarpFix processes a CI failure:
            </p>
            <div className="space-y-4">
              {DATA_FLOW_STEPS.map((s) => (
                <div key={s.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{s.title}</h3>
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Encryption */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 text-sm font-bold">🔒</span>
            Encryption
          </h2>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">In Transit</h3>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  All data is encrypted in transit using TLS 1.3. All API endpoints enforce HTTPS. HSTS headers are set with a 1-year max-age.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">At Rest</h3>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Database storage uses AES-256 encryption at rest. OAuth tokens and secrets are encrypted before storage using application-level encryption.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 text-sm font-bold">⏱</span>
            Data Retention
          </h2>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-6">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-2 font-semibold text-[var(--text-primary)]">Data Type</th>
                  <th className="text-left py-2 font-semibold text-[var(--text-primary)]">Retention</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-2">CI logs (raw)</td>
                  <td className="py-2">Processed in memory, discarded after repair (not stored)</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-2">Error fingerprints</td>
                  <td className="py-2">Stored indefinitely (hashed patterns only, no source code)</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-2">Repair metadata</td>
                  <td className="py-2">90 days (repair type, status, timestamps)</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-2">Generated patches</td>
                  <td className="py-2">Deleted after PR is opened (not persisted)</td>
                </tr>
                <tr>
                  <td className="py-2">Account data</td>
                  <td className="py-2">Until account deletion + 30 day grace period</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* GitHub App Permissions */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 text-sm font-bold">⚙</span>
            GitHub App Permissions
          </h2>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-6">
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">
              WarpFix requests the minimum permissions necessary. Here is exactly what each permission is used for:
            </p>
            <div className="space-y-3">
              {PERMISSIONS.map((p) => (
                <div key={p.scope} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <span className="text-indigo-600 font-mono text-[12px] bg-indigo-50 px-2 py-0.5 rounded flex-shrink-0">{p.scope}</span>
                  <span className="text-[13px] text-[var(--text-secondary)]">{p.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 text-sm font-bold">✓</span>
            Compliance & Standards
          </h2>
          <div className="bg-white rounded-xl border border-[var(--border-default)] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-[var(--border-default)] rounded-lg">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">SOC 2 Type I</h3>
                <span className="text-[12px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">In Progress — Q3 2026</span>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-2">Audit initiated with Vanta. Expected completion Q3 2026.</p>
              </div>
              <div className="p-4 border border-[var(--border-default)] rounded-lg">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">GDPR</h3>
                <span className="text-[12px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Compliant</span>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-2">Data processing agreement available. EU data handled per GDPR requirements.</p>
              </div>
              <div className="p-4 border border-[var(--border-default)] rounded-lg">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">security.txt</h3>
                <span className="text-[12px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Published</span>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-2">Available at <a href="/.well-known/security.txt" className="text-indigo-600 hover:underline">/.well-known/security.txt</a></p>
              </div>
              <div className="p-4 border border-[var(--border-default)] rounded-lg">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">Responsible Disclosure</h3>
                <span className="text-[12px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-2">Report vulnerabilities to <a href="mailto:security@warpfix.org" className="text-indigo-600 hover:underline">security@warpfix.org</a></p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Questions?</h2>
          <p className="text-[14px] text-[var(--text-secondary)]">
            If you have security questions or need a Data Processing Agreement, contact us at{" "}
            <a href="mailto:security@warpfix.org" className="text-indigo-600 hover:underline font-medium">security@warpfix.org</a>.
            We respond to all security inquiries within 24 hours.
          </p>
        </section>
      </main>
    </div>
  );
}
