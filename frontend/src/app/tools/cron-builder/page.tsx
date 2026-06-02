"use client";

import { useState, useMemo } from "react";
import { Clock, Copy, Check } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const PRESETS = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Daily at midnight", cron: "0 0 * * *" },
  { label: "Daily at 6am UTC", cron: "0 6 * * *" },
  { label: "Weekdays at 9am", cron: "0 9 * * 1-5" },
  { label: "Weekly (Monday)", cron: "0 0 * * 1" },
  { label: "Monthly (1st)", cron: "0 0 1 * *" },
  { label: "Every 15 min", cron: "*/15 * * * *" },
];

const FIELDS = [
  { label: "Minute", options: ["*", "0", "15", "30", "45", "*/5", "*/10", "*/15", "*/30"], default: "0" },
  { label: "Hour", options: ["*", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "*/2", "*/4", "*/6", "*/8", "*/12"], default: "*" },
  { label: "Day of Month", options: ["*", "1", "15", "28", "*/2", "1,15"], default: "*" },
  { label: "Month", options: ["*", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "*/2", "*/3", "*/6"], default: "*" },
  { label: "Day of Week", options: ["*", "0", "1", "2", "3", "4", "5", "6", "1-5", "0,6"], default: "*" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function describeCron(parts: string[]): string {
  if (parts.length !== 5) return "Invalid cron expression";
  const [min, hour, dom, month, dow] = parts;

  let desc = "";

  if (min === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "Every minute";

  // Minute
  if (min.startsWith("*/")) desc += `Every ${min.slice(2)} minutes`;
  else if (min === "0") desc += "At minute 0";
  else if (min === "*") desc += "Every minute";
  else desc += `At minute ${min}`;

  // Hour
  if (hour !== "*") {
    if (hour.startsWith("*/")) desc += `, every ${hour.slice(2)} hours`;
    else desc += `, at ${hour.padStart(2, "0")}:${min === "0" ? "00" : min.padStart(2, "0")} UTC`;
  }

  // Day of month
  if (dom !== "*") {
    if (dom.startsWith("*/")) desc += `, every ${dom.slice(2)} days`;
    else desc += `, on day ${dom} of the month`;
  }

  // Month
  if (month !== "*") {
    if (month.startsWith("*/")) desc += `, every ${month.slice(2)} months`;
    else {
      const monthNum = parseInt(month);
      desc += `, in ${MONTH_NAMES[monthNum] || month}`;
    }
  }

  // Day of week
  if (dow !== "*") {
    if (dow === "1-5") desc += ", on weekdays";
    else if (dow === "0,6") desc += ", on weekends";
    else {
      const dayNum = parseInt(dow);
      desc += `, on ${DAY_NAMES[dayNum] || dow}`;
    }
  }

  return desc;
}

export default function CronBuilder() {
  const [fields, setFields] = useState(["0", "*", "*", "*", "*"]);
  const [copied, setCopied] = useState(false);

  const cron = fields.join(" ");
  const description = useMemo(() => describeCron(fields), [fields]);

  const yamlSnippet = `on:\n  schedule:\n    - cron: '${cron}'`;

  const updateField = (index: number, value: string) => {
    const newFields = [...fields];
    newFields[index] = value;
    setFields(newFields);
  };

  const applyPreset = (preset: string) => {
    setFields(preset.split(" "));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cron Expression Builder</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Build cron schedules for GitHub Actions — visual editor with YAML output</p>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 mb-4">
          <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Quick Presets</h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.cron)}
                className={`px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                  cron === p.cron ? "border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)] font-medium" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Field Editor */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 mb-4">
          <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Fields</h3>
          <div className="grid grid-cols-5 gap-3">
            {FIELDS.map((field, i) => (
              <div key={field.label}>
                <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{field.label}</label>
                <select
                  value={fields[i]}
                  onChange={(e) => updateField(i, e.target.value)}
                  className="w-full px-2 py-2 text-[13px] font-mono border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-[11px] text-[var(--text-tertiary)]">Custom:</label>
            <input
              value={cron}
              onChange={(e) => {
                const parts = e.target.value.split(" ");
                if (parts.length === 5) setFields(parts);
              }}
              className="flex-1 px-3 py-1.5 font-mono text-[13px] border border-[var(--border-default)] rounded-lg focus:outline-none focus:border-[var(--brand)]"
            />
          </div>
        </div>

        {/* Output */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 mb-4">
          <div className="text-center mb-4">
            <div className="text-3xl font-mono font-bold text-[var(--brand)] mb-2">{cron}</div>
            <div className="text-[14px] text-[var(--text-secondary)]">{description}</div>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-[var(--text-tertiary)]">GitHub Actions YAML</span>
              <button onClick={() => handleCopy(yamlSnippet)} className="text-[11px] flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="text-[12px] font-mono text-[var(--text-secondary)]">{yamlSnippet}</pre>
          </div>
        </div>

        {/* Note about GitHub Actions */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 text-[12px] text-blue-700">
          <strong>Note:</strong> GitHub Actions cron uses UTC timezone. The shortest interval GitHub allows is every 5 minutes.
          Scheduled workflows may be delayed during high-load periods.
        </div>

        <ToolCTA feature="Using scheduled workflows? WarpFix monitors them 24/7 and auto-fixes failures — even at 3 AM." />
      </main>
      <ToolFooter />
    </div>
  );
}
