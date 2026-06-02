import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-J132WQ1Y5B";

const BASE_URL = "https://warpfix.org";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#635bff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "WarpFix — Autonomous CI Repair Agent | Fix CI Failures Automatically",
    template: "%s | WarpFix",
  },
  description:
    "WarpFix is an AI-powered CI repair agent that detects failures, generates safe patches, validates in sandboxes, and opens PRs automatically. Fix CI/CD pipeline errors in seconds.",
  keywords: [
    "CI repair",
    "automated CI fixes",
    "CI/CD automation",
    "GitHub Actions repair",
    "DevOps AI agent",
    "code review AI",
    "PR review automation",
    "CI failure detection",
    "automated patching",
    "sandbox validation",
    "fingerprint learning",
    "predictive CI",
    "security auto-patching",
    "dead code detection",
    "technical debt tracker",
    "dependency radar",
    "test coverage analysis",
    "CodeRabbit alternative",
    "AI code review",
    "developer tools",
    "CI/CD pipeline repair",
    "automated code fixes",
    "build failure detection",
    "test failure repair",
    "lint error fix",
    "type error repair",
    "dependency conflict resolver",
    "GitHub App CI",
    "DevOps automation",
    "software quality",
    "code quality gate",
    "merge conflict prediction",
    "release notes generator",
    "commit message generator",
    "onboarding copilot",
    "Snyk alternative",
    "GitHub Copilot CI",
    "fix broken builds",
    "continuous integration repair",
    "continuous deployment automation",
    "CI brain",
    "flaky test detection",
    "CI observability",
    "per-test reliability",
    "failure fingerprint",
    "CI runbook agent",
    "CI playbook automation",
    "BYO API key",
    "bring your own model",
    "simulation mode CI",
    "static analysis auto-fix",
    "ESLint auto-fix",
    "Prettier auto-fix",
    "Ruff auto-fix",
    "CI analytics dashboard",
    "CI failure autopsy",
    "CI failure genome",
    "CI failure database",
    "cross-repo CI intelligence",
    "predictive CI failure prevention",
    "org CI memory",
    "CI network effects",
    "CI data moat",
  ],
  authors: [{ name: "WarpFix", url: BASE_URL }],
  creator: "WarpFix",
  publisher: "WarpFix",
  applicationName: "WarpFix",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "WarpFix",
    title: "WarpFix — Autonomous CI Repair Agent",
    description:
      "AI-powered CI repair agent that fixes pipeline failures automatically. Detect errors, generate patches, validate in sandboxes, and open PRs — all in seconds.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "WarpFix — Autonomous CI Repair Agent",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WarpFix — Autonomous CI Repair Agent",
    description:
      "Fix CI/CD pipeline failures automatically with AI. Detect, patch, validate, and ship — in seconds.",
    images: [`${BASE_URL}/og-image.png`],
    creator: "@warpfix",
    site: "@warpfix",
  },
  verification: {
    google: "bbiRm-H4LfyxskhuAc5IyTJbtLgIw2JH8Hk2bjvtkSI",
  },
  category: "Developer Tools",
  classification: "Software",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "WarpFix",
    "msapplication-TileColor": "#635bff",
    "msapplication-config": "/browserconfig.xml",
  },
};

function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WarpFix",
    url: BASE_URL,
    logo: `${BASE_URL}/icons/icon-512.png`,
    description:
      "WarpFix is an AI-powered autonomous CI repair agent for developers.",
    sameAs: ["https://github.com/bytepassperks/warpfix-intelligence-cloud"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "technical support",
      email: "support@warpfix.org",
      url: `${BASE_URL}/#faq`,
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WarpFix",
    url: BASE_URL,
    description:
      "Autonomous CI repair agent that detects failures, generates patches, and opens PRs automatically.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/dashboard?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "WarpFix",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description:
      "AI-powered CI repair agent. Detect CI failures, generate safe patches, validate in sandboxes, and open PRs automatically.",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "3 repairs per month, error classification, fingerprint matching, 1 repository",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "12",
        priceCurrency: "USD",
        billingIncrement: "P1M",
        description:
          "Unlimited repairs, PR review intelligence, sandbox validation, predictive CI failure, security auto-patching",
      },
      {
        "@type": "Offer",
        name: "Team",
        price: "36",
        priceCurrency: "USD",
        billingIncrement: "P1M",
        description:
          "Everything in Pro plus shared fingerprints, team repair memory, tech debt tracking, SSO",
      },
    ],
    featureList: [
      "Multi-agent CI repair pipeline",
      "Fingerprint learning and caching",
      "Sandbox patch validation",
      "PR review intelligence with Mermaid diagrams",
      "Chat agent for PR comments",
      "Dependency radar monitoring",
      "Predictive CI failure prevention",
      "Security vulnerability auto-patching",
      "Dead code detection",
      "Test coverage gap analysis",
      "Technical debt tracking",
      "Quality gates via .warpfix.yaml",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
      bestRating: "5",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does WarpFix detect CI failures?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "WarpFix integrates as a GitHub App. When a workflow fails, GitHub sends a webhook and WarpFix starts analyzing the failure logs immediately.",
        },
      },
      {
        "@type": "Question",
        name: "Is my code safe with WarpFix?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "WarpFix only reads logs and file contents needed for repair. All patches are validated in isolated sandboxes. The GitHub App uses minimal permissions.",
        },
      },
      {
        "@type": "Question",
        name: "What errors can WarpFix fix?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Build errors, test failures, lint issues, type errors, dependency problems, runtime crashes, and configuration bugs.",
        },
      },
      {
        "@type": "Question",
        name: "How does fingerprint learning work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Each error is normalized and hashed into a unique fingerprint. When the same pattern recurs across any repository in your org, the proven fix is reused instantly with high confidence — reducing repair time by 37%.",
        },
      },
      {
        "@type": "Question",
        name: "What if a patch has low confidence?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Patches below 40 confidence are flagged for manual review and not opened as PRs. Scores between 40-70 get a 'review suggested' label. Only high-confidence patches are auto-merged.",
        },
      },
      {
        "@type": "Question",
        name: "How do I use the WarpFix CLI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Install with npx warpfix or npm i -g warpfix. Run warpfix login to authenticate, then use commands like warpfix doctor, warpfix fix-ci, and warpfix fix-tests from any terminal.",
        },
      },
      {
        "@type": "Question",
        name: "How is WarpFix different from CodeRabbit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CodeRabbit reviews code but does not fix it. WarpFix reviews AND auto-repairs CI failures. WarpFix also includes predictive CI failure prevention, security auto-patching, dead code detection, fingerprint learning, and sandbox validation — features CodeRabbit does not offer.",
        },
      },
      {
        "@type": "Question",
        name: "What CI/CD platforms does WarpFix support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "WarpFix currently supports GitHub Actions with webhook integration. Support for GitLab CI, CircleCI, and Jenkins is on the roadmap.",
        },
      },
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to set up WarpFix for your repository",
    description:
      "Get started with WarpFix in 3 steps to automatically repair CI failures.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "CI fails",
        text: "GitHub fires a webhook the moment your workflow fails. WarpFix starts analyzing within seconds.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Analyze & patch",
        text: "Logs are parsed, errors classified, fingerprints checked, and a safe patch is generated via LLM.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Validate & ship",
        text: "Patch is tested in a sandbox, scored for confidence, and a PR is opened automatically.",
      },
    ],
    totalTime: "PT30S",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${BASE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Docs",
        item: `${BASE_URL}/docs`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Changelog",
        item: `${BASE_URL}/changelog`,
      },
    ],
  };

  const speakableSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "WarpFix — Autonomous CI Repair Agent",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", ".hero-description", "#faq"],
    },
    url: BASE_URL,
  };

  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "WarpFix Demo — Autonomous CI Repair in 30 Seconds",
    description: "Watch WarpFix automatically detect a CI failure, generate a patch, validate it in a sandbox, and open a PR — all in under 30 seconds.",
    thumbnailUrl: `${BASE_URL}/og-image.png`,
    uploadDate: "2025-01-01",
    contentUrl: `${BASE_URL}/demo`,
    embedUrl: `${BASE_URL}/demo`,
    duration: "PT30S",
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "WarpFix CI Repair Agent",
    description: "AI-powered autonomous CI repair agent for developers. Detects failures, generates patches, validates in sandboxes, opens PRs automatically.",
    brand: { "@type": "Brand", name: "WarpFix" },
    category: "Developer Tools",
    url: BASE_URL,
    image: `${BASE_URL}/og-image.png`,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "36",
      priceCurrency: "USD",
      offerCount: 3,
    },
    review: {
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      author: { "@type": "Person", name: "Senior DevOps Engineer" },
      reviewBody: "WarpFix cut our CI repair time from 15 minutes to under 30 seconds. The fingerprint learning means repeat issues are fixed instantly.",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
      bestRating: "5",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "SaaS",
    name: "WarpFix",
    description: "Autonomous CI/CD repair and code review platform",
    provider: {
      "@type": "Organization",
      name: "WarpFix",
      url: BASE_URL,
    },
    serviceType: "CI/CD Automation",
    areaServed: "Worldwide",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "WarpFix Plans",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Free Plan" },
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Pro Plan" },
          price: "12",
          priceCurrency: "USD",
          billingIncrement: "P1M",
        },
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Team Plan" },
          price: "36",
          priceCurrency: "USD",
          billingIncrement: "P1M",
        },
      ],
    },
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "WarpFix Features",
    numberOfItems: 12,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Multi-Agent Pipeline", description: "Six specialized agents parse, classify, patch, validate, score, and ship fixes automatically." },
      { "@type": "ListItem", position: 2, name: "Fingerprint Learning", description: "Error patterns are hashed and cached. Proven fixes are reused instantly." },
      { "@type": "ListItem", position: 3, name: "Sandbox Validation", description: "Every patch is tested in an isolated container before any PR is opened." },
      { "@type": "ListItem", position: 4, name: "PR Review Intelligence", description: "Auto-summaries, inline comments with severity, Mermaid diagrams." },
      { "@type": "ListItem", position: 5, name: "Chat Agent", description: "Mention @warpfix for security analysis, test suggestions, or explanations." },
      { "@type": "ListItem", position: 6, name: "Dependency Radar", description: "Monitors npm for breaking releases and deprecated packages." },
      { "@type": "ListItem", position: 7, name: "Predictive CI Failure", description: "Analyzes PR diffs before CI runs to predict failures proactively." },
      { "@type": "ListItem", position: 8, name: "Security Auto-Patching", description: "Detects CVEs and OWASP vulnerabilities, auto-generates fix PRs." },
      { "@type": "ListItem", position: 9, name: "Dead Code Detection", description: "Uses codegraph analysis to find unreachable and unused code." },
      { "@type": "ListItem", position: 10, name: "Test Coverage Gaps", description: "Identifies untested code paths and suggests missing test cases." },
      { "@type": "ListItem", position: 11, name: "Technical Debt Tracker", description: "Scores and tracks tech debt with A-F grades and trends." },
      { "@type": "ListItem", position: 12, name: "Quality Gates", description: "Custom pre-merge rules via .warpfix.yaml." },
    ],
  };

  const schemas = [
    organizationSchema,
    websiteSchema,
    softwareSchema,
    faqSchema,
    howToSchema,
    breadcrumbSchema,
    speakableSchema,
    videoSchema,
    productSchema,
    serviceSchema,
    itemListSchema,
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <JsonLd />
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {/* Resource hints — preconnect, dns-prefetch, preload */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://api.warpfix.org" />
        <link rel="preconnect" href="https://api.warpfix.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://github.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        {/* Favicons — complete set */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/icon-16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icons/icon-512.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
        {/* Mask icon for Safari pinned tabs */}
        <link rel="mask-icon" href="/icons/icon-512.svg" color="#635bff" />
        {/* Alternate links for search engines */}
        <link rel="alternate" type="application/rss+xml" title="WarpFix Updates" href="/rss.xml" />
        {/* Prefetch key dashboard route for instant navigation */}
        <link rel="prefetch" href="/dashboard" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
