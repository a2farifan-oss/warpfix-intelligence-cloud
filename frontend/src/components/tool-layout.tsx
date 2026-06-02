"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Zap } from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function ToolHeader() {
  return (
    <header className="border-b border-[var(--border-default)] bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/tools" className="flex items-center gap-1 sm:gap-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors text-[12px] sm:text-[13px] whitespace-nowrap">
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">All Tools</span>
            <span className="xs:hidden">Tools</span>
          </Link>
          <span className="text-[var(--border-default)] hidden sm:inline">|</span>
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <Image src="/icons/icon-192.png" alt="WarpFix" width={24} height={24} className="shrink-0" />
            <span className="font-semibold text-[13px] sm:text-[14px] hidden sm:inline">WarpFix</span>
          </Link>
        </div>
        <Link
          href="https://api.warpfix.org/auth/github"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[var(--brand)] text-white text-[12px] sm:text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] transition-colors shrink-0 whitespace-nowrap"
        >
          <GitHubIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Try WarpFix Free</span>
          <span className="sm:hidden">Try Free</span>
        </Link>
      </div>
    </header>
  );
}

export function ToolCTA({ feature }: { feature: string }) {
  return (
    <section className="mt-12 bg-[var(--bg-inverse)] rounded-xl p-8 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <Zap className="w-4 h-4 text-[var(--brand)]" />
        <span className="text-[12px] font-medium text-[var(--brand)]">Automate This</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {feature}
      </h3>
      <p className="text-neutral-400 text-[13px] mb-5 max-w-md mx-auto">
        WarpFix monitors your GitHub repos 24/7. When CI fails, it identifies the error,
        generates a fix, validates it in a sandbox, and opens a PR — automatically.
      </p>
      <Link
        href="https://api.warpfix.org/auth/github"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--bg-inverse)] rounded-lg font-medium text-[13px] hover:bg-neutral-100 transition-colors"
      >
        <GitHubIcon className="w-4 h-4" />
        Install WarpFix — Free
      </Link>
    </section>
  );
}

export function ToolFooter() {
  return (
    <footer className="border-t border-[var(--border-default)] py-6 px-6 bg-white mt-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
          <Image src="/icons/icon-192.png" alt="WarpFix" width={16} height={16} />
          <span>&copy; {new Date().getFullYear()} WarpFix. Free tool — no signup required.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[var(--text-tertiary)]">
          <Link href="/tools" className="hover:text-[var(--text-secondary)] transition-colors">All Tools</Link>
          <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
