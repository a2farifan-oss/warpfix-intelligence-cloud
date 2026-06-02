"use client";

import { useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, Info, Copy, Check } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const SAMPLE_YAML = `name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test`;

interface ValidationIssue {
  line: number;
  severity: "error" | "warning" | "info";
  message: string;
  fix: string;
}

function validateWorkflow(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = yaml.split("\n");

  // Check for name
  if (!yaml.match(/^name:/m)) {
    issues.push({ line: 1, severity: "warning", message: "Missing workflow name", fix: "Add 'name: My Workflow' at the top of the file." });
  }

  // Check for on trigger
  if (!yaml.match(/^on:/m)) {
    issues.push({ line: 1, severity: "error", message: "Missing 'on:' trigger — workflow will never run", fix: "Add 'on:' section with triggers like push, pull_request, or workflow_dispatch." });
  }

  // Check for jobs
  if (!yaml.match(/^jobs:/m)) {
    issues.push({ line: 1, severity: "error", message: "Missing 'jobs:' section", fix: "Add 'jobs:' section with at least one job definition." });
  }

  // Check for runs-on
  if (yaml.includes("jobs:") && !yaml.match(/runs-on:/)) {
    issues.push({ line: 1, severity: "error", message: "Job missing 'runs-on' — no runner specified", fix: "Add 'runs-on: ubuntu-latest' (or another runner) to each job." });
  }

  // Check for checkout step
  if (yaml.includes("steps:") && !yaml.includes("actions/checkout")) {
    issues.push({ line: 1, severity: "warning", message: "Missing checkout step — your code won't be available", fix: "Add '- uses: actions/checkout@v4' as the first step." });
  }

  // Check for outdated actions
  lines.forEach((line, i) => {
    const actionMatch = line.match(/uses:\s*(\S+)@v(\d+)/);
    if (actionMatch) {
      const [, action, version] = actionMatch;
      const latestVersions: Record<string, string> = {
        "actions/checkout": "4",
        "actions/setup-node": "4",
        "actions/setup-python": "5",
        "actions/setup-go": "5",
        "actions/setup-java": "4",
        "actions/cache": "4",
        "actions/upload-artifact": "4",
        "actions/download-artifact": "4",
      };
      if (latestVersions[action] && version < latestVersions[action]) {
        issues.push({
          line: i + 1,
          severity: "warning",
          message: `${action}@v${version} is outdated — latest is v${latestVersions[action]}`,
          fix: `Update to '${action}@v${latestVersions[action]}'`,
        });
      }
    }

    // Check for npm install instead of npm ci
    if (line.match(/run:\s*npm install\b/) && !line.includes("--legacy-peer-deps")) {
      issues.push({
        line: i + 1,
        severity: "info",
        message: "Consider using 'npm ci' instead of 'npm install' in CI",
        fix: "'npm ci' is faster, ensures a clean install from lockfile, and fails if lockfile is out of sync.",
      });
    }

    // Check for unpinned SHA actions
    if (line.match(/uses:\s*\S+@(main|master|HEAD)/)) {
      issues.push({
        line: i + 1,
        severity: "warning",
        message: "Action pinned to a mutable branch — use a version tag or commit SHA",
        fix: "Pin to a specific version (e.g., @v4) or full commit SHA for security.",
      });
    }

    // Check for hardcoded secrets
    if (line.match(/(password|token|secret|api_key)\s*[:=]\s*['"]\S+['"]/i) && !line.includes("${{")) {
      issues.push({
        line: i + 1,
        severity: "error",
        message: "Possible hardcoded secret detected — use GitHub Secrets",
        fix: "Replace with '${{ secrets.YOUR_SECRET_NAME }}' and add the value in repo Settings → Secrets.",
      });
    }

    // Check for missing timeout
    if (line.match(/^\s+\w+:/) && yaml.includes("jobs:") && !yaml.includes("timeout-minutes")) {
      // Only check once
      if (i === lines.findIndex((l) => l.match(/^\s+\w+:/) && yaml.includes("jobs:"))) {
        issues.push({
          line: i + 1,
          severity: "info",
          message: "No timeout-minutes set — jobs default to 6 hours",
          fix: "Add 'timeout-minutes: 15' (or appropriate value) to each job to prevent runaway builds.",
        });
      }
    }
  });

  // Check for permissions block
  if (!yaml.includes("permissions:")) {
    issues.push({
      line: 1,
      severity: "info",
      message: "No permissions block — using default (broad) GITHUB_TOKEN permissions",
      fix: "Add 'permissions:' block to follow principle of least privilege. E.g., 'permissions: { contents: read }'",
    });
  }

  // YAML basic syntax checks
  lines.forEach((line, i) => {
    if (line.includes("\t")) {
      issues.push({ line: i + 1, severity: "error", message: "Tab character found — YAML requires spaces for indentation", fix: "Replace tabs with spaces (2 spaces per indent level)." });
    }
  });

  return issues;
}

export default function GitHubActionsValidator() {
  const [yaml, setYaml] = useState("");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [validated, setValidated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleValidate = () => {
    setIssues(validateWorkflow(yaml));
    setValidated(true);
  };

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  const severityIcon = { error: AlertTriangle, warning: AlertTriangle, info: Info };
  const severityColor = {
    error: "text-red-600 bg-red-50 border-red-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    info: "text-blue-600 bg-blue-50 border-blue-100",
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">GitHub Actions Validator</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Check your workflow YAML for errors, best practices, and security issues</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-4">
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
            Paste your GitHub Actions workflow YAML
          </label>
          <textarea
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            placeholder="Paste your .github/workflows/*.yml content here..."
            className="w-full h-64 p-4 font-mono text-[12px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg resize-y focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={handleValidate} disabled={!yaml.trim()} className="px-4 py-2 bg-[var(--brand)] text-white text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Validate Workflow
            </button>
            <button onClick={() => { setYaml(SAMPLE_YAML); setValidated(false); }} className="px-4 py-2 text-[13px] text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
              Load Sample
            </button>
          </div>
        </div>

        {validated && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-3 mb-4">
              {errors === 0 && warnings === 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-lg text-green-700 text-[13px] font-medium">
                  <CheckCircle2 className="w-4 h-4" /> No critical issues found!
                </div>
              ) : (
                <>
                  {errors > 0 && <span className="px-3 py-1 bg-red-50 text-red-700 text-[12px] font-medium rounded-full">{errors} error{errors > 1 ? "s" : ""}</span>}
                  {warnings > 0 && <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[12px] font-medium rounded-full">{warnings} warning{warnings > 1 ? "s" : ""}</span>}
                </>
              )}
              {infos > 0 && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[12px] font-medium rounded-full">{infos} suggestion{infos > 1 ? "s" : ""}</span>}
            </div>

            {/* Issues */}
            <div className="space-y-2">
              {issues.map((issue, i) => {
                const Icon = severityIcon[issue.severity];
                return (
                  <div key={i} className={`border rounded-lg p-4 ${severityColor[issue.severity]}`}>
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium">{issue.message}</span>
                          <span className="text-[10px] opacity-60">Line {issue.line}</span>
                        </div>
                        <p className="text-[12px] opacity-80 mt-1">{issue.fix}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <ToolCTA feature="Validation catches syntax errors. WarpFix catches runtime failures and fixes them automatically — no more manual debugging." />
      </main>
      <ToolFooter />
    </div>
  );
}
