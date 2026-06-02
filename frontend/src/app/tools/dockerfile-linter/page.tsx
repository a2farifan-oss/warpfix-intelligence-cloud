"use client";

import { useState } from "react";
import { Layers, ShieldAlert, Info, CheckCircle2, AlertTriangle, Copy, Check } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

interface LintIssue { line: number; rule: string; severity: "error" | "warning" | "info"; message: string; fix: string; }

function lintDockerfile(input: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = input.split("\n");
  let hasFrom = false;
  let hasUser = false;
  let lastFrom = "";

  lines.forEach((line, i) => {
    const ln = i + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    // DL3006: FROM without tag
    if (trimmed.match(/^FROM\s+\S+$/i) && !trimmed.includes(":") && !trimmed.includes("@") && !trimmed.toLowerCase().includes("scratch")) {
      issues.push({ line: ln, rule: "DL3006", severity: "warning", message: "Image tag is missing — defaulting to :latest", fix: "Pin to a specific version: e.g., FROM node:20-alpine" });
    }

    // FROM with :latest
    if (trimmed.match(/^FROM\s+\S+:latest/i)) {
      issues.push({ line: ln, rule: "DL3007", severity: "warning", message: "Using :latest tag — builds may break when image updates", fix: "Pin to a specific version tag for reproducible builds" });
    }

    if (/^FROM\s/i.test(trimmed)) {
      hasFrom = true;
      lastFrom = trimmed;
    }

    // DL3003: Use WORKDIR instead of cd
    if (trimmed.match(/^RUN\s.*\bcd\s/i)) {
      issues.push({ line: ln, rule: "DL3003", severity: "warning", message: "Use WORKDIR instead of RUN cd", fix: "Replace 'RUN cd /app && ...' with 'WORKDIR /app' followed by 'RUN ...'" });
    }

    // DL3009: apt-get - delete lists after install
    if (trimmed.match(/apt-get\s+install/i) && !trimmed.includes("rm -rf /var/lib/apt/lists")) {
      issues.push({ line: ln, rule: "DL3009", severity: "info", message: "Delete apt lists after install to reduce image size", fix: "Append '&& rm -rf /var/lib/apt/lists/*' to the RUN command" });
    }

    // DL3008: Pin versions in apt-get install
    if (trimmed.match(/apt-get\s+install\s+-y?\s*\w+/) && !trimmed.includes("=")) {
      issues.push({ line: ln, rule: "DL3008", severity: "info", message: "Pin package versions in apt-get install", fix: "Use 'apt-get install -y package=version' for reproducible builds" });
    }

    // DL3013: pip install without version pinning
    if (trimmed.match(/pip\s+install\s/) && !trimmed.includes("==") && !trimmed.includes("-r ") && !trimmed.includes("requirements")) {
      issues.push({ line: ln, rule: "DL3013", severity: "warning", message: "Pin pip package versions", fix: "Use 'pip install package==version' or 'pip install -r requirements.txt'" });
    }

    // DL3020: Use COPY instead of ADD for files
    if (trimmed.match(/^ADD\s/) && !trimmed.includes("http://") && !trimmed.includes("https://") && !trimmed.includes(".tar") && !trimmed.includes(".gz")) {
      issues.push({ line: ln, rule: "DL3020", severity: "warning", message: "Use COPY instead of ADD for local files", fix: "ADD has extra features (URL download, tar extraction). Use COPY for simple file copies." });
    }

    // Security: Running as root
    if (/^USER\s/i.test(trimmed)) hasUser = true;

    // DL3002: Last USER should not be root
    if (trimmed.match(/^USER\s+root/i)) {
      hasUser = false; // Reset — if the last USER is root, that's bad
    }

    // EXPOSE with common mistakes
    if (trimmed.match(/^EXPOSE\s/) && trimmed.includes("/")) {
      // Valid: EXPOSE 80/tcp
    }

    // npm install instead of npm ci
    if (trimmed.match(/npm\s+install\b/) && !trimmed.includes("--legacy-peer-deps") && trimmed.match(/^RUN\s/i)) {
      issues.push({ line: ln, rule: "WF001", severity: "info", message: "Use 'npm ci' instead of 'npm install' in Docker builds", fix: "'npm ci' installs from lockfile (faster, deterministic). Use it in Dockerfiles." });
    }

    // COPY . . without .dockerignore check
    if (trimmed === "COPY . ." || trimmed === "COPY . /app") {
      issues.push({ line: ln, rule: "WF002", severity: "info", message: "Copying entire context — ensure .dockerignore excludes node_modules, .git", fix: "Create a .dockerignore file to exclude unnecessary files and reduce build context size" });
    }

    // Multi-stage: COPY --from without alias
    if (trimmed.match(/COPY\s+--from=\d+/) && !trimmed.match(/COPY\s+--from=[a-zA-Z]/)) {
      issues.push({ line: ln, rule: "DL3022", severity: "info", message: "Use named stages instead of index in COPY --from", fix: "Name your build stage: 'FROM node:20 AS builder' then 'COPY --from=builder'" });
    }
  });

  // File-level checks
  if (!hasFrom) {
    issues.push({ line: 1, rule: "DL3004", severity: "error", message: "Missing FROM instruction", fix: "Every Dockerfile must start with a FROM instruction" });
  }

  if (hasFrom && !hasUser) {
    issues.push({ line: lines.length, rule: "DL3002", severity: "warning", message: "Container runs as root by default", fix: "Add 'USER node' or 'USER appuser' before CMD to run as non-root for security" });
  }

  return issues;
}

const SAMPLE = `FROM node:latest
WORKDIR /app
ADD package.json .
RUN npm install
COPY . .
RUN apt-get update && apt-get install -y curl
EXPOSE 3000
CMD ["node", "server.js"]`;

export default function DockerfileLinter() {
  const [input, setInput] = useState("");
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [linted, setLinted] = useState(false);

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dockerfile Linter</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Security audit and best practices for your Dockerfiles</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-4">
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Paste your Dockerfile</label>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="FROM node:20-alpine\nWORKDIR /app\n..."
            className="w-full h-48 p-4 font-mono text-[12px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg resize-y focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => { setIssues(lintDockerfile(input)); setLinted(true); }} disabled={!input.trim()} className="px-4 py-2 bg-[var(--brand)] text-white text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Lint Dockerfile
            </button>
            <button onClick={() => { setInput(SAMPLE); setLinted(false); }} className="px-4 py-2 text-[13px] text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
              Load Sample
            </button>
          </div>
        </div>

        {linted && (
          <>
            <div className="flex items-center gap-3 mb-4">
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-lg text-green-700 text-[13px] font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Dockerfile looks good!
                </div>
              ) : (
                <>
                  {errors > 0 && <span className="px-3 py-1 bg-red-50 text-red-700 text-[12px] font-medium rounded-full">{errors} error{errors > 1 ? "s" : ""}</span>}
                  {warnings > 0 && <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[12px] font-medium rounded-full">{warnings} warning{warnings > 1 ? "s" : ""}</span>}
                  {infos > 0 && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[12px] font-medium rounded-full">{infos} suggestion{infos > 1 ? "s" : ""}</span>}
                </>
              )}
            </div>

            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div key={i} className={`border rounded-lg p-4 ${
                  issue.severity === "error" ? "bg-red-50 border-red-100" : issue.severity === "warning" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                }`}>
                  <div className="flex items-start gap-2">
                    {issue.severity === "error" ? <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> :
                     issue.severity === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> :
                     <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] font-medium ${
                          issue.severity === "error" ? "text-red-700" : issue.severity === "warning" ? "text-amber-700" : "text-blue-700"
                        }`}>{issue.message}</span>
                        <span className="text-[10px] font-mono opacity-60">{issue.rule} · Line {issue.line}</span>
                      </div>
                      <p className="text-[12px] opacity-75 mt-1">{issue.fix}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <ToolCTA feature="Docker build failing in CI? WarpFix auto-fixes container build failures — Dockerfile issues, dependency conflicts, and more." />
      </main>
      <ToolFooter />
    </div>
  );
}
