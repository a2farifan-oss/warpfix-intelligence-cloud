"use client";

import { useState } from "react";
import { Terminal, Copy, Check, AlertTriangle, Lightbulb, Zap, ArrowRight } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const SAMPLE_LOG = `Run npm ci
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error
npm error While resolving: my-app@1.0.0
npm error Found: react@18.2.0
npm error node_modules/react
npm error   react@"^18.2.0" from the root project
npm error
npm error Could not resolve dependency:
npm error peer react@"^17.0.0" from react-beautiful-dnd@13.1.1
npm error node_modules/react-beautiful-dnd
Error: Process completed with exit code 1.`;

interface DecodedError {
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  rootCause: string;
  fix: string;
  command: string;
  explanation: string;
}

const ERROR_PATTERNS: { pattern: RegExp; decode: (match: RegExpMatchArray, log: string) => DecodedError }[] = [
  {
    pattern: /ERESOLVE unable to resolve dependency/i,
    decode: (_, log) => {
      const peerMatch = log.match(/peer (.+?)@"(.+?)" from (.+?)@/);
      return {
        category: "Dependency Conflict",
        severity: "critical",
        title: "npm ERESOLVE — Peer Dependency Conflict",
        rootCause: peerMatch
          ? `Package "${peerMatch[3]}" requires ${peerMatch[1]}@${peerMatch[2]}, but your project has a different version installed.`
          : "Two or more packages require incompatible versions of the same dependency.",
        fix: "Use --legacy-peer-deps or update the conflicting package to a compatible version.",
        command: "npm install --legacy-peer-deps",
        explanation: "npm v7+ enforces strict peer dependency resolution by default. This error occurs when a package requires a specific version of a peer dependency that conflicts with what's already in your tree. In CI, add --legacy-peer-deps to your install step, or pin compatible versions.",
      };
    },
  },
  {
    pattern: /ENOENT.*no such file or directory/i,
    decode: (_, log) => {
      const fileMatch = log.match(/ENOENT.*?'(.+?)'/);
      return {
        category: "File Not Found",
        severity: "critical",
        title: "ENOENT — File or Directory Missing",
        rootCause: fileMatch
          ? `The file or directory "${fileMatch[1]}" does not exist at the expected path.`
          : "A required file or directory is missing from the repository or build context.",
        fix: "Ensure the file exists in your repo. Check if it's gitignored, if the path is case-sensitive, or if a build step that creates it ran first.",
        command: "ls -la <expected-path>",
        explanation: "ENOENT (Error NO ENTity) means the OS couldn't find a file. Common causes in CI: missing build artifacts (forgot to run build before test), case-sensitivity differences between macOS (your laptop) and Linux (CI runner), or files excluded by .gitignore.",
      };
    },
  },
  {
    pattern: /exit code 1/i,
    decode: (_, log) => {
      const hasLint = /eslint|prettier|lint/i.test(log);
      const hasTest = /jest|mocha|vitest|test.*fail/i.test(log);
      const hasType = /tsc|type.*error|typescript/i.test(log);
      const hasBuild = /webpack|vite|build.*fail|next.*build/i.test(log);
      let sub = "Generic";
      let rootCause = "A command in your CI pipeline returned a non-zero exit code.";
      let fix = "Check the step that failed and review its output for the specific error.";
      if (hasLint) {
        sub = "Lint Failure";
        rootCause = "ESLint or Prettier found code style violations.";
        fix = "Run the linter locally and fix all violations, or add --fix to auto-fix.";
      } else if (hasTest) {
        sub = "Test Failure";
        rootCause = "One or more tests failed during the CI run.";
        fix = "Run tests locally with verbose output to identify the failing test(s).";
      } else if (hasType) {
        sub = "Type Error";
        rootCause = "TypeScript compilation found type errors in your code.";
        fix = "Run tsc --noEmit locally to see all type errors and fix them.";
      } else if (hasBuild) {
        sub = "Build Failure";
        rootCause = "The build step failed — check for missing imports, syntax errors, or config issues.";
        fix = "Run the build command locally and check the output for specific errors.";
      }
      return {
        category: sub,
        severity: "critical",
        title: `Exit Code 1 — ${sub}`,
        rootCause,
        fix,
        command: hasLint ? "npx eslint . --fix" : hasTest ? "npm test -- --verbose" : hasType ? "npx tsc --noEmit" : "npm run build",
        explanation: "Exit code 1 is the most common CI failure. It means a process returned an error. The real question is WHICH process and WHY. Look at the step name and the lines immediately before the exit code message for the actual error.",
      };
    },
  },
  {
    pattern: /permission denied/i,
    decode: () => ({
      category: "Permissions",
      severity: "warning",
      title: "Permission Denied",
      rootCause: "The CI runner doesn't have the necessary file system permissions for the operation.",
      fix: "Add appropriate permissions to your workflow file or use chmod before the failing command.",
      command: "chmod +x ./script.sh",
      explanation: "Common causes: trying to execute a script that isn't marked executable (fix: chmod +x), writing to a protected directory, or GitHub token lacking required permissions (fix: add permissions block to workflow YAML).",
    }),
  },
  {
    pattern: /timeout|timed out/i,
    decode: () => ({
      category: "Timeout",
      severity: "warning",
      title: "Operation Timed Out",
      rootCause: "A CI step exceeded its time limit, possibly due to a hanging process, slow network, or infinite loop.",
      fix: "Increase the timeout, add retry logic, or investigate the hanging process.",
      command: "timeout-minutes: 30",
      explanation: "CI timeouts usually mean: a test has an infinite loop, a service dependency (database, API) is unreachable, npm install is stuck on a large package, or the runner is under heavy load. Add timeout-minutes to your job or step to control this.",
    }),
  },
  {
    pattern: /secret|token.*invalid|unauthorized|401/i,
    decode: () => ({
      category: "Authentication",
      severity: "critical",
      title: "Secret / Token Error",
      rootCause: "A secret or token used in the workflow is missing, expired, or has insufficient permissions.",
      fix: "Check your repository secrets in Settings → Secrets and variables → Actions. Ensure the secret exists and is spelled correctly.",
      command: "${{ secrets.YOUR_SECRET_NAME }}",
      explanation: "Common causes: secret name typo (secrets are case-sensitive), secret expired, secret not available to fork PRs (security restriction), or GITHUB_TOKEN doesn't have the required permissions (add a permissions block).",
    }),
  },
];

function decodeLog(log: string): DecodedError | null {
  for (const { pattern, decode } of ERROR_PATTERNS) {
    const match = log.match(pattern);
    if (match) return decode(match, log);
  }
  if (log.trim().length > 0) {
    return {
      category: "Unknown",
      severity: "info",
      title: "Unrecognized Error Pattern",
      rootCause: "The error pattern wasn't recognized by our decoder. This may be a custom or uncommon error.",
      fix: "Search for the specific error message in the GitHub Actions documentation or Stack Overflow.",
      command: "",
      explanation: "Tip: Copy the most specific error line (not the generic 'Process completed with exit code' line) and search for it. The lines immediately before the failure message usually contain the real error.",
    };
  }
  return null;
}

export default function CIErrorDecoder() {
  const [log, setLog] = useState("");
  const [result, setResult] = useState<DecodedError | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDecode = () => {
    const decoded = decodeLog(log);
    setResult(decoded);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const severityColors = {
    critical: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CI Error Decoder</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Paste your CI log — get instant root cause analysis and fix</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-4">
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
            Paste your CI/CD log output
          </label>
          <textarea
            value={log}
            onChange={(e) => setLog(e.target.value)}
            placeholder="Paste your GitHub Actions, GitLab CI, or CircleCI log here..."
            className="w-full h-48 p-4 font-mono text-[12px] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg resize-y focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleDecode}
              disabled={!log.trim()}
              className="px-4 py-2 bg-[var(--brand)] text-white text-[13px] font-medium rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Decode Error
            </button>
            <button
              onClick={() => { setLog(SAMPLE_LOG); setResult(null); }}
              className="px-4 py-2 text-[13px] text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Load Sample
            </button>
            {log && (
              <button
                onClick={() => { setLog(""); setResult(null); }}
                className="px-4 py-2 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${severityColors[result.severity]} mb-2`}>
                  <AlertTriangle className="w-3 h-3" />
                  {result.severity.toUpperCase()} — {result.category}
                </span>
                <h2 className="text-lg font-bold">{result.title}</h2>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <div className="text-[12px] font-medium text-red-800 mb-1">Root Cause</div>
              <p className="text-[13px] text-red-700">{result.rootCause}</p>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-green-800 mb-1">
                <Lightbulb className="w-3.5 h-3.5" />
                Fix
              </div>
              <p className="text-[13px] text-green-700 mb-3">{result.fix}</p>
              {result.command && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white border border-green-200 rounded font-mono text-[12px] text-green-800">
                    {result.command}
                  </code>
                  <button
                    onClick={() => handleCopy(result.command)}
                    className="p-2 rounded hover:bg-green-100 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-green-600" />}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-1">Explanation</div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{result.explanation}</p>
            </div>
          </div>
        )}

        <ToolCTA feature="You just decoded this error manually. WarpFix does this automatically for every CI failure — and opens a PR with the fix." />
      </main>
      <ToolFooter />
    </div>
  );
}
