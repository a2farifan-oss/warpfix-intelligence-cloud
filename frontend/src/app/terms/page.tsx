import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms and conditions governing your use of the WarpFix platform.",
  alternates: { canonical: "https://warpfix.org/terms" },
  openGraph: {
    title: "Terms of Service | WarpFix",
    description: "Read the terms and conditions governing your use of the WarpFix platform.",
    url: "https://warpfix.org/terms",
    siteName: "WarpFix",
    type: "website",
  },
};

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Terms of Service</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-10">Last updated: April 28, 2026</p>

        <div className="prose-legal">
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Acceptance of Terms</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              By accessing or using the WarpFix platform (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to all of these Terms, do not use the Service. These Terms constitute a legally binding agreement between you and WarpFix (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. Description of Service</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              WarpFix is an AI-powered autonomous CI repair and code intelligence platform that provides:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Automated detection and repair of CI/CD pipeline failures</li>
              <li>AI-powered code review and quality analysis</li>
              <li>Security vulnerability scanning and auto-patching</li>
              <li>Dependency management and conflict resolution</li>
              <li>Test coverage analysis and dead code detection</li>
              <li>Fingerprint-based pattern learning for faster repairs</li>
              <li>Automated pull request generation and management</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Account Registration</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              To use the Service, you must create an account by authenticating through GitHub OAuth. You agree to:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mt-3">
              We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or abusive behavior.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Subscription Plans and Billing</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              WarpFix offers the following subscription tiers:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1 mb-4">
              <li><strong>Free:</strong> Limited to 3 repairs per month and 1 connected repository</li>
              <li><strong>Pro ($29/month):</strong> Unlimited repairs, unlimited repositories, code reviews, security scanning, and all advanced features</li>
              <li><strong>Team ($79/month per seat):</strong> All Pro features plus tech debt analysis, team dashboards, and priority support</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              Paid subscriptions are billed in advance on a monthly or annual basis. All fees are non-refundable except as described in our <Link href="/refund" className="text-[var(--brand)] hover:underline">Refund Policy</Link>.
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We reserve the right to change our pricing with 30 days&apos; notice. Existing subscribers will be grandfathered into their current plan pricing for the remainder of their billing cycle.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Acceptable Use</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Transmit malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
              <li>Use the Service to develop competing products</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Share your account credentials or allow unauthorized users to access the Service</li>
              <li>Abuse rate limits or overwhelm the Service with excessive automated requests</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mt-3">
              For detailed information, see our <Link href="/acceptable-use" className="text-[var(--brand)] hover:underline">Acceptable Use Policy</Link>.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Intellectual Property</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              <strong>Your Code:</strong> You retain all ownership rights to the source code, repositories, and content you provide to the Service. By using WarpFix, you grant us a limited, non-exclusive license to access and process your code solely for the purpose of providing the Service.
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              <strong>Our Service:</strong> The WarpFix platform, including its design, algorithms, documentation, and all related intellectual property, is owned by WarpFix and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works of our Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Limitation of Liability</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WARPFIX SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Your use of or inability to use the Service</li>
              <li>Any patches, changes, or pull requests generated by the Service</li>
              <li>Unauthorized access to or alteration of your code or data</li>
              <li>Any third-party conduct on the Service</li>
              <li>Any other matter relating to the Service</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mt-3">
              Our total liability for any claim arising from or related to these Terms shall not exceed the amount you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT PATCHES GENERATED BY THE SERVICE WILL BE CORRECT OR SUITABLE FOR YOUR NEEDS. YOU ARE RESPONSIBLE FOR REVIEWING ALL CODE CHANGES BEFORE MERGING THEM.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">9. Termination</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or the Service. You may terminate your account at any time by contacting us at <a href="mailto:support@warpfix.org" className="text-[var(--brand)] hover:underline">support@warpfix.org</a>. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">10. Governing Law</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Delaware.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">11. Changes to These Terms</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email or by posting a notice on the Service at least 30 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">12. Contact Us</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              If you have any questions about these Terms, please contact us at:
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
