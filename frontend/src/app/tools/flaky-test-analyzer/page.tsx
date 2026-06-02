"use client";

import { useState } from "react";
import { TestTube2, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const SAMPLE_LOGS = `PASS src/utils/format.test.ts (2.1s)
FAIL src/api/auth.test.ts (4.3s)
  ● should authenticate user → Expected 200, received 500
PASS src/components/Header.test.tsx (1.8s)
PASS src/api/auth.test.ts (3.9s) [RETRY]
FAIL src/services/payment.test.ts (6.1s)
  ● should process refund → Timeout after 5000ms
PASS src/services/payment.test.ts (5.8s) [RETRY]
PASS src/utils/format.test.ts (2.0s)
FAIL src/api/auth.test.ts (4.5s)
  ● should authenticate user → Connection refused
PASS src/components/Header.test.tsx (1.9s)
PASS src/api/auth.test.ts (4.1s) [RETRY]
PASS src/services/payment.test.ts (5.5s)`;

interface FlakyTest {
  name: string;
  failCount: number;
  totalRuns: number;
  flakiness: number;
  errors: string[];
  avgTime: number;
  category: string;
}

function analyzeLogs(input: string): FlakyTest[] {
  const lines = input.split("\n").filter((l) => l.trim());
  const tests: Record<string, { pass: number; fail: number; errors: string[]; times: number[] }> = {};

  for (const line of lines) {
    const passMatch = line.match(/(PASS|FAIL)\s+(.+?)\s+\((\d+\.?\d*)s\)/);
    if (!passMatch) continue;
    const [, status, testFile, timeStr] = passMatch;
    const name = testFile.replace(/\s*\[RETRY\]/, "").trim();
    if (!tests[name]) tests[name] = { pass: 0, fail: 0, errors: [], times: [] };
    tests[name].times.push(parseFloat(timeStr));
    if (status === "PASS") tests[name].pass++;
    else {
      tests[name].fail++;
      const errMatch = line.match(/● (.+)/);
      const nextLine = lines[lines.indexOf(line) + 1];
      if (nextLine && nextLine.trim().startsWith("●")) {
        tests[name].errors.push(nextLine.trim().replace("● ", ""));
      }
    }
  }

  // Also check for error lines that follow FAIL lines
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("FAIL")) {
      const nameMatch = lines[i].match(/FAIL\s+(.+?)\s+\(/);
      if (nameMatch) {
        const name = nameMatch[1].replace(/\s*\[RETRY\]/, "").trim();
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("●") && tests[name]) {
          const errText = lines[i + 1].trim().replace("● ", "");
          if (!tests[name].errors.includes(errText)) tests[name].errors.push(errText);
        }
      }
    }
  }

  return Object.entries(tests)
    .filter(([, data]) => data.fail > 0 && data.pass > 0)
    .map(([name, data]) => {
      const total = data.pass + data.fail;
      const flakiness = Math.round((data.fail / total) * 100);
      const avgTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;
      let category = "Unknown";
      const errStr = data.errors.join(" ").toLowerCase();
      if (errStr.includes("timeout") || errStr.includes("timed out")) category = "Timeout";
      else if (errStr.includes("connection") || errStr.includes("network") || errStr.includes("refused")) category = "Network/Connectivity";
      else if (errStr.includes("race") || errStr.includes("concurrent")) category = "Race Condition";
      else if (data.fail > 0) category = "Intermittent Failure";

      return { name, failCount: data.fail, totalRuns: total, flakiness, errors: data.errors, avgTime: Math.round(avgTime * 10) / 10, category };
    })
    .sort((a, b) => b.flakiness - a.flakiness);
}

export default function FlakyTestAnalyzer() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<FlakyTest[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = () => {
    setResults(analyzeLogs(input));
    setAnalyzed(true);
  };

  const totalFlaky = results.length;
  const avgFlakiness = results.length ? Math.round(results.reduce((a, b) => a + b.flakiness, 0) / results.length) : 0;
  const wastedTime = results.reduce((a, b) => a + b.avgTime * b.failCount, 0);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TestTube2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Flaky Test Analyzer</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Find inconsistent tests wasting your CI time</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-4">
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
            Paste CI test output from multiple runs
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste test results from multiple CI runs — include PASS/FAIL lines with test file names..."
            className="w-full h-48 p-4 font-mono text-[12px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg resize-y focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={handleAnalyze} disabled={!input.trim()} className="px-4 py-2 bg-[var(--brand)] text-white text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Analyze Tests
            </button>
            <button onClick={() => { setInput(SAMPLE_LOGS); setAnalyzed(false); setResults([]); }} className="px-4 py-2 text-[13px] text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
              Load Sample
            </button>
          </div>
        </div>

        {analyzed && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { icon: AlertTriangle, label: "Flaky Tests Found", value: totalFlaky.toString(), color: "text-amber-600", bg: "bg-amber-50" },
                { icon: TrendingUp, label: "Avg Flakiness", value: `${avgFlakiness}%`, color: "text-red-600", bg: "bg-red-50" },
                { icon: Clock, label: "CI Time Wasted", value: `${Math.round(wastedTime)}s`, color: "text-blue-600", bg: "bg-blue-50" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-[var(--border-default)] rounded-xl p-4 text-center">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{s.label}</div>
                </div>
              ))}
            </div>

            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((test) => (
                  <div key={test.name} className="bg-white border border-[var(--border-default)] rounded-xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <code className="text-[13px] font-mono font-medium">{test.name}</code>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          test.flakiness > 50 ? "bg-red-50 text-red-700" : test.flakiness > 25 ? "bg-amber-50 text-amber-700" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {test.flakiness}% flaky
                        </span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)]">{test.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-[var(--text-tertiary)] mb-2">
                      <span>{test.failCount} failures / {test.totalRuns} runs</span>
                      <span>Avg: {test.avgTime}s</span>
                    </div>
                    {/* Flakiness bar */}
                    <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full ${test.flakiness > 50 ? "bg-red-400" : "bg-amber-400"}`} style={{ width: `${test.flakiness}%` }} />
                    </div>
                    {test.errors.length > 0 && (
                      <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                        {test.errors.map((e, i) => (
                          <div key={i} className="font-mono">→ {e}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[var(--border-default)] rounded-xl p-8 text-center">
                <div className="text-[var(--success)] text-lg font-semibold mb-1">No Flaky Tests Found</div>
                <p className="text-[13px] text-[var(--text-tertiary)]">All detected tests pass or fail consistently. Great test suite!</p>
              </div>
            )}
          </>
        )}

        <ToolCTA feature="WarpFix Pro detects flaky tests automatically across all your repos and shows which tests waste the most CI time." />
      </main>
      <ToolFooter />
    </div>
  );
}
