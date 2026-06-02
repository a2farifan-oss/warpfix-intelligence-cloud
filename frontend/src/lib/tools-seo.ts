const BASE_URL = "https://warpfix.org";

export interface ToolSEO {
  title: string;
  description: string;
  keywords: string[];
  path: string;
  schemaType: "SoftwareApplication" | "HowTo" | "Article";
}

export const TOOL_SEO: Record<string, ToolSEO> = {
  "ci-error-decoder": {
    title: "CI Error Decoder — AI-Powered CI Log Analyzer | WarpFix",
    description:
      "Paste your CI log and get instant error analysis. AI decodes GitHub Actions, GitLab CI, CircleCI failures with root cause and fix suggestions. Free, no signup.",
    keywords: [
      "CI error decoder",
      "github actions error",
      "CI log analyzer",
      "github actions failed",
      "process completed with exit code 1",
      "CI failure fix",
      "workflow failed",
      "build failed fix",
      "CI debug tool",
    ],
    path: "/tools/ci-error-decoder",
    schemaType: "SoftwareApplication",
  },
  "github-actions-generator": {
    title: "GitHub Actions Workflow Generator — Free YAML Builder | WarpFix",
    description:
      "Generate production-ready GitHub Actions workflow YAML in seconds. Select your language, framework, and CI steps. Supports Node.js, Python, Go, Rust, and more.",
    keywords: [
      "github actions workflow generator",
      "github actions yaml builder",
      "CI/CD workflow template",
      "github actions template",
      "CI pipeline generator",
      "github workflow builder",
    ],
    path: "/tools/github-actions-generator",
    schemaType: "SoftwareApplication",
  },
  "flaky-test-analyzer": {
    title: "Flaky Test Analyzer — Detect Unreliable CI Tests | WarpFix",
    description:
      "Detect flaky tests in your CI pipeline. Paste test logs from multiple runs to identify inconsistent tests and calculate flakiness scores. Free online tool.",
    keywords: [
      "flaky test detector",
      "test flakiness",
      "flaky test analysis",
      "CI test inconsistent",
      "unreliable tests",
      "test stability",
    ],
    path: "/tools/flaky-test-analyzer",
    schemaType: "SoftwareApplication",
  },
  "ci-cost-calculator": {
    title: "CI/CD Cost Calculator — GitHub Actions Pricing Estimator | WarpFix",
    description:
      "Calculate your CI/CD pipeline costs across GitHub Actions, GitLab CI, and CircleCI. See how much failed builds cost and how WarpFix saves you money.",
    keywords: [
      "CI/CD cost calculator",
      "github actions cost",
      "github actions billing",
      "CI build minutes calculator",
      "github actions pricing",
      "CI pipeline cost",
    ],
    path: "/tools/ci-cost-calculator",
    schemaType: "SoftwareApplication",
  },
  "github-actions-validator": {
    title: "GitHub Actions Validator — Workflow YAML Syntax Checker | WarpFix",
    description:
      "Validate your GitHub Actions workflow YAML online. Checks syntax, detects common mistakes, unpinned actions, deprecated commands, and suggests best practices.",
    keywords: [
      "github actions validator",
      "yaml validator github actions",
      "workflow syntax check",
      "github actions linter",
      "workflow yaml validator",
    ],
    path: "/tools/github-actions-validator",
    schemaType: "SoftwareApplication",
  },
  "cron-builder": {
    title: "Cron Expression Builder — GitHub Actions Schedule Generator | WarpFix",
    description:
      "Build and validate cron expressions for GitHub Actions schedule triggers. Visual editor with presets, real-time preview, and next-run predictions.",
    keywords: [
      "cron expression generator",
      "crontab schedule",
      "cron builder",
      "github actions schedule",
      "cron expression builder",
      "crontab guru alternative",
    ],
    path: "/tools/cron-builder",
    schemaType: "SoftwareApplication",
  },
  "yaml-validator": {
    title: "YAML Validator & Formatter — Online YAML Lint | WarpFix",
    description:
      "Validate and format YAML online. Specialized presets for GitHub Actions, Docker Compose, and Kubernetes configs. Instant error highlighting and formatting.",
    keywords: [
      "yaml validator online",
      "yaml lint",
      "yaml formatter",
      "yaml syntax check",
      "yaml parser online",
      "yaml checker",
    ],
    path: "/tools/yaml-validator",
    schemaType: "SoftwareApplication",
  },
  "dockerfile-linter": {
    title: "Dockerfile Linter & Security Scanner — Best Practices Checker | WarpFix",
    description:
      "Lint your Dockerfile for best practices and security issues. 16-rule audit covering layer optimization, security hardening, and build performance.",
    keywords: [
      "dockerfile linter",
      "dockerfile best practices",
      "docker build error",
      "dockerfile security",
      "docker lint",
      "dockerfile checker",
    ],
    path: "/tools/dockerfile-linter",
    schemaType: "SoftwareApplication",
  },
  "env-generator": {
    title: ".env File Generator — Environment Variables Template Builder | WarpFix",
    description:
      "Generate .env files from templates. Create environment variable configs for Node.js, Python, Docker, and CI/CD pipelines with validation and documentation.",
    keywords: [
      ".env file generator",
      "environment variables template",
      "dotenv generator",
      "env file builder",
      "environment config generator",
    ],
    path: "/tools/env-generator",
    schemaType: "SoftwareApplication",
  },
  "build-time-estimator": {
    title: "Build Time Estimator — CI Pipeline Duration Calculator | WarpFix",
    description:
      "Estimate your CI build times based on stack, dependencies, and configuration. Compare with/without caching and parallel jobs for optimization insights.",
    keywords: [
      "CI build time calculator",
      "build time optimization",
      "CI pipeline duration",
      "build time estimator",
      "github actions build time",
    ],
    path: "/tools/build-time-estimator",
    schemaType: "SoftwareApplication",
  },
  "postmortem-generator": {
    title: "Postmortem Template Generator — Incident Report Builder | WarpFix",
    description:
      "Generate structured incident postmortem documents. Input failure details and get a complete, formatted report with timeline, root cause, and action items.",
    keywords: [
      "incident postmortem template",
      "CI failure postmortem",
      "postmortem generator",
      "incident report template",
      "blameless postmortem",
    ],
    path: "/tools/postmortem-generator",
    schemaType: "SoftwareApplication",
  },
  "ci-health-score": {
    title: "CI Health Score Calculator — Pipeline Reliability Checker | WarpFix",
    description:
      "Calculate your CI pipeline health score. Input failure rate, build time, flaky test count, and get an overall reliability score with improvement recommendations.",
    keywords: [
      "CI health score",
      "pipeline reliability score",
      "CI health calculator",
      "CI/CD reliability",
      "pipeline health check",
    ],
    path: "/tools/ci-health-score",
    schemaType: "SoftwareApplication",
  },
};

export const ERROR_FIX_SLUGS = [
  "exit-code-1",
  "npm-eresolve",
  "eslint-errors",
  "permission-denied",
];

export const ERROR_FIX_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  "exit-code-1": {
    title: "Fix GitHub Actions Exit Code 1 — Root Cause & Solution | WarpFix",
    description:
      "Process completed with exit code 1? Learn the root cause and step-by-step fix. The most common CI failure explained with commands to debug and resolve it.",
    keywords: ["exit code 1", "process completed with exit code 1", "github actions error", "CI failed exit code 1", "workflow exit code 1 fix"],
  },
  "npm-eresolve": {
    title: "Fix npm ERESOLVE Unable to Resolve Dependency Tree | WarpFix",
    description:
      "npm ERR! ERESOLVE unable to resolve dependency tree? Fix peer dependency conflicts with --legacy-peer-deps or npm overrides. Step-by-step CI fix guide.",
    keywords: ["npm ERESOLVE", "unable to resolve dependency tree", "npm peer dependency error", "npm ci ERESOLVE fix", "npm dependency conflict"],
  },
  "eslint-errors": {
    title: "Fix ESLint Errors in CI — Auto-Fix Lint Violations | WarpFix",
    description:
      "ESLint found problems in your CI build? Learn how to auto-fix lint errors, configure rules, and prevent lint failures in GitHub Actions.",
    keywords: ["eslint errors CI", "eslint found problems", "eslint auto fix", "CI lint errors", "github actions eslint"],
  },
  "permission-denied": {
    title: "Fix Permission Denied (publickey) in GitHub Actions | WarpFix",
    description:
      "Permission denied (publickey) in CI? Fix SSH authentication errors in GitHub Actions with deploy keys, PATs, or workflow permissions configuration.",
    keywords: ["permission denied publickey", "github actions SSH error", "CI permission denied fix", "deploy key github actions"],
  },
};

export const GUIDE_SLUGS = ["nextjs-ci", "python-ci", "docker-ci"];

export const GUIDE_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  "nextjs-ci": {
    title: "Next.js CI/CD with GitHub Actions — Complete Setup Guide | WarpFix",
    description:
      "Set up a production-ready CI pipeline for Next.js with GitHub Actions. Includes linting, type checking, testing, build verification, and caching.",
    keywords: ["next.js github actions", "nextjs CI/CD", "next.js CI setup", "nextjs github actions workflow", "next.js build CI"],
  },
  "python-ci": {
    title: "Python CI/CD with GitHub Actions — Complete Setup Guide | WarpFix",
    description:
      "Set up Python CI with GitHub Actions. Covers pytest, linting with flake8/black, type checking with mypy, multi-version matrix testing, and pip caching.",
    keywords: ["python github actions", "python CI/CD", "pytest github actions", "python CI setup", "python workflow github"],
  },
  "docker-ci": {
    title: "Docker CI/CD with GitHub Actions — Build & Push Guide | WarpFix",
    description:
      "Set up Docker CI/CD with GitHub Actions. Multi-stage builds, Docker layer caching, security scanning with Trivy, and pushing to registries.",
    keywords: ["docker github actions", "docker CI/CD", "docker build CI", "docker push github actions", "container CI pipeline"],
  },
};

export const COMPARE_SLUGS = ["github-actions-vs-circleci", "github-actions-vs-jenkins"];

export const COMPARE_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  "github-actions-vs-circleci": {
    title: "GitHub Actions vs CircleCI — 2026 Comparison | WarpFix",
    description:
      "Compare GitHub Actions and CircleCI side-by-side. Pricing, performance, features, ecosystem, and which CI/CD platform is best for your team.",
    keywords: ["github actions vs circleci", "circleci vs github actions", "CI/CD comparison", "best CI platform", "github actions alternative"],
  },
  "github-actions-vs-jenkins": {
    title: "GitHub Actions vs Jenkins — 2026 Comparison | WarpFix",
    description:
      "Compare GitHub Actions and Jenkins for CI/CD. Cloud vs self-hosted, pricing, features, scalability, and migration considerations.",
    keywords: ["github actions vs jenkins", "jenkins vs github actions", "CI/CD comparison 2026", "jenkins alternative", "best CI tool"],
  },
};

export function generateToolSchema(tool: ToolSEO) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.title.split(" — ")[0],
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: `${BASE_URL}${tool.path}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: tool.description,
    provider: {
      "@type": "Organization",
      name: "WarpFix",
      url: BASE_URL,
    },
  };
}

export function generateHowToSchema(title: string, steps: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    step: steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text,
    })),
  };
}

export function generateFAQSchema(questions: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}
