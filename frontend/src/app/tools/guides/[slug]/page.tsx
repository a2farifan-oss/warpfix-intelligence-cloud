"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, BookOpen, AlertTriangle, Lightbulb } from "lucide-react";
import { useState } from "react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const GUIDE_DATA: Record<string, { title: string; icon: string; description: string; yaml: string; steps: string[]; pitfalls: string[]; tips: string[] }> = {
  "nextjs-ci": {
    title: "Next.js CI/CD with GitHub Actions",
    icon: "▲",
    description: "Set up a production-ready CI pipeline for your Next.js app. Includes linting, type checking, testing, and build verification.",
    yaml: `name: Next.js CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Test
        run: npm test -- --ci --coverage`,
    steps: [
      "Create the workflow file at .github/workflows/ci.yml in your repository",
      "The workflow triggers on push to main and on all pull requests",
      "It uses Node.js 20 with npm caching for faster installs",
      "Four verification steps: lint → typecheck → build → test (in order)",
      "If any step fails, the workflow stops and reports the error",
    ],
    pitfalls: [
      "Missing next.config.js — build will fail if your config has syntax errors",
      "Environment variables — if your build needs .env vars, add them to GitHub Secrets and reference them",
      "Image optimization — set 'images.unoptimized: true' for static exports or configure your image loader",
      "API routes with database — add a PostgreSQL service container if your tests need a database",
    ],
    tips: [
      "Add 'cache: npm' to setup-node for 30-40% faster installs",
      "Run typecheck BEFORE build — it's faster and catches errors earlier",
      "Use 'npm test -- --ci' flag for non-interactive test runs in CI",
      "Add Vercel/Netlify preview deploy action for PR previews",
    ],
  },
  "python-ci": {
    title: "Python CI/CD with GitHub Actions",
    icon: "🐍",
    description: "Set up CI for Python projects with pytest, Ruff linting, and pip caching.",
    yaml: `name: Python CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
          cache: pip

      - run: pip install -r requirements.txt

      - name: Lint with Ruff
        run: |
          pip install ruff
          ruff check .

      - name: Test with pytest
        run: |
          pip install pytest pytest-cov
          pytest --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml`,
    steps: [
      "Create .github/workflows/ci.yml with the workflow above",
      "Tests run against Python 3.11 and 3.12 in a matrix",
      "Pip packages are cached for faster subsequent runs",
      "Ruff lints your code (fast alternative to flake8 + isort + pyupgrade)",
      "pytest runs with coverage reporting, uploaded to Codecov",
    ],
    pitfalls: [
      "Missing requirements.txt — use 'pip freeze > requirements.txt' or use pyproject.toml with pip install .",
      "Python version mismatch — use the matrix to test against multiple versions",
      "Virtual environments — CI runners don't need venvs, install directly",
    ],
    tips: [
      "Use Ruff instead of flake8 — it's 10-100x faster and replaces multiple tools",
      "Add 'cache: pip' to setup-python for faster installs",
      "Use pytest-xdist for parallel test execution: 'pytest -n auto'",
    ],
  },
  "docker-ci": {
    title: "Docker Build & Push with GitHub Actions",
    icon: "🐳",
    description: "Build multi-stage Docker images and push to GitHub Container Registry with caching.",
    yaml: `name: Docker Build

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: \${{ github.event_name != 'pull_request' }}
          tags: ghcr.io/\${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max`,
    steps: [
      "Uses Docker Buildx for multi-platform and cached builds",
      "Authenticates with GitHub Container Registry using GITHUB_TOKEN",
      "Builds on every push and PR, but only pushes images on main/tags",
      "GitHub Actions cache is used for Docker layer caching (fast rebuilds)",
      "Images are tagged with 'latest' — add version tags for releases",
    ],
    pitfalls: [
      "Missing 'permissions: packages: write' — push will fail without it",
      "Large build context — add .dockerignore to exclude node_modules, .git, etc.",
      "Multi-stage builds — make sure COPY --from references the correct stage",
    ],
    tips: [
      "Use 'cache-from: type=gha' for built-in GitHub Actions Docker caching",
      "Add Hadolint step before build to lint your Dockerfile",
      "Use multi-stage builds to keep final image size small",
    ],
  },
};

export default function GuidePage() {
  const params = useParams();
  const slug = params.slug as string;
  const guide = GUIDE_DATA[slug];
  const [copied, setCopied] = useState(false);

  if (!guide) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <ToolHeader />
        <main className="max-w-4xl mx-auto px-6 py-20 text-center">
          <BookOpen className="w-12 h-12 text-teal-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Guide Coming Soon</h1>
          <p className="text-[var(--text-secondary)] text-[14px] mb-6">This framework guide is being written. Check back soon!</p>
          <Link href="/tools/guides" className="px-4 py-2 text-[13px] border border-[var(--border-default)] rounded-lg hover:bg-white transition-colors">Browse All Guides</Link>
        </main>
        <ToolFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/tools/guides" className="inline-flex items-center gap-1 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--brand)] mb-4 transition-colors">
          <ArrowLeft className="w-3 h-3" /> All Guides
        </Link>

        <div className="bg-white border border-[var(--border-default)] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{guide.icon}</span>
            <h1 className="text-2xl font-bold tracking-tight">{guide.title}</h1>
          </div>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{guide.description}</p>
        </div>

        {/* Workflow YAML */}
        <div className="bg-[var(--bg-inverse)] rounded-xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
            <span className="text-[12px] font-medium text-neutral-400">.github/workflows/ci.yml</span>
            <button onClick={() => { navigator.clipboard.writeText(guide.yaml); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="text-[11px] flex items-center gap-1 text-neutral-500 hover:text-neutral-300">
              {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
          <pre className="p-5 text-[12px] font-mono text-neutral-300 overflow-auto max-h-96 whitespace-pre">{guide.yaml}</pre>
        </div>

        {/* Steps */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 mb-4">
          <h3 className="text-[14px] font-semibold mb-3">Setup Steps</h3>
          <ol className="space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--brand-muted)] text-[var(--brand)] flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Pitfalls */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-amber-800 mb-2">
            <AlertTriangle className="w-4 h-4" /> Common Pitfalls
          </div>
          <ul className="space-y-1.5">
            {guide.pitfalls.map((p, i) => (
              <li key={i} className="text-[12px] text-amber-700 flex items-start gap-1.5">
                <span className="shrink-0 mt-1">•</span> {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-blue-800 mb-2">
            <Lightbulb className="w-4 h-4" /> Pro Tips
          </div>
          <ul className="space-y-1.5">
            {guide.tips.map((t, i) => (
              <li key={i} className="text-[12px] text-blue-700 flex items-start gap-1.5">
                <span className="shrink-0 mt-1">•</span> {t}
              </li>
            ))}
          </ul>
        </div>

        <ToolCTA feature="CI setup done? WarpFix watches your pipeline 24/7 and auto-fixes failures — so you can ship faster." />
      </main>
      <ToolFooter />
    </div>
  );
}
