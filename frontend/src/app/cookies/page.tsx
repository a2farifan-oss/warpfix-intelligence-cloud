import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Understand how WarpFix uses cookies and similar tracking technologies.",
  alternates: { canonical: "https://warpfix.org/cookies" },
  openGraph: {
    title: "Cookie Policy | WarpFix",
    description: "Understand how WarpFix uses cookies and similar tracking technologies.",
    url: "https://warpfix.org/cookies",
    siteName: "WarpFix",
    type: "website",
  },
};

export default function CookiePolicyPage() {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Cookie Policy</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-10">Last updated: April 28, 2026</p>

        <div className="prose-legal">
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. What Are Cookies</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide reporting information to website owners. Cookies set by the website operator are called &quot;first-party cookies.&quot; Cookies set by parties other than the website operator are called &quot;third-party cookies.&quot;
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. How We Use Cookies</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              WarpFix uses cookies and similar technologies for the following purposes:
            </p>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">2.1 Strictly Necessary Cookies</h3>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-4">
              These cookies are essential for the operation of our Service. They include cookies that enable you to log in, maintain your session, and access secure areas of the platform.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-[13px] border border-[var(--border-default)] rounded-lg">
                <thead>
                  <tr className="bg-[var(--bg-elevated)]">
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Cookie</th>
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Purpose</th>
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-default)]">
                    <td className="px-4 py-2 font-mono">wf_session</td>
                    <td className="px-4 py-2">Maintains your authentication session</td>
                    <td className="px-4 py-2">Session</td>
                  </tr>
                  <tr className="border-b border-[var(--border-default)]">
                    <td className="px-4 py-2 font-mono">wf_csrf</td>
                    <td className="px-4 py-2">Cross-site request forgery protection</td>
                    <td className="px-4 py-2">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono">wf_consent</td>
                    <td className="px-4 py-2">Records your cookie consent preferences</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">2.2 Performance and Analytics Cookies</h3>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-4">
              These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve the Service.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-[13px] border border-[var(--border-default)] rounded-lg">
                <thead>
                  <tr className="bg-[var(--bg-elevated)]">
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Cookie</th>
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Purpose</th>
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-default)]">
                    <td className="px-4 py-2 font-mono">_ga</td>
                    <td className="px-4 py-2">Google Analytics - distinguishes unique users</td>
                    <td className="px-4 py-2">2 years</td>
                  </tr>
                  <tr className="border-b border-[var(--border-default)]">
                    <td className="px-4 py-2 font-mono">_ga_*</td>
                    <td className="px-4 py-2">Google Analytics - maintains session state</td>
                    <td className="px-4 py-2">2 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono">wf_vitals</td>
                    <td className="px-4 py-2">Web Vitals performance metrics</td>
                    <td className="px-4 py-2">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-2">2.3 Functional Cookies</h3>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-4">
              These cookies enable enhanced functionality and personalization, such as remembering your preferences.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border border-[var(--border-default)] rounded-lg">
                <thead>
                  <tr className="bg-[var(--bg-elevated)]">
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Cookie</th>
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Purpose</th>
                    <th className="text-left px-4 py-2 font-medium text-[var(--text-primary)] border-b border-[var(--border-default)]">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-default)]">
                    <td className="px-4 py-2 font-mono">wf_sidebar</td>
                    <td className="px-4 py-2">Remembers sidebar collapse state</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono">wf_locale</td>
                    <td className="px-4 py-2">Remembers your language preference</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Managing Cookies</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              Most web browsers allow you to control cookies through their settings. You can set your browser to:
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1 mb-4">
              <li>Block all cookies</li>
              <li>Accept only first-party cookies</li>
              <li>Delete cookies when you close the browser</li>
              <li>Be notified when a cookie is set</li>
            </ul>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Please note that blocking or deleting cookies may impact your experience with our Service. Some features may not function properly without certain cookies.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Third-Party Cookies</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Some cookies on our site are placed by third-party services that appear on our pages. We do not control the setting of these cookies. Third parties that may set cookies through our Service include Google Analytics (for usage analytics) and GitHub (for authentication). These third parties have their own privacy and cookie policies.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Do Not Track Signals</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Some browsers offer a &quot;Do Not Track&quot; (DNT) signal. We currently respond to DNT signals by disabling analytics cookies when a DNT header is detected. However, there is no industry consensus on how to interpret DNT signals, and our approach may change as standards evolve.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Updates to This Policy</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We may update this Cookie Policy from time to time to reflect changes in our practices or applicable regulations. Any updates will be posted on this page with a revised &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Contact Us</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              If you have any questions about our use of cookies, please contact us at:
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
