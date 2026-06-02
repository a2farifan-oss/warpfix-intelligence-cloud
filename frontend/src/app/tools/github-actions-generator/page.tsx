"use client";

import { useState } from "react";
import { Cpu, Copy, Check } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const FRAMEWORKS = [
  { id: "nodejs", label: "Node.js", icon: "🟢", versions: ["18", "20", "22"], pm: "npm", build: "npm run build", test: "npm test", lint: "npm run lint" },
  { id: "python", label: "Python", icon: "🐍", versions: ["3.10", "3.11", "3.12"], pm: "pip", build: "", test: "pytest", lint: "ruff check ." },
  { id: "go", label: "Go", icon: "🔵", versions: ["1.21", "1.22", "1.23"], pm: "go mod", build: "go build ./...", test: "go test ./...", lint: "golangci-lint run" },
  { id: "rust", label: "Rust", icon: "🦀", versions: ["stable", "nightly"], pm: "cargo", build: "cargo build", test: "cargo test", lint: "cargo clippy -- -D warnings" },
  { id: "java", label: "Java (Maven)", icon: "☕", versions: ["17", "21"], pm: "maven", build: "mvn package -DskipTests", test: "mvn test", lint: "" },
  { id: "nextjs", label: "Next.js", icon: "▲", versions: ["18", "20", "22"], pm: "npm", build: "npm run build", test: "npm test", lint: "npm run lint" },
  { id: "django", label: "Django", icon: "🎸", versions: ["3.10", "3.11", "3.12"], pm: "pip", build: "", test: "python manage.py test", lint: "ruff check ." },
  { id: "rails", label: "Ruby on Rails", icon: "💎", versions: ["3.2", "3.3"], pm: "bundle", build: "", test: "bundle exec rspec", lint: "bundle exec rubocop" },
  { id: "docker", label: "Docker Build", icon: "🐳", versions: [], pm: "docker", build: "docker build -t app .", test: "", lint: "" },
  { id: "terraform", label: "Terraform", icon: "🏗️", versions: ["1.7", "1.8", "1.9"], pm: "terraform", build: "terraform plan", test: "terraform validate", lint: "terraform fmt -check" },
];

const TRIGGERS = [
  { id: "push", label: "Push", default: true },
  { id: "pull_request", label: "Pull Request", default: true },
  { id: "schedule", label: "Schedule (Cron)", default: false },
  { id: "workflow_dispatch", label: "Manual Trigger", default: false },
];

function generateYAML(config: {
  framework: typeof FRAMEWORKS[0];
  triggers: string[];
  branches: string;
  cron: string;
  enableCache: boolean;
  enableLint: boolean;
  enableBuild: boolean;
  enableTest: boolean;
  matrix: boolean;
}) {
  const { framework: fw, triggers, branches, cron, enableCache, enableLint, enableBuild, enableTest, matrix } = config;
  const branchList = branches.split(",").map((b) => b.trim()).filter(Boolean);
  const lines: string[] = [];

  lines.push(`name: ${fw.label} CI`);
  lines.push("");
  lines.push("on:");
  if (triggers.includes("push")) {
    lines.push("  push:");
    lines.push(`    branches: [${branchList.join(", ")}]`);
  }
  if (triggers.includes("pull_request")) {
    lines.push("  pull_request:");
    lines.push(`    branches: [${branchList.join(", ")}]`);
  }
  if (triggers.includes("schedule")) {
    lines.push("  schedule:");
    lines.push(`    - cron: '${cron || "0 6 * * 1"}'`);
  }
  if (triggers.includes("workflow_dispatch")) {
    lines.push("  workflow_dispatch:");
  }

  lines.push("");
  lines.push("jobs:");
  lines.push("  build:");
  lines.push("    runs-on: ubuntu-latest");

  if (matrix && fw.versions.length > 1) {
    lines.push("    strategy:");
    lines.push("      matrix:");
    if (fw.pm === "pip") lines.push(`        python-version: [${fw.versions.map((v) => `"${v}"`).join(", ")}]`);
    else if (fw.pm === "go mod") lines.push(`        go-version: [${fw.versions.map((v) => `"${v}"`).join(", ")}]`);
    else if (fw.pm === "cargo") lines.push(`        toolchain: [${fw.versions.join(", ")}]`);
    else if (fw.pm === "maven") lines.push(`        java-version: [${fw.versions.map((v) => `"${v}"`).join(", ")}]`);
    else if (fw.pm === "bundle") lines.push(`        ruby-version: [${fw.versions.map((v) => `"${v}"`).join(", ")}]`);
    else if (fw.pm === "terraform") lines.push(`        terraform-version: [${fw.versions.map((v) => `"${v}"`).join(", ")}]`);
    else lines.push(`        node-version: [${fw.versions.join(", ")}]`);
  }

  lines.push("    steps:");
  lines.push("      - uses: actions/checkout@v4");

  // Setup
  if (["npm", "docker"].includes(fw.pm) === false) {
    if (fw.pm === "pip") {
      lines.push("      - uses: actions/setup-python@v5");
      lines.push("        with:");
      lines.push(`          python-version: ${matrix && fw.versions.length > 1 ? "${{ matrix.python-version }}" : `"${fw.versions[fw.versions.length - 1]}"`}`);
    } else if (fw.pm === "go mod") {
      lines.push("      - uses: actions/setup-go@v5");
      lines.push("        with:");
      lines.push(`          go-version: ${matrix && fw.versions.length > 1 ? "${{ matrix.go-version }}" : `"${fw.versions[fw.versions.length - 1]}"`}`);
    } else if (fw.pm === "cargo") {
      lines.push("      - uses: dtolnay/rust-toolchain@master");
      lines.push("        with:");
      lines.push(`          toolchain: ${matrix ? "${{ matrix.toolchain }}" : fw.versions[0]}`);
    } else if (fw.pm === "maven") {
      lines.push("      - uses: actions/setup-java@v4");
      lines.push("        with:");
      lines.push("          distribution: temurin");
      lines.push(`          java-version: ${matrix && fw.versions.length > 1 ? "${{ matrix.java-version }}" : `"${fw.versions[fw.versions.length - 1]}"`}`);
    } else if (fw.pm === "bundle") {
      lines.push("      - uses: ruby/setup-ruby@v1");
      lines.push("        with:");
      lines.push(`          ruby-version: ${matrix && fw.versions.length > 1 ? "${{ matrix.ruby-version }}" : `"${fw.versions[fw.versions.length - 1]}"`}`);
      lines.push("          bundler-cache: true");
    } else if (fw.pm === "terraform") {
      lines.push("      - uses: hashicorp/setup-terraform@v3");
      lines.push("        with:");
      lines.push(`          terraform_version: ${matrix && fw.versions.length > 1 ? "${{ matrix.terraform-version }}" : `"${fw.versions[fw.versions.length - 1]}"`}`);
    }
  }

  if (fw.pm === "npm") {
    lines.push("      - uses: actions/setup-node@v4");
    lines.push("        with:");
    lines.push(`          node-version: ${matrix && fw.versions.length > 1 ? "${{ matrix.node-version }}" : fw.versions[fw.versions.length - 1]}`);
    if (enableCache) lines.push("          cache: npm");
    lines.push("      - run: npm ci");
  } else if (fw.pm === "pip") {
    if (enableCache) {
      lines.push("      - uses: actions/cache@v4");
      lines.push("        with:");
      lines.push("          path: ~/.cache/pip");
      lines.push("          key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}");
    }
    lines.push("      - run: pip install -r requirements.txt");
  } else if (fw.pm === "docker") {
    // No install step for docker
  } else if (fw.pm !== "bundle" && fw.pm !== "cargo" && fw.pm !== "terraform") {
    // go mod download handled by setup-go cache
  }

  if (enableLint && fw.lint) {
    lines.push(`      - name: Lint`);
    lines.push(`        run: ${fw.lint}`);
  }
  if (enableBuild && fw.build) {
    lines.push(`      - name: Build`);
    lines.push(`        run: ${fw.build}`);
  }
  if (enableTest && fw.test) {
    lines.push(`      - name: Test`);
    lines.push(`        run: ${fw.test}`);
  }

  return lines.join("\n");
}

export default function GitHubActionsGenerator() {
  const [framework, setFramework] = useState(FRAMEWORKS[0]);
  const [triggers, setTriggers] = useState(["push", "pull_request"]);
  const [branches, setBranches] = useState("main");
  const [cron, setCron] = useState("0 6 * * 1");
  const [enableCache, setEnableCache] = useState(true);
  const [enableLint, setEnableLint] = useState(true);
  const [enableBuild, setEnableBuild] = useState(true);
  const [enableTest, setEnableTest] = useState(true);
  const [matrix, setMatrix] = useState(false);
  const [copied, setCopied] = useState(false);

  const yaml = generateYAML({ framework, triggers, branches, cron, enableCache, enableLint, enableBuild, enableTest, matrix });

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTrigger = (id: string) => {
    setTriggers((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">GitHub Actions Workflow Generator</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Pick your stack, get production-ready CI YAML</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Config Panel */}
          <div className="space-y-5">
            {/* Framework */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Framework / Language</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FRAMEWORKS.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setFramework(fw)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                      framework.id === fw.id
                        ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]"
                        : "border-[var(--border-default)] hover:border-[var(--border-hover)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <span>{fw.icon}</span> {fw.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Triggers */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Triggers</h3>
              <div className="space-y-2">
                {TRIGGERS.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggers.includes(t.id)}
                      onChange={() => toggleTrigger(t.id)}
                      className="rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-[var(--brand)]"
                    />
                    <span className="text-[13px]">{t.label}</span>
                  </label>
                ))}
              </div>
              {triggers.includes("schedule") && (
                <input
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 6 * * 1"
                  className="mt-2 w-full px-3 py-1.5 text-[12px] font-mono border border-[var(--border-default)] rounded-lg"
                />
              )}
            </div>

            {/* Options */}
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Options</h3>
              <div className="space-y-2.5">
                <label className="flex items-center justify-between">
                  <span className="text-[13px]">Branches</span>
                  <input value={branches} onChange={(e) => setBranches(e.target.value)} className="w-40 px-2 py-1 text-[12px] border border-[var(--border-default)] rounded" />
                </label>
                {[
                  { label: "Dependency caching", state: enableCache, set: setEnableCache },
                  { label: "Lint step", state: enableLint, set: setEnableLint },
                  { label: "Build step", state: enableBuild, set: setEnableBuild },
                  { label: "Test step", state: enableTest, set: setEnableTest },
                  { label: "Version matrix", state: matrix, set: setMatrix },
                ].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opt.state}
                      onChange={() => opt.set(!opt.state)}
                      className="rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-[var(--brand)]"
                    />
                    <span className="text-[13px]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* YAML Output */}
          <div className="bg-white border border-[var(--border-default)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">.github/workflows/ci.yml</span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[var(--border-default)] rounded-md hover:bg-white transition-colors"
              >
                {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="p-5 text-[12px] font-mono leading-relaxed text-[var(--text-secondary)] overflow-auto max-h-[600px] whitespace-pre">
              {yaml}
            </pre>
          </div>
        </div>

        <ToolCTA feature="Generated your workflow? WarpFix watches it for failures and auto-fixes them — before you even see the red X." />
      </main>
      <ToolFooter />
    </div>
  );
}
