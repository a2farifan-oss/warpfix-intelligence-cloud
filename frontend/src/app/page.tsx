"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Fingerprint, Radar,
  Terminal, ArrowRight, Check, ChevronDown,
  Cpu, Box, Eye, MessageSquareText,
  BrainCircuit, ShieldAlert, Code2, TestTube2, Scale, SlidersHorizontal,
  Brain, Key, BookOpen, FlaskConical, FileCode, GitPullRequest,
  Dna, Network, Globe,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/utils";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}
import { TerminalDemo } from "@/components/terminal-demo";

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.5, ease: "easeOut" as const },
  }),
};

/* ─── Animated counter hook ─── */
function useCountUp(end: number, duration: number = 1.8) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return { ref, count };
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const offset = inView ? circumference - (value / max) * circumference : circumference;

  return (
    <svg className="progress-ring w-16 h-16 mx-auto mb-2" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(99,91,255,0.08)" strokeWidth="3" />
      <circle
        ref={ref}
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="rgba(99,91,255,0.5)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, count } = useCountUp(value);
  const max = suffix === "%" ? 100 : suffix === "+" ? 20 : suffix === "<" ? 60 : 100;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <ProgressRing value={value} max={max} />
      <div className="text-3xl md:text-4xl font-bold tracking-tight mb-1 stat-number">
        {suffix === "%" ? `${count}%` : suffix === "<" ? `<${count}s` : suffix === "+" ? `${count}+` : `${count}`}
      </div>
      <div className="text-[13px] text-[var(--text-tertiary)]">{label}</div>
    </motion.div>
  );
}

/* ─── Floating Badge ─── */
function FloatingBadge({ label, className, delay = 0 }: { label: string; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      className={`absolute hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/80 backdrop-blur-sm border border-[var(--border-default)] rounded-full text-[10px] font-medium text-[var(--text-secondary)] shadow-sm pointer-events-none select-none z-10 ${className ?? ""}`}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] opacity-60" />
      {label}
    </motion.div>
  );
}

/* ─── Scroll progress hook ─── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <motion.div
      className="fixed top-14 left-0 right-0 h-[2px] bg-[var(--brand)] z-50 origin-left"
      style={{ width, opacity: scrollYProgress }}
    />
  );
}

/* ─── Interactive fingerprint viz ─── */
function FingerprintViz() {
  const [activeField, setActiveField] = useState<string | null>(null);
  const fields = [
    { key: "hash", label: "fingerprint.hash", value: "a3f8c2d1e5b74910", color: "text-[var(--brand)]", detail: "SHA-256 of normalized error pattern" },
    { key: "matched", label: "times_matched", value: "47", color: "text-emerald-400", detail: "Across 12 repositories in your org" },
    { key: "confidence", label: "resolution_confidence", value: "92 / 100", color: "text-amber-400", detail: "Based on 47 successful resolutions" },
    { key: "time", label: "avg_resolution_time", value: "340ms", color: "text-neutral-200", detail: "37% faster than first-time repair" },
  ];

  return (
    <div className="bg-[var(--bg-inverse)] rounded-xl p-6 font-mono text-sm border border-neutral-800 fingerprint-panel">
      {fields.map((f, i) => (
        <motion.div
          key={f.key}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
          className="group cursor-pointer mb-4 last:mb-0"
          onMouseEnter={() => setActiveField(f.key)}
          onMouseLeave={() => setActiveField(null)}
        >
          <div className="text-neutral-500 text-xs mb-0.5 flex items-center gap-2">
            {f.label}
            {activeField === f.key && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-neutral-600 text-[10px]"
              >
                — {f.detail}
              </motion.span>
            )}
          </div>
          <div className={`${f.color} transition-all duration-200 ${activeField === f.key ? "translate-x-1" : ""}`}>
            {f.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: Cpu, title: "Multi-Agent Pipeline", description: "Six specialized agents parse, classify, patch, validate, score, and ship fixes automatically." },
  { icon: Fingerprint, title: "Fingerprint Learning", description: "Error patterns are hashed and cached. Proven fixes are reused instantly on repeat failures." },
  { icon: Box, title: "Sandbox Validation", description: "Every patch is tested in an isolated container before any PR is opened." },
  { icon: Brain, title: "CI Brain", description: "Per-test reliability scores, fingerprint history across repos, owner hotspot mapping — all from logs, no LLM." },
  { icon: GitPullRequest, title: "Always-On PR Reviewer", description: "Every PR gets review comments — even when CI is green. Free tier: summaries. Pro: deep security and perf analysis." },
  { icon: Eye, title: "Simulation Mode", description: "Read-only mode: WarpFix only comments with proposed diffs — no branches created, no code modified." },
  { icon: FlaskConical, title: "Flaky Test Detection", description: "Heuristic analysis of CI history to identify non-deterministic tests. Quarantine and retry strategies." },
  { icon: FileCode, title: "Static Tool Auto-Fixes", description: "Auto-fix ESLint, Prettier, Ruff, and more in sandbox at zero LLM cost. Reserve AI for non-trivial fixes." },
  { icon: MessageSquareText, title: "Chat Agent", description: "Mention @warpfix in any PR comment for instant security analysis, test suggestions, or explanations." },
  { icon: Radar, title: "Dependency Radar", description: "Monitors npm/PyPI for breaking releases, deprecations, and security advisories before they hit CI." },
  { icon: Key, title: "Bring Your Own Key", description: "Plug in your own OpenAI/Anthropic/Google API key for heavy features. WarpFix orchestrates; you pay the LLM bill." },
  { icon: BookOpen, title: "CI Runbook Agent", description: "Composable playbooks triggered by CI events. Define automation recipes in .warpfix.yaml." },
  { icon: BrainCircuit, title: "Predictive CI Failure", description: "Analyzes PR diffs before CI runs to predict failures and warn developers proactively." },
  { icon: ShieldAlert, title: "Security Auto-Patching", description: "Detects CVEs and OWASP vulnerabilities in your code and dependencies, then auto-generates fix PRs." },
  { icon: Code2, title: "Dead Code Detection", description: "Uses codegraph analysis to find unreachable and unused code across your codebase." },
  { icon: TestTube2, title: "Test Coverage Gaps", description: "Identifies untested code paths in PRs and suggests missing test cases automatically." },
  { icon: Dna, title: "CI Failure Genome", description: "Proprietary database of 12,000+ CI failure patterns. Proven fixes reused instantly. Grows smarter with every repo." },
  { icon: Globe, title: "Org CI Memory", description: "WarpFix learns your team's fix preferences from PR feedback. Org-specific rules accumulate automatically over time." },
  { icon: Network, title: "Network Intelligence", description: "Cross-repo predictions: spot failures before CI runs based on patterns from 2,800+ repos in the network." },
  { icon: Scale, title: "Technical Debt Tracker", description: "Scores and tracks tech debt over time with A-F grades, trends, and actionable cleanup plans." },
  { icon: SlidersHorizontal, title: "Quality Gates", description: "Custom pre-merge rules via .warpfix.yaml — block PRs that violate your team's quality standards." },
];

const STEPS = [
  { num: "01", title: "CI fails", desc: "GitHub fires a webhook the moment your workflow fails. WarpFix starts analyzing within seconds.", color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
  { num: "02", title: "Analyze & patch", desc: "Logs are parsed, errors classified, fingerprints checked, and a safe patch is generated via LLM.", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
  { num: "03", title: "Validate & ship", desc: "Patch is tested in a sandbox, scored for confidence, and a PR is opened automatically.", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
];

interface FeatureItem {
  text: string;
  badge?: "Live";
}

const PLANS: { name: string; price: string; period: string; description: string; features: FeatureItem[]; cta: string; highlighted: boolean }[] = [
  { name: "Free", price: "$0", period: "", description: "Get started with basic CI repair", features: [
    { text: "3 repairs / month", badge: "Live" },
    { text: "Error classification", badge: "Live" },
    { text: "Fingerprint matching", badge: "Live" },
    { text: "Unlimited insights", badge: "Live" },
    { text: "Autopsy reports", badge: "Live" },
    { text: "1 repository" },
    { text: "Community support" },
  ], cta: "Start Free", highlighted: false },
  { name: "Pro", price: "$12", period: "/mo", description: "Unlimited repairs for serious developers", features: [
    { text: "Unlimited repairs", badge: "Live" },
    { text: "PR review intelligence", badge: "Live" },
    { text: "Sandbox validation", badge: "Live" },
    { text: "Predictive CI failure", badge: "Live" },
    { text: "Security auto-patching", badge: "Live" },
    { text: "Dead code detection", badge: "Live" },
    { text: "Quality gates", badge: "Live" },
    { text: "Dependency radar", badge: "Live" },
    { text: "Static tool auto-fixes", badge: "Live" },
    { text: "Unlimited repos" },
    { text: "Priority support" },
  ], cta: "Upgrade to Pro", highlighted: true },
  { name: "Team", price: "$36", period: "/mo", description: "Org-level shared repair intelligence", features: [
    { text: "Everything in Pro" },
    { text: "Shared fingerprints", badge: "Live" },
    { text: "Team repair memory", badge: "Live" },
    { text: "Tech debt tracking", badge: "Live" },
    { text: "Test coverage analysis", badge: "Live" },
    { text: "Org stability score", badge: "Live" },
    { text: "Admin dashboard", badge: "Live" },
    { text: "SSO", badge: "Live" },
    { text: "Dedicated support" },
  ], cta: "Contact Sales", highlighted: false },
];

const FAQS = [
  { q: "How does WarpFix detect CI failures?", a: "WarpFix integrates as a GitHub App. When a workflow fails, GitHub sends a webhook and WarpFix starts analyzing the failure logs immediately." },
  { q: "Is my code safe?", a: "WarpFix only reads logs and file contents needed for repair. All patches are validated in isolated sandboxes. The GitHub App uses minimal permissions. You can also run in Simulation Mode (read-only) where WarpFix only comments — no code changes." },
  { q: "What errors can WarpFix fix?", a: "Build errors, test failures, lint issues, type errors, dependency problems, runtime crashes, and configuration bugs. Trivial lint/format fixes use deterministic tools (ESLint, Prettier, Ruff) at zero LLM cost." },
  { q: "How does fingerprint learning work?", a: "Each error is normalized and hashed. When the same pattern recurs, the proven fix is reused instantly with high confidence. The CI Brain tracks fingerprints across all your repos with match history and resolution stats." },
  { q: "What if a patch has low confidence?", a: "Patches below 40 are flagged for review and not opened as PRs. Scores between 40-70 get a 'review suggested' label." },
  { q: "What's free vs paid?", a: "Free: unlimited CI analytics, insights dashboards, flaky test detection, autopsy reports, simulation mode, static tool fixes, 3 repair PRs/month. Pro: unlimited repairs, deep PR review, security analysis, predictive CI, quality gates." },
  { q: "Can I bring my own API key?", a: "Yes. Plug in your own OpenAI, Anthropic, or Google API key for heavy features like multi-file refactors and run-until-green loops. WarpFix orchestrates; you control the LLM bill." },
  { q: "How do I use the WarpFix CLI?", a: "Install with npx warpfix or npm i -g warpfix. Run warpfix login to authenticate, then use warpfix doctor, warpfix fix-ci, warpfix fix-tests from any terminal." },
];

const COMPARISON = [
  { feature: "CI failure auto-repair", wf: true, cr: false, sn: false },
  { feature: "PR review & summaries", wf: true, cr: true, sn: false },
  { feature: "Inline review comments", wf: true, cr: true, sn: false },
  { feature: "Sandbox validation", wf: true, cr: false, sn: false },
  { feature: "Fingerprint fix caching", wf: true, cr: false, sn: false },
  { feature: "CI Brain (test reliability, hotspots)", wf: true, cr: false, sn: false },
  { feature: "Flaky test detection", wf: true, cr: false, sn: false },
  { feature: "Static tool auto-fixes (ESLint/Ruff)", wf: true, cr: false, sn: false },
  { feature: "Simulation / read-only mode", wf: true, cr: false, sn: false },
  { feature: "BYO API key support", wf: true, cr: false, sn: false },
  { feature: "CI runbook / playbook agent", wf: true, cr: false, sn: false },
  { feature: "Predictive CI failure", wf: true, cr: false, sn: false },
  { feature: "Security auto-patching", wf: true, cr: false, sn: "partial" as const },
  { feature: "Dependency vulnerability scan", wf: true, cr: false, sn: true },
  { feature: "Quality gates", wf: true, cr: true, sn: true },
  { feature: "Chat agent in PRs", wf: true, cr: true, sn: false },
  { feature: "Multi-file patch generation", wf: true, cr: true, sn: false },
  { feature: "Unlimited free analytics", wf: true, cr: false, sn: false },
  { feature: "CI Failure Genome (cross-repo data)", wf: true, cr: false, sn: false },
  { feature: "Org CI Memory (learned preferences)", wf: true, cr: false, sn: false },
  { feature: "Cross-repo predictive intelligence", wf: true, cr: false, sn: false },
];

interface AuthUser {
  username: string;
  email: string;
  plan: string;
  avatar_url?: string;
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const checkAuth = useCallback(() => {
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        if (data.user) setAuthUser(data.user);
      })
      .catch(() => setAuthUser(null));
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div id="main-content" className="flex flex-col min-h-screen bg-[#fefeff]">
      {/* ─── Scroll Progress ─── */}
      <ScrollProgress />

      {/* ─── Nav ─── */}
      <nav className="fixed top-0 w-full z-50 border-b border-[var(--border-default)]/60 bg-white/90 backdrop-blur-lg" role="navigation" aria-label="Main navigation">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo-warpfix.png" alt="WarpFix" width={36} height={36} className="transition-transform duration-200 group-hover:scale-105" />
            <span className="font-semibold text-[15px] tracking-tight">WarpFix</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-[var(--text-secondary)]">
            {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="relative hover:text-[var(--text-primary)] transition-colors duration-200 py-1"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {authUser ? (
              <>
                <span className="text-[12px] text-[var(--text-tertiary)] hidden sm:inline">
                  {authUser.plan?.charAt(0).toUpperCase() + authUser.plan?.slice(1)} Plan
                </span>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 bg-[var(--brand)] text-white rounded-lg text-[12px] sm:text-[13px] font-medium hover:bg-[var(--brand-hover)] transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] whitespace-nowrap"
                >
                  {authUser.avatar_url && (
                    <Image src={authUser.avatar_url} alt="" width={18} height={18} className="rounded-full" />
                  )}
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="https://api.warpfix.org/auth/github" className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap leading-none py-1.5">
                  Sign in
                </Link>
                <Link
                  href="https://api.warpfix.org/auth/github"
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 bg-[var(--brand)] text-white rounded-lg text-[12px] sm:text-[13px] font-medium hover:bg-[var(--brand-hover)] transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] whitespace-nowrap"
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-24 pb-12 px-6 hero-bg grain relative overflow-hidden">
        {/* Animated grid background */}
        <div className="hero-grid" />

        {/* Floating decorative elements — larger and more visible */}
        <div className="absolute top-20 left-[8%] w-24 h-24 deco-circle float-slow opacity-60" />
        <div className="absolute top-28 right-[10%] w-16 h-16 deco-square float-medium opacity-50" />
        <div className="absolute bottom-24 left-[15%] w-20 h-20 deco-ring float-reverse opacity-50" />
        <div className="absolute top-24 right-[28%] w-5 h-5 deco-dot float-slow opacity-60" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 right-[8%] w-28 h-28 deco-ring float-medium opacity-35" style={{ animationDelay: "2s" }} />
        <div className="absolute top-36 left-[5%] w-6 h-6 deco-dot float-medium opacity-55" style={{ animationDelay: "3s" }} />
        <div className="absolute bottom-16 left-[35%] w-12 h-12 deco-square float-slow opacity-35" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-20 left-[40%] w-8 h-8 deco-ring float-reverse opacity-45" style={{ animationDelay: "0.5s" }} />
        <div className="absolute top-32 right-[40%] w-4 h-4 deco-dot float-slow opacity-50" style={{ animationDelay: "2.5s" }} />
        <div className="absolute bottom-8 right-[35%] w-10 h-10 deco-circle float-medium opacity-40" style={{ animationDelay: "1s" }} />
        <div className="absolute top-48 left-[25%] w-6 h-6 deco-square float-reverse opacity-45" style={{ animationDelay: "3.5s" }} />
        <div className="absolute bottom-40 left-[45%] w-5 h-5 deco-dot float-slow opacity-50" style={{ animationDelay: "4s" }} />

        {/* Floating badges — closer to center */}
        <FloatingBadge label="SHA-256 fingerprint" className="top-20 right-[25%] float-slow" delay={0.5} />
        <FloatingBadge label="94/100 confidence" className="top-32 left-[18%] float-medium" delay={1} />
        <FloatingBadge label="auto-merge ready" className="bottom-28 right-[22%] float-reverse" delay={1.5} />

        {/* Faded code decoration left side — larger font, more visible */}
        <div className="hidden lg:block absolute top-20 left-10 code-deco select-none" aria-hidden="true">
{`const repair = await warpfix.analyze({
  workflow: "ci.yml",
  branch: "main",
  confidence: 0.92
});

const result = {
  status: "patched",
  pr: "#287"
};`}
        </div>

        {/* Faded code decoration right side — larger font, more visible */}
        <div className="hidden lg:block absolute top-20 right-10 code-deco select-none text-right" aria-hidden="true">
{`fingerprint: "a3f8c2d1"
matched: 47 times
avg_time: "340ms"
confidence: 95

sandbox: "passed"
auto_merge: true
engines: 12`}
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--brand-muted)] text-[var(--brand-text)] rounded-full text-xs font-medium mb-4 border border-[var(--brand-subtle)] hero-badge">
              <Terminal className="w-3 h-3" />
              Terminal-native CI repair agent
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold tracking-[-0.03em] leading-[1.08] mb-5"
          >
            Your CI pipeline<br />
            <span className="gradient-text">fixes itself</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[17px] text-[var(--text-secondary)] max-w-lg mx-auto mb-8 leading-relaxed"
          >
            WarpFix detects failures, generates safe patches, validates them in sandboxes,
            and opens pull requests — automatically.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8"
          >
            <Link
              href={authUser ? "/dashboard" : "https://api.warpfix.org/auth/github"}
              className="group flex items-center gap-2 px-6 py-2.5 bg-[var(--brand)] text-white rounded-lg font-medium hover:bg-[var(--brand-hover)] transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {authUser ? "Go to Dashboard" : "Start fixing for free"}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-2.5 border border-[var(--border-default)] rounded-lg font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] transition-all duration-200"
            >
              See how it works
            </a>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-3xl mx-auto terminal-card"
        >
          <TerminalDemo />
        </motion.div>
      </section>

      {/* ─── Glow divider ─── */}
      <div className="section-glow-border" />

      {/* ─── Interactive Demo ─── */}
      <section className="py-20 px-6 relative overflow-hidden lazy-section" aria-label="Demo">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight mb-3">See it in action</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Watch WarpFix detect a real CI failure, analyze the root cause, generate a fix, and open a PR — all in under 30 seconds.
            </motion.p>
          </motion.div>

          {/* Animated pipeline demo */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-white rounded-2xl border border-[var(--border-default)] shadow-lg overflow-hidden"
          >
            {/* Pipeline header */}
            <div className="border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#f8f8ff] to-white">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">Live Repair Pipeline</span>
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)] font-mono">warpfix/demo-repo • main</span>
            </div>

            {/* Pipeline stages */}
            <div className="p-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { stage: "Detect", time: "0.2s", detail: "workflow_run.failed", color: "bg-red-500", icon: "🔴" },
                  { stage: "Parse", time: "1.1s", detail: "TypeError: Cannot read property 'map' of undefined", color: "bg-orange-500", icon: "📋" },
                  { stage: "Classify", time: "0.3s", detail: "runtime_error → null_reference", color: "bg-amber-500", icon: "🏷" },
                  { stage: "Patch", time: "4.2s", detail: "Added null check + fallback array", color: "bg-blue-500", icon: "🔧" },
                  { stage: "Validate", time: "12.8s", detail: "Sandbox: 47/47 tests passed", color: "bg-indigo-500", icon: "📦" },
                  { stage: "Ship", time: "1.4s", detail: "PR #847 opened, confidence: 94%", color: "bg-green-500", icon: "🚀" },
                ].map((step, i) => (
                  <motion.div
                    key={step.stage}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                    className="relative"
                  >
                    <div className="text-center mb-2">
                      <span className="text-xl">{step.icon}</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${step.color} mb-2`} />
                    <div className="text-[12px] font-semibold text-[var(--text-primary)] text-center">{step.stage}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] text-center font-mono">{step.time}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] text-center mt-1 leading-tight">{step.detail}</div>
                  </motion.div>
                ))}
              </div>

              {/* Result summary */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="mt-8 bg-green-50 border border-green-200 rounded-xl p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-[14px] font-semibold text-green-800 mb-1">Repair Complete — PR #847</div>
                    <div className="text-[12px] text-green-700">fix: add null guard for user.preferences.map() in Dashboard component</div>
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <div className="text-center">
                      <div className="font-bold text-green-800 text-lg">94%</div>
                      <div className="text-green-600">Confidence</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-800 text-lg">20s</div>
                      <div className="text-green-600">Total time</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-800 text-lg">47/47</div>
                      <div className="text-green-600">Tests passed</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Fingerprint info */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.5, duration: 0.4 }}
                className="mt-4 flex items-center justify-center gap-6 text-[11px] text-[var(--text-tertiary)]"
              >
                <span>Fingerprint: <code className="text-[var(--brand)] font-mono">a3f8c2d1</code></span>
                <span>Previously matched: <strong className="text-[var(--text-secondary)]">12 times</strong></span>
                <span>Avg resolution: <strong className="text-[var(--text-secondary)]">340ms</strong> (cached)</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── Stats Bar ─── */}
      <section className="py-16 px-6 stats-bar relative overflow-hidden">
        {/* Floating decorative dots behind stats */}
        <div className="absolute top-4 left-[12%] w-2 h-2 deco-dot float-slow opacity-30" />
        <div className="absolute bottom-4 right-[15%] w-3 h-3 deco-dot float-medium opacity-20" />
        <div className="absolute top-8 right-[30%] w-1.5 h-1.5 deco-dot float-reverse opacity-25" style={{ animationDelay: "1s" }} />

        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          <AnimatedStat value={12} suffix="+" label="Specialized engines" />
          <AnimatedStat value={95} suffix="%" label="Avg confidence score" />
          <AnimatedStat value={30} suffix="<" label="Avg repair time" />
          <AnimatedStat value={37} suffix="%" label="Faster with fingerprints" />
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── Features ─── */}
      <section id="features" className="py-20 px-6 relative section-offwhite overflow-hidden lazy-section" aria-label="Features">
        {/* Background decorations */}
        <div className="absolute top-16 right-[5%] w-20 h-20 deco-ring float-slow opacity-30" />
        <div className="absolute bottom-16 left-[4%] w-12 h-12 deco-circle float-medium opacity-35" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-[3%] w-4 h-4 deco-dot float-reverse opacity-35" />
        <div className="absolute top-24 left-[7%] w-6 h-6 deco-square float-slow opacity-25" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-24 right-[7%] w-8 h-8 deco-ring float-reverse opacity-35" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/3 left-[3%] w-5 h-5 deco-dot float-medium opacity-30" style={{ animationDelay: "2s" }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight mb-4">
              Everything to keep CI green
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
              From failure detection to fix delivery — 21 specialized engines for CI repair, code review, security, observability, intelligence, and quality.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={scaleIn}
                custom={i}
                className="group p-5 rounded-xl feature-card cursor-default"
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-4 transition-all duration-300 ${
                  hoveredFeature === i
                    ? "bg-[var(--brand-muted)] border-[var(--brand-subtle)] scale-110"
                    : "bg-[var(--bg-secondary)] border-[var(--border-default)]"
                }`}>
                  <f.icon className={`w-[18px] h-[18px] transition-colors duration-300 ${
                    hoveredFeature === i ? "text-[var(--brand)]" : "text-[var(--text-secondary)]"
                  }`} />
                </div>
                <h3 className="font-semibold text-[15px] mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Supported Ecosystems ─── */}
      <section className="py-16 px-6 relative overflow-hidden lazy-section" aria-label="Supported Ecosystems">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-2xl font-bold tracking-tight mb-3">
            Works with your stack
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-[var(--text-secondary)] text-sm mb-10">
            WarpFix supports all major languages, frameworks, and CI providers.
          </motion.p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { name: "Node.js", tag: "npm / yarn / pnpm" },
              { name: "Python", tag: "pip / poetry / uv" },
              { name: "Go", tag: "go mod" },
              { name: "Rust", tag: "cargo" },
              { name: "Java", tag: "maven / gradle" },
              { name: "TypeScript", tag: "tsc / esbuild" },
              { name: "Ruby", tag: "bundler / gems" },
              { name: "PHP", tag: "composer" },
              { name: "C#", tag: ".NET / NuGet" },
              { name: "Swift", tag: "SPM / CocoaPods" },
              { name: "Kotlin", tag: "gradle / maven" },
              { name: "Docker", tag: "Dockerfile / Compose" },
            ].map((eco, i) => (
              <motion.div
                key={eco.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="p-3 rounded-xl bg-white border border-[var(--border-default)] hover:border-indigo-200 transition-colors"
              >
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{eco.name}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{eco.tag}</div>
              </motion.div>
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-6 text-[12px] text-[var(--text-tertiary)]">
            CI Providers: GitHub Actions, CircleCI, GitLab CI, Jenkins, Travis CI, Buildkite, Azure Pipelines
          </motion.p>
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 px-6 section-tinted relative overflow-hidden lazy-section" aria-label="How It Works">
        {/* Decorative background elements */}
        <div className="absolute top-12 left-[6%] w-10 h-10 deco-ring float-medium opacity-30" />
        <div className="absolute bottom-20 right-[8%] w-14 h-14 deco-circle float-slow opacity-25" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/3 left-[3%] w-3 h-3 deco-dot float-reverse opacity-35" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight mb-4">How WarpFix works</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[var(--text-secondary)]">From failure to fix in seconds</motion.p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative step-card group"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold mb-4 border ${step.bg} ${step.color} ${step.border}`}>
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block">
                    <div className="connector-line" />
                    <ArrowRight className="absolute top-5 -right-4 w-5 h-5 text-[var(--brand)] opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── Fingerprint Intelligence ─── */}
      <section className="py-24 px-6 section-warm grain relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-[5%] w-12 h-12 deco-ring float-slow opacity-30" />
        <div className="absolute bottom-24 left-[4%] w-8 h-8 deco-square float-medium opacity-25" style={{ animationDelay: "2s" }} />
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--brand-text)] bg-[var(--brand-muted)] rounded-full mb-4 border border-[var(--brand-subtle)]">
                <Fingerprint className="w-3 h-3" />
                Unique to WarpFix
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Repair fingerprint intelligence</h2>
              <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                Every error is hashed into a unique fingerprint. When the same pattern
                appears again, WarpFix reuses the proven fix — turning minutes into milliseconds.
              </p>
              <ul className="space-y-3">
                {[
                  "Error patterns normalized and hashed",
                  "Fixes stored with confidence scores",
                  "Org-wide shared repair memory",
                  "Accuracy improves over time",
                ].map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                    className="flex items-start gap-2.5 text-[13px]"
                  >
                    <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <FingerprintViz />
            </motion.div>
          </div>
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── Comparison ─── */}
      <section className="py-20 px-6 section-tinted relative overflow-hidden">
        <div className="absolute top-10 left-[5%] w-10 h-10 deco-circle float-slow opacity-30" />
        <div className="absolute bottom-12 right-[6%] w-6 h-6 deco-ring float-medium opacity-30" style={{ animationDelay: "1s" }} />
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight mb-4">How we compare</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[var(--text-secondary)]">WarpFix is the only platform that repairs, reviews, and secures — all in one.</motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-white"
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <th className="text-left py-3 px-5 font-medium text-[var(--text-secondary)]">Feature</th>
                  <th className="text-center py-3 px-5 font-semibold text-[var(--brand)]">WarpFix</th>
                  <th className="text-center py-3 px-5 font-medium text-[var(--text-secondary)]">CodeRabbit</th>
                  <th className="text-center py-3 px-5 font-medium text-[var(--text-secondary)]">Snyk</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-[var(--border-default)] last:border-0 transition-colors duration-150 hover:bg-[var(--brand-muted)]/30 ${i % 2 === 1 ? "bg-[var(--bg-secondary)]/50" : ""}`}
                  >
                    <td className="py-3 px-5">{row.feature}</td>
                    <td className="py-3 px-5 text-center">
                      {row.wf ? <Check className="w-4 h-4 text-[var(--brand)] mx-auto" /> : <span className="text-[var(--text-tertiary)]">—</span>}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {row.cr ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-[var(--text-tertiary)]">—</span>}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {row.sn === "partial" ? (
                        <span className="text-[11px] font-medium text-amber-600">Partial</span>
                      ) : row.sn ? (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 px-6 section-offwhite relative overflow-hidden lazy-section" aria-label="Pricing">
        <div className="absolute top-14 right-[4%] w-16 h-16 deco-ring float-reverse opacity-30" />
        <div className="absolute bottom-20 left-[6%] w-5 h-5 deco-dot float-slow opacity-35" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-[3%] w-12 h-12 deco-circle float-medium opacity-20" />
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight mb-4">Simple pricing</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[var(--text-secondary)]">Start free. Scale as you grow.</motion.p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`p-6 rounded-xl bg-white transition-all duration-300 ${
                  plan.highlighted
                    ? "pricing-ring hover:shadow-xl"
                    : "border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:shadow-md"
                } hover:-translate-y-1`}
              >
                {authUser && authUser.plan?.toLowerCase() === plan.name.toLowerCase() && (
                  <div className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 inline-block mb-3">Current Plan</div>
                )}
                {plan.highlighted && !(authUser && authUser.plan?.toLowerCase() === plan.name.toLowerCase()) && (
                  <div className="text-[11px] font-semibold text-[var(--brand)] uppercase tracking-wider mb-3">Most Popular</div>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && <span className="text-[var(--text-tertiary)] text-sm">{plan.period}</span>}
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] mb-5">{plan.description}</p>
                <Link
                  href={authUser ? "/dashboard/billing" : "https://api.warpfix.org/auth/github"}
                  className={`block text-center py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.98] ${
                    authUser && authUser.plan?.toLowerCase() === plan.name.toLowerCase()
                      ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                      : plan.highlighted
                        ? "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] shadow-sm hover:shadow-md"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-default)]"
                  }`}
                >
                  {authUser && authUser.plan?.toLowerCase() === plan.name.toLowerCase()
                    ? "Active"
                    : authUser
                      ? (() => {
                          const TIER_ORDER: Record<string, number> = { free: 0, pro: 1, team: 2 };
                          const currentTier = TIER_ORDER[authUser.plan?.toLowerCase() || "free"] ?? 0;
                          const planTier = TIER_ORDER[plan.name.toLowerCase()] ?? 0;
                          return planTier < currentTier ? "Downgrade" : "Upgrade";
                        })()
                      : plan.cta}
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2 text-[13px]">
                      <Check className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                      <span className="flex-1">{feature.text}</span>
                      {feature.badge && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          {feature.badge}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust Signals ─── */}
      <section className="py-16 px-6 relative overflow-hidden lazy-section" aria-label="Trust Signals">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold tracking-tight mb-3">Trusted by developers</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[var(--text-secondary)] text-sm">What engineering teams say about WarpFix</motion.p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { quote: "WarpFix caught a transient dependency issue that cost us 3 hours every sprint. Now it fixes itself before we even notice.", author: "Alex K.", role: "Staff Engineer", company: "Series B Startup" },
              { quote: "The fingerprint system is brilliant — once it learns a fix pattern, every similar failure across our 40 repos gets resolved instantly.", author: "Sarah L.", role: "Platform Lead", company: "Enterprise SaaS" },
              { quote: "We went from 15 broken CI runs per week to essentially zero. The sandbox validation gives us confidence every patch is safe.", author: "Marcus T.", role: "Engineering Manager", company: "FinTech Company" },
            ].map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-xl border border-[var(--border-default)] p-6"
              >
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">{t.author}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">{t.role}, {t.company}</div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-[var(--text-tertiary)]">
            {[
              { label: "SOC 2 in progress", icon: "🛡" },
              { label: "GDPR compliant", icon: "🇪🇺" },
              { label: "TLS 1.3 encrypted", icon: "🔒" },
              { label: "Zero data retention", icon: "🗑" },
              { label: "Sandbox validated", icon: "📦" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5 text-[12px]">
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 px-6 section-tinted relative overflow-hidden lazy-section" aria-label="Frequently Asked Questions" itemScope itemType="https://schema.org/FAQPage">
        <div className="absolute top-16 right-[7%] w-8 h-8 deco-square float-slow opacity-30" />
        <div className="absolute bottom-16 left-[5%] w-6 h-6 deco-ring float-medium opacity-30" style={{ animationDelay: "1s" }} />
        <div className="max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-center mb-12"
          >
            Frequently asked questions
          </motion.h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="border border-[var(--border-default)] rounded-lg overflow-hidden bg-white faq-item"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                >
                  <span className="font-medium text-[14px]">{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-[13px] text-[var(--text-secondary)] leading-relaxed">{faq.a}</div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-glow-border" />

      {/* ─── CTA ─── */}
      <section className="py-24 px-6 cta-section text-white relative overflow-hidden">
        {/* Floating decorative elements in CTA */}
        <div className="absolute top-10 left-[10%] w-12 h-12 rounded-full border border-white/10 float-slow" />
        <div className="absolute bottom-14 right-[12%] w-8 h-8 rounded-full border border-white/8 float-medium" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-[5%] w-3 h-3 rounded-full bg-white/10 float-reverse" />
        <div className="absolute top-16 right-[20%] w-5 h-5 rounded-lg border border-white/8 float-slow" style={{ animationDelay: "2s", transform: "rotate(15deg)" }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight mb-4"
          >
            Ready to stop babysitting CI?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-neutral-400 mb-8 max-w-lg mx-auto leading-relaxed"
          >
            Install WarpFix in under a minute. Your next CI failure fixes itself.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="https://api.warpfix.org/auth/github"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--bg-inverse)] rounded-lg font-medium hover:bg-neutral-100 transition-all duration-200 active:scale-[0.98]"
            >
              <GitHubIcon className="w-4 h-4" />
              Install WarpFix
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-6 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo-warpfix.png" alt="WarpFix" width={24} height={24} />
                <span className="font-semibold text-[14px] text-[var(--text-primary)]">WarpFix</span>
              </div>
              <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed">
                Autonomous CI repair agent that fixes pipeline failures in seconds.
              </p>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-[13px] text-[var(--text-tertiary)]">
                <li><a href="#features" className="hover:text-[var(--text-secondary)] transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-[var(--text-secondary)] transition-colors">Pricing</a></li>
                <li><Link href="/docs" className="hover:text-[var(--text-secondary)] transition-colors">Documentation</Link></li>
                <li><Link href="/blog" className="hover:text-[var(--text-secondary)] transition-colors">Blog</Link></li>
                <li><Link href="/changelog" className="hover:text-[var(--text-secondary)] transition-colors">Changelog</Link></li>
                <li><Link href="/roadmap" className="hover:text-[var(--text-secondary)] transition-colors">Roadmap</Link></li>
                <li><Link href="/tools" className="hover:text-[var(--text-secondary)] transition-colors">Free Tools</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider">Trust & Security</h4>
              <ul className="space-y-2 text-[13px] text-[var(--text-tertiary)]">
                <li><Link href="/security" className="hover:text-[var(--text-secondary)] transition-colors">Security & Data</Link></li>
                <li><Link href="/permissions" className="hover:text-[var(--text-secondary)] transition-colors">Permissions</Link></li>
                <li><Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-[var(--text-secondary)] transition-colors">Cookie Policy</Link></li>
                <li><Link href="/refund" className="hover:text-[var(--text-secondary)] transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2 text-[13px] text-[var(--text-tertiary)]">
                <li><a href="mailto:support@warpfix.org" className="hover:text-[var(--text-secondary)] transition-colors">support@warpfix.org</a></li>
                <li><a href="https://github.com/bytepassperks/warpfix-intelligence-cloud" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-secondary)] transition-colors">GitHub</a></li>
                <li><Link href="/acceptable-use" className="hover:text-[var(--text-secondary)] transition-colors">Acceptable Use</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[var(--text-tertiary)]">
            <span>&copy; {new Date().getFullYear()} WarpFix. All rights reserved.</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Terms</Link>
              <Link href="/cookies" className="hover:text-[var(--text-secondary)] transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
