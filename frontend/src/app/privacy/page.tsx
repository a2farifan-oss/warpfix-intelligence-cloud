import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how WarpFix collects, uses, and protects your personal information.",
  alternates: { canonical: "https://warpfix.org/privacy" },
  openGraph: {
    title: "Privacy Policy | WarpFix",
    description: "Learn how WarpFix collects, uses, and protects your personal information.",
    url: "https://warpfix.org/privacy",
    siteName: "WarpFix",
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Privacy Policy</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-10">Last updated: April 28, 2026</p>

        <div className="prose-legal">
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Introduction</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-4">
              WarpFix (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the warpfix.org website and the WarpFix platform (collectively, the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              By accessing or using the Service, you agree to this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. Information We Collect</h2>
            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">2.1 Personal Data</h3>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              When you register for an account, we may collect personally identifiable information, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1 mb-4">
              <li>Name and email address (via GitHub OAuth)</li>
              <li>GitHub username and profile information</li>
              <li>Repository metadata (names, URLs, branch information)</li>
              <li>CI/CD pipeline logs and build outputs</li>
              <li>Payment information (processed securely via third-party payment processors)</li>
            </ul>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">2.2 Usage Data</h3>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              We automatically collect certain information when you visit, use, or navigate the Service, including:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1 mb-4">
              <li>IP address and browser type</li>
              <li>Device information and operating system</li>
              <li>Pages visited and time spent on pages</li>
              <li>Referring website addresses</li>
              <li>Feature usage patterns and interaction data</li>
            </ul>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">2.3 Code Data</h3>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              To provide our CI repair and code review services, we access and process source code, build logs, test outputs, and related artifacts from your connected repositories. This data is processed in accordance with our data retention policies and is never shared with third parties for commercial purposes.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. How We Use Your Information</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              We use the information we collect for various purposes, including to:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Provide, operate, and maintain the Service</li>
              <li>Detect CI failures, generate patches, and create pull requests on your behalf</li>
              <li>Perform automated code reviews and security scanning</li>
              <li>Improve and personalize the Service through fingerprint learning</li>
              <li>Process transactions and manage subscriptions</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze usage trends to improve user experience</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Data Sharing and Disclosure</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              We do not sell your personal information. We may share your information in the following situations:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf (e.g., hosting, analytics, payment processing)</li>
              <li><strong>GitHub Integration:</strong> To create pull requests and interact with your repositories as authorized by you</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition</li>
              <li><strong>With Your Consent:</strong> For any other purpose with your explicit consent</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Data Retention</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We retain your personal data only for as long as necessary for the purposes set out in this Privacy Policy. We will retain and use your data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies. CI logs and code artifacts are retained for 90 days after processing, unless you request earlier deletion. Fingerprint data used for pattern matching is retained for the duration of your active subscription.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Data Security</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We implement appropriate technical and organizational measures to protect your personal information, including encryption in transit (TLS 1.3) and at rest (AES-256), access controls, regular security audits, and secure development practices. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Your Rights</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
              <li><strong>Restriction:</strong> Request restriction of processing of your personal data</li>
              <li><strong>Objection:</strong> Object to processing of your personal data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time where we relied on consent to process your data</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mt-3">
              To exercise any of these rights, please contact us at <a href="mailto:support@warpfix.org" className="text-[var(--brand)] hover:underline">support@warpfix.org</a>.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">8. Cookies and Tracking</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. For detailed information about our use of cookies, please see our <Link href="/cookies" className="text-[var(--brand)] hover:underline">Cookie Policy</Link>.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">9. Third-Party Services</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Our Service may contain links to third-party websites, services, or applications (e.g., GitHub, payment processors). We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party services you access.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">10. Children&apos;s Privacy</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Our Service is not directed to individuals under the age of 16. We do not knowingly collect personal data from children under 16. If we become aware that we have collected personal data from a child under 16, we will take steps to delete that information.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">11. International Data Transfers</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Your information may be transferred to and processed in countries other than the country in which you reside. These countries may have data protection laws that are different from the laws of your country. We take appropriate safeguards to ensure that your personal data remains protected in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">12. Changes to This Policy</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">13. Contact Us</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              If you have any questions about this Privacy Policy, please contact us at:
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
