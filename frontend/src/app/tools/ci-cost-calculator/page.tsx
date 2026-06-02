"use client";

import { useState } from "react";
import { Calculator, DollarSign, Clock, Zap } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const PROVIDERS = [
  { id: "github", name: "GitHub Actions", rates: { linux: 0.008, windows: 0.016, macos: 0.08 }, freeMinutes: 2000 },
  { id: "gitlab", name: "GitLab CI", rates: { linux: 0.008, windows: 0.016, macos: 0.08 }, freeMinutes: 400 },
  { id: "circleci", name: "CircleCI", rates: { linux: 0.006, windows: 0.012, macos: 0.06 }, freeMinutes: 6000 },
  { id: "bitbucket", name: "Bitbucket Pipelines", rates: { linux: 0.008, windows: 0.016, macos: 0 }, freeMinutes: 50 },
];

export default function CICostCalculator() {
  const [buildMinutes, setBuildMinutes] = useState(8);
  const [buildsPerDay, setBuildsPerDay] = useState(20);
  const [os, setOs] = useState<"linux" | "windows" | "macos">("linux");
  const [repos, setRepos] = useState(3);
  const [failureRate, setFailureRate] = useState(15);
  const [provider, setProvider] = useState(PROVIDERS[0]);

  const monthlyBuilds = buildsPerDay * repos * 22;
  const totalMinutes = monthlyBuilds * buildMinutes;
  const failedMinutes = totalMinutes * (failureRate / 100);
  const billableMinutes = Math.max(0, totalMinutes - provider.freeMinutes);
  const rate = provider.rates[os];
  const monthlyCost = billableMinutes * rate;
  const wastedCost = failedMinutes * rate;
  const withWarpFix = monthlyCost - (wastedCost * 0.7);
  const savings = monthlyCost - withWarpFix;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CI/CD Cost Calculator</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Estimate your monthly CI bill and see how much failures cost you</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            {/* Provider */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">CI Provider</h3>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <button key={p.id} onClick={() => setProvider(p)}
                    className={`px-3 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                      provider.id === p.id ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 space-y-4">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-1">Configuration</h3>

              <div>
                <label className="flex items-center justify-between text-[12px] text-[var(--text-tertiary)] mb-1">
                  <span>Runner OS</span>
                </label>
                <div className="flex gap-2">
                  {(["linux", "windows", "macos"] as const).map((o) => (
                    <button key={o} onClick={() => setOs(o)}
                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                        os === o ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {o === "linux" ? "🐧 Linux" : o === "windows" ? "🪟 Windows" : "🍎 macOS"}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { label: "Avg build duration (min)", value: buildMinutes, set: setBuildMinutes, min: 1, max: 60 },
                { label: "Builds per day (per repo)", value: buildsPerDay, set: setBuildsPerDay, min: 1, max: 200 },
                { label: "Number of repos", value: repos, set: setRepos, min: 1, max: 100 },
                { label: "Failure rate (%)", value: failureRate, set: setFailureRate, min: 0, max: 100 },
              ].map((field) => (
                <div key={field.label}>
                  <label className="flex items-center justify-between text-[12px] text-[var(--text-tertiary)] mb-1">
                    <span>{field.label}</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{field.value}</span>
                  </label>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    value={field.value}
                    onChange={(e) => field.set(Number(e.target.value))}
                    className="w-full accent-[var(--brand)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-4">Monthly Cost Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Total builds/month", value: monthlyBuilds.toLocaleString(), icon: Zap },
                  { label: "Total CI minutes", value: totalMinutes.toLocaleString(), icon: Clock },
                  { label: "Billable minutes", value: billableMinutes.toLocaleString(), sub: `(after ${provider.freeMinutes} free)`, icon: Clock },
                  { label: `Rate (${os})`, value: `$${rate}/min`, icon: DollarSign },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-[var(--border-default)] last:border-0">
                    <div className="flex items-center gap-2">
                      <row.icon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      <span className="text-[13px]">{row.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[13px] font-medium">{row.value}</span>
                      {"sub" in row && row.sub && <div className="text-[10px] text-[var(--text-tertiary)]">{row.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[var(--border-default)] rounded-xl p-4 text-center">
                <div className="text-[11px] text-[var(--text-tertiary)] mb-1">Monthly CI Cost</div>
                <div className="text-2xl font-bold">${monthlyCost.toFixed(0)}</div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                <div className="text-[11px] text-red-600 mb-1">Wasted on Failures</div>
                <div className="text-2xl font-bold text-red-700">${wastedCost.toFixed(0)}</div>
                <div className="text-[10px] text-red-500">{failureRate}% failure rate</div>
              </div>
            </div>

            {/* WarpFix Savings */}
            <div className="bg-[var(--brand-muted)] border border-[var(--brand-subtle)] rounded-xl p-5">
              <div className="text-[12px] font-medium text-[var(--brand)] mb-2 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> With WarpFix (70% fewer failures)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">Estimated cost</div>
                  <div className="text-xl font-bold text-[var(--brand)]">${Math.max(0, withWarpFix).toFixed(0)}/mo</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">You save</div>
                  <div className="text-xl font-bold text-[var(--success)]">${savings.toFixed(0)}/mo</div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
                WarpFix Pro costs $12/mo — {savings > 12 ? `saves you $${(savings - 12).toFixed(0)} net` : "pays for itself as your team scales"}.
              </p>
            </div>
          </div>
        </div>

        <ToolCTA feature="Stop wasting money on failed CI runs. WarpFix auto-fixes failures before they burn through your build minutes." />
      </main>
      <ToolFooter />
    </div>
  );
}
