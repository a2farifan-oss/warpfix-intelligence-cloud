"use client";

import { useState } from "react";
import { Timer, Zap, Clock, TrendingDown } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const STACKS = [
  { id: "nodejs", label: "Node.js", icon: "🟢", baseInstall: 30, baseBuild: 45, baseTest: 60 },
  { id: "nextjs", label: "Next.js", icon: "▲", baseInstall: 35, baseBuild: 90, baseTest: 45 },
  { id: "python", label: "Python", icon: "🐍", baseInstall: 25, baseBuild: 10, baseTest: 50 },
  { id: "go", label: "Go", icon: "🔵", baseInstall: 15, baseBuild: 30, baseTest: 40 },
  { id: "rust", label: "Rust", icon: "🦀", baseInstall: 10, baseBuild: 180, baseTest: 60 },
  { id: "java", label: "Java (Maven)", icon: "☕", baseInstall: 40, baseBuild: 60, baseTest: 50 },
  { id: "ruby", label: "Ruby", icon: "💎", baseInstall: 45, baseBuild: 20, baseTest: 55 },
  { id: "docker", label: "Docker Build", icon: "🐳", baseInstall: 0, baseBuild: 120, baseTest: 0 },
];

export default function BuildTimeEstimator() {
  const [stack, setStack] = useState(STACKS[0]);
  const [deps, setDeps] = useState(100);
  const [testCount, setTestCount] = useState(50);
  const [hasCache, setHasCache] = useState(false);
  const [hasLint, setHasLint] = useState(true);
  const [parallelJobs, setParallelJobs] = useState(1);

  const depsFactor = Math.log10(Math.max(deps, 1)) / Math.log10(100);
  const testFactor = Math.log10(Math.max(testCount, 1)) / Math.log10(50);
  const cacheSaving = hasCache ? 0.6 : 1;

  const checkout = 5;
  const install = Math.round(stack.baseInstall * depsFactor * cacheSaving);
  const lint = hasLint ? 15 : 0;
  const build = Math.round(stack.baseBuild * cacheSaving);
  const test = Math.round(stack.baseTest * testFactor / Math.max(parallelJobs, 1));
  const total = checkout + install + lint + build + test;

  const withWarpFix = Math.round(total * 0.85);
  const savings = total - withWarpFix;

  const formatTime = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

  const steps = [
    { label: "Checkout", seconds: checkout, color: "bg-neutral-300" },
    { label: "Install deps", seconds: install, color: "bg-blue-400" },
    ...(hasLint ? [{ label: "Lint", seconds: lint, color: "bg-amber-400" }] : []),
    ...(stack.baseBuild > 0 ? [{ label: "Build", seconds: build, color: "bg-purple-400" }] : []),
    ...(stack.baseTest > 0 ? [{ label: "Test", seconds: test, color: "bg-green-400" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Timer className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Build Time Estimator</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Estimate CI build time for your stack with caching and parallelism</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Config */}
          <div className="space-y-4">
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Stack</h3>
              <div className="grid grid-cols-2 gap-2">
                {STACKS.map((s) => (
                  <button key={s.id} onClick={() => setStack(s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                      stack.id === s.id ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 space-y-4">
              {[
                { label: "Dependencies", value: deps, set: setDeps, min: 10, max: 2000, unit: "packages" },
                { label: "Test files", value: testCount, set: setTestCount, min: 0, max: 500, unit: "files" },
                { label: "Parallel test jobs", value: parallelJobs, set: setParallelJobs, min: 1, max: 8, unit: "runners" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="flex items-center justify-between text-[12px] text-[var(--text-tertiary)] mb-1">
                    <span>{f.label}</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{f.value} {f.unit}</span>
                  </label>
                  <input type="range" min={f.min} max={f.max} value={f.value} onChange={(e) => f.set(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
                </div>
              ))}
              <div className="space-y-2">
                {[
                  { label: "Dependency caching", state: hasCache, set: setHasCache },
                  { label: "Lint step", state: hasLint, set: setHasLint },
                ].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={opt.state} onChange={() => opt.set(!opt.state)} className="rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-[var(--brand)]" />
                    <span className="text-[13px]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Total */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-[var(--brand)] mx-auto mb-2" />
              <div className="text-3xl font-bold mb-1">{formatTime(total)}</div>
              <div className="text-[12px] text-[var(--text-tertiary)]">Estimated total build time</div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Pipeline Timeline</h3>
              <div className="flex rounded-full overflow-hidden h-6 mb-3">
                {steps.map((s) => (
                  <div key={s.label} className={`${s.color} relative group`} style={{ width: `${Math.max((s.seconds / total) * 100, 3)}%` }} title={`${s.label}: ${formatTime(s.seconds)}`}>
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {steps.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                      <span className="text-[var(--text-secondary)]">{s.label}</span>
                    </div>
                    <span className="font-mono text-[var(--text-primary)]">{formatTime(s.seconds)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-[var(--brand-muted)] border border-[var(--brand-subtle)] rounded-xl p-5">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--brand)] mb-2">
                <TrendingDown className="w-3.5 h-3.5" /> Optimization Tips
              </div>
              <ul className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                {!hasCache && <li>• Enable dependency caching to save ~{Math.round(stack.baseInstall * 0.4)}s on install</li>}
                {parallelJobs === 1 && testCount > 20 && <li>• Use {Math.min(4, Math.ceil(testCount / 25))} parallel test runners to cut test time by {Math.round((1 - 1/Math.min(4, Math.ceil(testCount / 25))) * 100)}%</li>}
                {stack.id === "rust" && <li>• Use sccache for Rust builds to dramatically reduce compile times</li>}
                {stack.id === "docker" && <li>• Use Docker layer caching (docker/build-push-action) to skip unchanged layers</li>}
                <li>• WarpFix reduces failed build reruns by 70% — saving ~{formatTime(Math.round(total * 0.15))} per failure</li>
              </ul>
            </div>
          </div>
        </div>

        <ToolCTA feature="WarpFix's CI Brain tracks your actual build times and predicts failures before they happen — saving wasted CI minutes." />
      </main>
      <ToolFooter />
    </div>
  );
}
