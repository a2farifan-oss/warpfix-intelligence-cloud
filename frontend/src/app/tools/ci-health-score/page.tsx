"use client";

import { useState } from "react";
import { Heart, TrendingUp, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

function getGrade(score: number): { letter: string; color: string; bg: string; label: string } {
  if (score >= 90) return { letter: "A+", color: "text-green-700", bg: "bg-green-50 border-green-200", label: "Excellent" };
  if (score >= 80) return { letter: "A", color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Great" };
  if (score >= 70) return { letter: "B", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Good" };
  if (score >= 60) return { letter: "C", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Needs Work" };
  if (score >= 40) return { letter: "D", color: "text-orange-600", bg: "bg-orange-50 border-orange-200", label: "Poor" };
  return { letter: "F", color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Critical" };
}

export default function CIHealthScore() {
  const [passRate, setPassRate] = useState(85);
  const [avgBuildTime, setAvgBuildTime] = useState(8);
  const [flakyTests, setFlakyTests] = useState(3);
  const [deployFreq, setDeployFreq] = useState(5);
  const [mttr, setMttr] = useState(30);

  // Score calculation
  const passScore = Math.min(passRate, 100) * 0.35;
  const buildScore = Math.max(0, 35 - (avgBuildTime / 60) * 35) * (35 / 35);
  const flakyScore = Math.max(0, 15 - flakyTests * 1.5);
  const deployScore = Math.min(deployFreq, 10) * 0.5;
  const mttrScore = Math.max(0, 10 - (mttr / 60) * 10);

  const totalScore = Math.round(passScore + buildScore + flakyScore + deployScore + mttrScore);
  const grade = getGrade(totalScore);

  const factors = [
    { label: "Pass Rate", score: Math.round(passScore), max: 35, tip: passRate < 80 ? "Aim for 95%+ pass rate" : "Great pass rate!", color: passRate >= 90 ? "bg-green-400" : passRate >= 70 ? "bg-amber-400" : "bg-red-400" },
    { label: "Build Speed", score: Math.round(buildScore), max: 35, tip: avgBuildTime > 15 ? "Enable caching and parallel jobs" : "Good build speed", color: avgBuildTime <= 10 ? "bg-green-400" : avgBuildTime <= 20 ? "bg-amber-400" : "bg-red-400" },
    { label: "Test Stability", score: Math.round(flakyScore), max: 15, tip: flakyTests > 5 ? "Quarantine flaky tests ASAP" : "Low flakiness, nice!", color: flakyTests <= 2 ? "bg-green-400" : flakyTests <= 5 ? "bg-amber-400" : "bg-red-400" },
    { label: "Deploy Frequency", score: Math.round(deployScore), max: 5, tip: deployFreq < 3 ? "Ship smaller, more frequent deployments" : "Good deployment cadence", color: deployFreq >= 5 ? "bg-green-400" : "bg-amber-400" },
    { label: "Mean Time to Recovery", score: Math.round(mttrScore), max: 10, tip: mttr > 30 ? "Automate recovery with WarpFix" : "Fast recovery time!", color: mttr <= 15 ? "bg-green-400" : mttr <= 30 ? "bg-amber-400" : "bg-red-400" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CI Health Score Calculator</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Rate your CI/CD pipeline health and get improvement recommendations</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 space-y-5">
            <h3 className="text-[13px] font-medium text-[var(--text-secondary)]">Your Pipeline Metrics</h3>
            {[
              { label: "CI Pass Rate (%)", value: passRate, set: setPassRate, min: 0, max: 100, unit: "%" },
              { label: "Avg Build Time", value: avgBuildTime, set: setAvgBuildTime, min: 1, max: 60, unit: "min" },
              { label: "Flaky Tests", value: flakyTests, set: setFlakyTests, min: 0, max: 30, unit: "tests" },
              { label: "Deploys Per Week", value: deployFreq, set: setDeployFreq, min: 0, max: 30, unit: "/week" },
              { label: "Mean Time to Recovery", value: mttr, set: setMttr, min: 1, max: 120, unit: "min" },
            ].map((f) => (
              <div key={f.label}>
                <label className="flex items-center justify-between text-[12px] text-[var(--text-tertiary)] mb-1">
                  <span>{f.label}</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">{f.value}{f.unit}</span>
                </label>
                <input type="range" min={f.min} max={f.max} value={f.value} onChange={(e) => f.set(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Score Card */}
            <div className={`border rounded-xl p-8 text-center ${grade.bg}`}>
              <div className={`text-6xl font-bold ${grade.color} mb-1`}>{grade.letter}</div>
              <div className="text-3xl font-bold mb-1">{totalScore}/100</div>
              <div className={`text-[14px] font-medium ${grade.color}`}>{grade.label}</div>
            </div>

            {/* Factor Breakdown */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Score Breakdown</h3>
              <div className="space-y-3">
                {factors.map((f) => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-[var(--text-secondary)]">{f.label}</span>
                      <span className="font-mono font-medium">{f.score}/{f.max}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${f.color}`} style={{ width: `${(f.score / f.max) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{f.tip}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-[var(--brand-muted)] border border-[var(--brand-subtle)] rounded-xl p-5">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--brand)] mb-2">
                <Zap className="w-3.5 h-3.5" /> With WarpFix
              </div>
              <p className="text-[12px] text-[var(--text-secondary)]">
                WarpFix auto-fixes CI failures, reducing your MTTR to near-zero and boosting pass rates by 20-30%.
                Estimated score improvement: <strong className="text-[var(--brand)]">+{Math.min(100 - totalScore, 25)} points</strong>.
              </p>
            </div>
          </div>
        </div>

        <ToolCTA feature="WarpFix Org Stability gives you a real-time CI health score across all your repos — with automatic improvement." />
      </main>
      <ToolFooter />
    </div>
  );
}
