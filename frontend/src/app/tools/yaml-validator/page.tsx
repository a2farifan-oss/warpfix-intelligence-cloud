"use client";

import { useState } from "react";
import { FileCode, CheckCircle2, AlertTriangle, Copy, Check } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

interface YAMLIssue {
  line: number;
  severity: "error" | "warning";
  message: string;
}

function validateYAML(input: string): { valid: boolean; issues: YAMLIssue[]; formatted: string } {
  const issues: YAMLIssue[] = [];
  const lines = input.split("\n");
  let indentStack: number[] = [0];

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) return;

    // Tab check
    if (line.includes("\t")) {
      issues.push({ line: lineNum, severity: "error", message: "Tab character detected — YAML requires spaces" });
    }

    // Trailing whitespace
    if (line !== trimmed) {
      issues.push({ line: lineNum, severity: "warning", message: "Trailing whitespace" });
    }

    // Inconsistent indentation
    const leadingSpaces = line.match(/^( *)/)?.[1]?.length ?? 0;
    if (leadingSpaces > 0 && leadingSpaces % 2 !== 0) {
      issues.push({ line: lineNum, severity: "warning", message: `Odd indentation (${leadingSpaces} spaces) — use multiples of 2` });
    }

    // Duplicate key detection (basic)
    const keyMatch = trimmed.match(/^(\s*)(\S+):/);
    if (keyMatch) {
      const indent = keyMatch[1].length;
      const key = keyMatch[2];
      // Check for duplicate keys at same level
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trimEnd();
        if (!prevLine || prevLine.startsWith("#")) continue;
        const prevKeyMatch = prevLine.match(/^(\s*)(\S+):/);
        if (prevKeyMatch) {
          if (prevKeyMatch[1].length < indent) break; // different parent
          if (prevKeyMatch[1].length === indent && prevKeyMatch[2] === key) {
            issues.push({ line: lineNum, severity: "error", message: `Duplicate key "${key}" at same indentation level` });
            break;
          }
        }
      }
    }

    // Unquoted special values
    if (trimmed.match(/:\s+(yes|no|on|off|true|false)$/i)) {
      const val = trimmed.match(/:\s+(.+)$/)?.[1] || "";
      if (!val.startsWith('"') && !val.startsWith("'")) {
        issues.push({ line: lineNum, severity: "warning", message: `"${val}" is a YAML boolean — quote it if you mean the string` });
      }
    }

    // Colon without space
    if (trimmed.match(/^\s*\S+:[^\s]/) && !trimmed.includes("://") && !trimmed.startsWith("-")) {
      issues.push({ line: lineNum, severity: "error", message: "Missing space after colon" });
    }
  });

  // Format: normalize indentation, remove trailing whitespace
  const formatted = lines.map((line) => line.replace(/\t/g, "  ").trimEnd()).join("\n");

  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues, formatted };
}

const SAMPLE = `name: Build
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: npm ci
      - name: Run tests
        run: npm test`;

export default function YAMLValidator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof validateYAML> | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">YAML Validator & Formatter</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Validate syntax, check for common mistakes, and format your YAML files</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-4">
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Paste your YAML</label>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your YAML (GitHub Actions, docker-compose, Kubernetes, etc.)..."
            className="w-full h-64 p-4 font-mono text-[12px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg resize-y focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => setResult(validateYAML(input))} disabled={!input.trim()} className="px-4 py-2 bg-[var(--brand)] text-white text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Validate & Format
            </button>
            <button onClick={() => { setInput(SAMPLE); setResult(null); }} className="px-4 py-2 text-[13px] text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
              Load Sample
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium mb-4 ${
              result.valid ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 border border-red-100 text-red-700"
            }`}>
              {result.valid ? <><CheckCircle2 className="w-4 h-4" /> Valid YAML</> : <><AlertTriangle className="w-4 h-4" /> Issues found</>}
              <span className="text-[11px] opacity-70 ml-2">{result.issues.length} issue{result.issues.length !== 1 ? "s" : ""}</span>
            </div>

            {result.issues.length > 0 && (
              <div className="space-y-2 mb-4">
                {result.issues.map((issue, i) => (
                  <div key={i} className={`border rounded-lg p-3 text-[12px] ${
                    issue.severity === "error" ? "bg-red-50 border-red-100 text-red-700" : "bg-amber-50 border-amber-100 text-amber-700"
                  }`}>
                    <span className="font-medium">Line {issue.line}:</span> {issue.message}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-[var(--border-default)] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">Formatted Output</span>
                <button onClick={() => { navigator.clipboard.writeText(result.formatted); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-[11px] flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                  {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="p-5 text-[12px] font-mono text-[var(--text-secondary)] overflow-auto max-h-96 whitespace-pre">{result.formatted}</pre>
            </div>
          </>
        )}

        <ToolCTA feature="Valid YAML doesn't mean working pipelines. WarpFix catches runtime failures that validators can't and fixes them automatically." />
      </main>
      <ToolFooter />
    </div>
  );
}
