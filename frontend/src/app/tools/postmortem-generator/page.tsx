"use client";

import { useState } from "react";
import { FileSearch, Copy, Check, Download } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

export default function PostmortemGenerator() {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("P2");
  const [detected, setDetected] = useState("");
  const [resolved, setResolved] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [impact, setImpact] = useState("");
  const [timeline, setTimeline] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [copied, setCopied] = useState(false);

  const report = `# Incident Postmortem: ${title || "[Incident Title]"}

**Severity:** ${severity}
**Date:** ${new Date().toISOString().split("T")[0]}
**Author:** [Your Name]
**Status:** Resolved

---

## Summary

${title || "[Brief description of the incident]"}

## Detection

**Detected at:** ${detected || "[When was it detected?]"}
**Detected by:** ${detected ? "CI Pipeline / Monitoring" : "[How was it detected?]"}

## Resolution

**Resolved at:** ${resolved || "[When was it resolved?]"}
**Time to resolution:** ${detected && resolved ? "See timeline" : "[Duration]"}

## Impact

${impact || "- [Number of affected users/systems]\n- [Duration of impact]\n- [Business impact]"}

## Root Cause

${rootCause || "[What was the underlying cause?]"}

## Timeline

${timeline || `| Time | Event |
|------|-------|
| ${detected || "HH:MM"} | Incident detected |
| | Investigation started |
| | Root cause identified |
| ${resolved || "HH:MM"} | Fix deployed |
| | Incident resolved |`}

## Action Items

${actionItems || `| Action | Owner | Priority | Due Date |
|--------|-------|----------|----------|
| [Preventive measure 1] | [Team] | High | [Date] |
| [Monitoring improvement] | [Team] | Medium | [Date] |
| [Process change] | [Team] | Low | [Date] |`}

## Lessons Learned

1. What went well?
   - [What worked during incident response]

2. What went wrong?
   - [What could have been better]

3. Where did we get lucky?
   - [Any factors that limited the blast radius]

---

*This postmortem follows the blameless postmortem methodology. The goal is to learn and improve, not to assign blame.*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `postmortem-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <FileSearch className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Postmortem Template Generator</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Generate structured incident postmortem reports for CI failures</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Incident Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Production deploy blocked by flaky tests"
                  className="w-full px-3 py-2 text-[13px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Severity</label>
                <div className="flex gap-2">
                  {["P1", "P2", "P3", "P4"].map((s) => (
                    <button key={s} onClick={() => setSeverity(s)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-all ${severity === s ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Detected at</label>
                  <input type="datetime-local" value={detected} onChange={(e) => setDetected(e.target.value)} className="w-full px-3 py-2 text-[12px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Resolved at</label>
                  <input type="datetime-local" value={resolved} onChange={(e) => setResolved(e.target.value)} className="w-full px-3 py-2 text-[12px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Root Cause</label>
                <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={3} placeholder="What was the underlying cause?"
                  className="w-full px-3 py-2 text-[13px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] resize-y focus:outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Impact</label>
                <textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} placeholder="Who/what was affected?"
                  className="w-full px-3 py-2 text-[13px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] resize-y focus:outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Action Items</label>
                <textarea value={actionItems} onChange={(e) => setActionItems(e.target.value)} rows={3} placeholder="What actions will prevent recurrence?"
                  className="w-full px-3 py-2 text-[13px] border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] resize-y focus:outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white border border-[var(--border-default)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">postmortem.md</span>
              <div className="flex items-center gap-2">
                <button onClick={handleDownload} className="text-[11px] flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                  <Download className="w-3 h-3" /> Download
                </button>
                <button onClick={handleCopy} className="text-[11px] flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                  {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </div>
            <pre className="p-5 text-[11px] font-mono text-[var(--text-secondary)] overflow-auto max-h-[600px] whitespace-pre-wrap leading-relaxed">{report}</pre>
          </div>
        </div>

        <ToolCTA feature="WarpFix Autopsy Reports generate incident analysis automatically for every CI failure — no manual writing needed." />
      </main>
      <ToolFooter />
    </div>
  );
}
