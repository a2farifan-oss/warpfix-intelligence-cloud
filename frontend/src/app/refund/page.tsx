import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "WarpFix refund and cancellation policy. All sales are final — no refunds are issued for paid subscriptions.",
  alternates: { canonical: "https://warpfix.org/refund" },
  openGraph: {
    title: "Refund Policy | WarpFix",
    description: "WarpFix refund and cancellation policy. All sales are final — no refunds are issued for paid subscriptions.",
    url: "https://warpfix.org/refund",
    siteName: "WarpFix",
    type: "website",
  },
};

export default function RefundPolicyPage() {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Refund Policy</h1>
        <p className="text-[var(--text-tertiary)] text-sm mb-10">Last updated: April 28, 2026</p>

        <div className="prose-legal">
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. No Refund Policy</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              All sales are final. WarpFix does not offer refunds for any paid subscription, one-time purchase, or billing charge, regardless of usage or satisfaction. By subscribing to a paid plan, you acknowledge and agree that no refunds will be issued under any circumstances.
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We strongly encourage all users to evaluate WarpFix using our Free tier before upgrading. The Free tier includes up to 3 repairs per month and 1 connected repository at no cost and requires no credit card.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. Cancellation</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-3">
              You may cancel your paid subscription at any time through your account settings or by contacting us at <a href="mailto:support@warpfix.org" className="text-[var(--brand)] hover:underline">support@warpfix.org</a>.
            </p>
            <ul className="list-disc pl-6 text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-1">
              <li>Cancellation takes effect at the end of your current billing period</li>
              <li>You will continue to have access to paid features until the end of the billing period</li>
              <li>After the billing period ends, your account will revert to the Free tier</li>
              <li>No refunds or credits are issued for unused time within a billing period</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Billing Disputes</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              If you believe you were charged in error (e.g., duplicate charge or charge after cancellation), please contact us at <a href="mailto:support@warpfix.org" className="text-[var(--brand)] hover:underline">support@warpfix.org</a> with your account email and transaction details. We will investigate and correct any verified billing errors.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Promotional Credits and Promo Codes</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Promotional credits, discounts applied via promo codes, and any free trial periods are non-refundable and have no cash value.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Contact Us</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              For any questions regarding billing, please contact us at:
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
