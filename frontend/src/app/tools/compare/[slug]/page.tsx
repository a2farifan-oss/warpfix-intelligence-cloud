"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Minus, BarChart3 } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

type Val = "yes" | "no" | "partial" | string;
interface ComparisonData {
  a: { name: string; tagline: string };
  b: { name: string; tagline: string };
  verdict: string;
  features: { feature: string; a: Val; b: Val }[];
  pricing: { tier: string; a: string; b: string }[];
  prosA: string[];
  prosB: string[];
}

function Cell({ val }: { val: Val }) {
  if (val === "yes") return <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />;
  if (val === "no") return <XCircle className="w-4 h-4 text-red-400 mx-auto" />;
  if (val === "partial") return <Minus className="w-4 h-4 text-amber-500 mx-auto" />;
  return <span className="text-[12px] text-[var(--text-secondary)]">{val}</span>;
}

const COMPARISONS: Record<string, ComparisonData> = {
  "github-actions-vs-circleci": {
    a: { name: "GitHub Actions", tagline: "Built into GitHub, YAML-based CI/CD" },
    b: { name: "CircleCI", tagline: "Dedicated CI/CD platform with Docker-first approach" },
    verdict: "GitHub Actions wins for GitHub-native repos. CircleCI wins for advanced caching and Docker-heavy pipelines.",
    features: [
      { feature: "Free tier minutes", a: "2,000/mo (Linux)", b: "6,000/mo" },
      { feature: "Built-in marketplace", a: "yes", b: "Orbs" },
      { feature: "Self-hosted runners", a: "yes", b: "yes" },
      { feature: "Docker layer caching", a: "partial", b: "yes" },
      { feature: "macOS runners", a: "yes", b: "yes" },
      { feature: "ARM runners", a: "yes", b: "yes" },
      { feature: "Config-as-code", a: "YAML", b: "YAML" },
      { feature: "Secrets management", a: "yes", b: "yes" },
      { feature: "Matrix builds", a: "yes", b: "yes" },
      { feature: "Manual approvals", a: "yes", b: "yes" },
      { feature: "GitHub integration", a: "Native", b: "OAuth" },
      { feature: "Test splitting", a: "partial", b: "yes" },
    ],
    pricing: [
      { tier: "Free", a: "2,000 min/mo", b: "6,000 min/mo" },
      { tier: "Paid (Linux)", a: "$0.008/min", b: "$0.006/min" },
      { tier: "Paid (macOS)", a: "$0.08/min", b: "$0.08/min" },
      { tier: "Self-hosted", a: "Free", b: "Free (scale plan)" },
    ],
    prosA: [
      "Zero setup for GitHub repos — already integrated",
      "Massive marketplace with 20K+ community actions",
      "Generous free tier for public repos (unlimited)",
      "Matrix strategy for easy multi-version testing",
      "Reusable workflows for DRY configs across repos",
    ],
    prosB: [
      "Better Docker layer caching (faster Docker builds)",
      "Built-in test splitting for parallel test execution",
      "Insights dashboard with test analytics",
      "SSH into failed builds for debugging",
      "Config file is simpler for complex pipelines",
    ],
  },
  "github-actions-vs-jenkins": {
    a: { name: "GitHub Actions", tagline: "Managed CI/CD, built into GitHub" },
    b: { name: "Jenkins", tagline: "Open-source, self-managed CI/CD server" },
    verdict: "GitHub Actions for teams wanting managed CI. Jenkins for full control and existing infrastructure.",
    features: [
      { feature: "Hosting", a: "Managed (cloud)", b: "Self-hosted" },
      { feature: "Setup time", a: "Minutes", b: "Hours/Days" },
      { feature: "Maintenance", a: "Zero", b: "You manage" },
      { feature: "Plugin ecosystem", a: "20K+ actions", b: "1,800+ plugins" },
      { feature: "Config format", a: "YAML", b: "Groovy/Declarative" },
      { feature: "Cost at scale", a: "Per-minute", b: "Server cost only" },
      { feature: "GitHub integration", a: "Native", b: "Plugin" },
      { feature: "Parallel builds", a: "yes", b: "yes" },
      { feature: "Pipeline as code", a: "yes", b: "Jenkinsfile" },
      { feature: "Custom runners", a: "yes", b: "yes" },
      { feature: "Web UI for config", a: "no", b: "yes" },
      { feature: "Community support", a: "Large", b: "Massive" },
    ],
    pricing: [
      { tier: "Free", a: "2,000 min/mo", b: "Free (self-host)" },
      { tier: "Annual cost (small team)", a: "~$500/yr", b: "~$1,200/yr (server)" },
      { tier: "Annual cost (large team)", a: "~$5,000/yr", b: "~$3,000/yr (servers)" },
    ],
    prosA: [
      "Zero infrastructure to manage",
      "Instant setup — YAML file and done",
      "Native GitHub integration (statuses, checks, PR comments)",
      "Community-maintained actions for almost anything",
      "Free for public repositories",
    ],
    prosB: [
      "Complete control over infrastructure and security",
      "No per-minute billing — fixed server costs",
      "Massive plugin ecosystem (20+ years)",
      "Can run anywhere (on-prem, air-gapped, custom hardware)",
      "Blue Ocean UI for pipeline visualization",
    ],
  },
};

export default function ComparisonPage() {
  const params = useParams();
  const slug = params.slug as string;
  const data = COMPARISONS[slug];

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <ToolHeader />
        <main className="max-w-4xl mx-auto px-6 py-20 text-center">
          <BarChart3 className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Comparison Coming Soon</h1>
          <p className="text-[var(--text-secondary)] text-[14px] mb-6">This comparison is being researched. Check back soon!</p>
          <Link href="/tools/compare" className="px-4 py-2 text-[13px] border border-[var(--border-default)] rounded-lg hover:bg-white transition-colors">All Comparisons</Link>
        </main>
        <ToolFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/tools/compare" className="inline-flex items-center gap-1 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--brand)] mb-4 transition-colors">
          <ArrowLeft className="w-3 h-3" /> All Comparisons
        </Link>

        {/* Hero */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div><h2 className="text-xl font-bold">{data.a.name}</h2><p className="text-[11px] text-[var(--text-tertiary)]">{data.a.tagline}</p></div>
            <span className="text-[14px] font-medium text-[var(--text-tertiary)] px-3 py-1 bg-[var(--bg-secondary)] rounded-full">vs</span>
            <div><h2 className="text-xl font-bold">{data.b.name}</h2><p className="text-[11px] text-[var(--text-tertiary)]">{data.b.tagline}</p></div>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] max-w-lg mx-auto">{data.verdict}</p>
        </div>

        {/* Feature Comparison */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl overflow-hidden mb-4">
          <div className="grid grid-cols-3 bg-[var(--bg-secondary)] px-5 py-3 border-b border-[var(--border-default)]">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Feature</span>
            <span className="text-[12px] font-medium text-[var(--text-secondary)] text-center">{data.a.name}</span>
            <span className="text-[12px] font-medium text-[var(--text-secondary)] text-center">{data.b.name}</span>
          </div>
          {data.features.map((f, i) => (
            <div key={f.feature} className={`grid grid-cols-3 px-5 py-3 text-[13px] ${i < data.features.length - 1 ? "border-b border-[var(--border-default)]" : ""}`}>
              <span className="text-[var(--text-secondary)]">{f.feature}</span>
              <div className="text-center"><Cell val={f.a} /></div>
              <div className="text-center"><Cell val={f.b} /></div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Pricing</span>
          </div>
          {data.pricing.map((p, i) => (
            <div key={p.tier} className={`grid grid-cols-3 px-5 py-3 text-[12px] ${i < data.pricing.length - 1 ? "border-b border-[var(--border-default)]" : ""}`}>
              <span className="font-medium text-[var(--text-secondary)]">{p.tier}</span>
              <span className="text-center text-[var(--text-secondary)]">{p.a}</span>
              <span className="text-center text-[var(--text-secondary)]">{p.b}</span>
            </div>
          ))}
        </div>

        {/* Pros */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-5">
            <h3 className="text-[13px] font-medium text-green-800 mb-2">{data.a.name} Advantages</h3>
            <ul className="space-y-1.5">{data.prosA.map((p, i) => <li key={i} className="text-[12px] text-green-700 flex items-start gap-1.5"><span className="shrink-0 mt-1">•</span>{p}</li>)}</ul>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="text-[13px] font-medium text-blue-800 mb-2">{data.b.name} Advantages</h3>
            <ul className="space-y-1.5">{data.prosB.map((p, i) => <li key={i} className="text-[12px] text-blue-700 flex items-start gap-1.5"><span className="shrink-0 mt-1">•</span>{p}</li>)}</ul>
          </div>
        </div>

        <ToolCTA feature={`Whichever you choose — ${data.a.name} or ${data.b.name} — WarpFix monitors your pipelines and auto-fixes failures.`} />
      </main>
      <ToolFooter />
    </div>
  );
}
