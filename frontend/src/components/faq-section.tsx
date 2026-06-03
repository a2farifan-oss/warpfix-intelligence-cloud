"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How does WarpFix detect CI failures?",
    a: "WarpFix integrates as a GitHub App. When a workflow run fails, GitHub sends a webhook to WarpFix, which immediately begins analyzing the failure logs.",
  },
  {
    q: "Is my code safe?",
    a: "WarpFix only reads logs and file contents needed for repair. All patches are validated in isolated sandbox containers. The GitHub App requires minimal permissions (read metadata, write contents and PRs, read actions/checks).",
  },
  {
    q: "What types of errors can WarpFix fix?",
    a: "Build errors, test failures, lint errors, type errors, dependency issues, runtime crashes, and configuration problems. The multi-agent pipeline classifies and routes each error to the appropriate repair strategy.",
  },
  {
    q: "How does fingerprint learning work?",
    a: "Each error is normalized (removing file paths, timestamps, hashes) and hashed into a fingerprint. When the same pattern appears, the proven fix is reused instantly with high confidence.",
  },
  {
    q: "What LLM powers the repairs?",
    a: "WarpFix uses Groq (Llama 3.3) for intelligent log parsing, error classification, and patch generation, with GitHub Models as an automatic fallback. Quick pattern matching handles common errors without LLM calls.",
  },
  {
    q: "How do I use the WarpFix CLI?",
    a: "Install with npx warpfix or npm i -g warpfix. Then run warpfix login to authenticate. Commands: warpfix doctor, warpfix fix-ci, warpfix fix-tests, warpfix fix-deps. Works in any terminal — no special setup required.",
  },
  {
    q: "What happens if a patch has low confidence?",
    a: "Patches scoring below 40 are flagged for manual review and not automatically opened as PRs. Patches between 40-70 are opened as PRs with 'review suggested' labels.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">{faq.q}</span>
              <span className="text-muted-foreground ml-4 shrink-0">
                {openIndex === i ? "−" : "+"}
              </span>
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 text-sm text-muted-foreground">{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
