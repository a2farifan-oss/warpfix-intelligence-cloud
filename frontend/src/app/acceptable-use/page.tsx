import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description:
    "Review the acceptable use guidelines for the WarpFix platform.",
  alternates: { canonical: "https://warpfix.org/acceptable-use" },
  openGraph: {
    title: "Acceptable Use Policy | WarpFix",
    description: "Review the acceptable use guidelines for the WarpFix platform.",
    url: "https://warpfix.org/acceptable-use",
    siteName: "WarpFix",
    type: "website",
  },
};

export default function AcceptableUsePolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[var(--border-default)]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-warpfix.png" alt="WarpFix" width={28} height={28} />
            <span className="font-semibold text-[15px] text-[var(--text-primary)]">WarpFix</span>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Acceptable Use Policy</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-10">Last updated: April 28, 2026</p>

        <div className="prose-legal">
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Overview</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              This Acceptable Use Policy (&quot;AUP&quot;) outlines the permitted and prohibited uses of the WarpFix platform. By using our Service, you agree to comply with this policy. Violation of this AUP may result in suspension or termination of your account.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. Permitted Use</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              WarpFix is designed for legitimate software development activities. You may use the Service to:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Connect your own repositories or repositories you have authorization to access</li>
              <li>Detect and repair CI/CD pipeline failures in your projects</li>
              <li>Review code quality, security vulnerabilities, and test coverage</li>
              <li>Generate and manage automated pull requests</li>
              <li>Analyze dependencies and manage technical debt</li>
              <li>Use fingerprint learning to improve repair accuracy over time</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Prohibited Activities</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              You may not use the Service to:
            </p>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">3.1 Illegal and Harmful Activities</h3>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1 mb-4">
              <li>Violate any applicable local, state, national, or international laws or regulations</li>
              <li>Process or store data that you do not have the right to use</li>
              <li>Engage in activities that could cause harm to others or damage systems</li>
              <li>Facilitate illegal file sharing, piracy, or distribution of stolen content</li>
            </ul>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">3.2 Security Violations</h3>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1 mb-4">
              <li>Attempt to gain unauthorized access to any systems, accounts, or networks</li>
              <li>Probe, scan, or test the vulnerability of the Service without authorization</li>
              <li>Circumvent any security or authentication measures</li>
              <li>Distribute malware, viruses, trojans, or other harmful software</li>
              <li>Use the Service to launch attacks against other systems (DDoS, brute force, etc.)</li>
            </ul>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">3.3 Abuse of Service</h3>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1 mb-4">
              <li>Create multiple free accounts to circumvent usage limits</li>
              <li>Use automated tools to scrape, crawl, or extract data from the Service beyond API rate limits</li>
              <li>Resell, sublicense, or redistribute access to the Service without authorization</li>
              <li>Use the Service to develop or train competing products</li>
              <li>Intentionally submit malicious code designed to exploit our processing systems</li>
              <li>Generate excessive or unnecessary API calls to degrade Service performance</li>
            </ul>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">3.4 Content Violations</h3>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Connect repositories containing illegal content or material that violates others&apos; rights</li>
              <li>Use the Service to process content that promotes violence, hatred, or discrimination</li>
              <li>Infringe upon the intellectual property rights of third parties</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Rate Limits and Fair Use</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              To ensure the Service remains available and performant for all users, we enforce rate limits and fair use guidelines:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li><strong>Free tier:</strong> 3 repairs per month, 1 repository</li>
              <li><strong>Pro tier:</strong> Unlimited repairs, subject to reasonable use (no more than 1,000 API calls per hour)</li>
              <li><strong>Team tier:</strong> Unlimited repairs, higher rate limits (no more than 5,000 API calls per hour per seat)</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mt-3">
              Users who consistently exceed rate limits may be contacted to discuss upgrading their plan or adjusting their usage patterns.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Reporting Violations</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              If you believe someone is violating this AUP, please report it to <a href="mailto:support@warpfix.org" className="text-[var(--brand)] hover:underline">support@warpfix.org</a>. Include as much detail as possible about the violation.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Consequences of Violation</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              Violation of this AUP may result in:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Written warning via email</li>
              <li>Temporary suspension of your account</li>
              <li>Permanent termination of your account and deletion of associated data</li>
              <li>Reporting to appropriate law enforcement authorities</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mt-3">
              We reserve the right to determine, at our sole discretion, whether a violation has occurred and what action to take.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Contact Us</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              If you have any questions about this Acceptable Use Policy, please contact us at:
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mt-2">
              <strong>Email:</strong> <a href="mailto:support@warpfix.org" className="text-[var(--brand)] hover:underline">support@warpfix.org</a><br />
              <strong>Website:</strong> <a href="https://warpfix.org" className="text-[var(--brand)] hover:underline">warpfix.org</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-[var(--border-default)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[var(--text-tertiary)]">
          <span>&copy; {new Date().getFullYear()} WarpFix. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-[var(--text-secondary)] transition-colors">Cookies</Link>
            <Link href="/refund" className="hover:text-[var(--text-secondary)] transition-colors">Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
