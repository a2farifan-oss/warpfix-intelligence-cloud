"use client";

import { useState } from "react";
import { FileText, Plus, Trash2, Copy, Check, Download } from "lucide-react";
import { ToolHeader, ToolCTA, ToolFooter } from "@/components/tool-layout";

const TEMPLATES: Record<string, { name: string; vars: { key: string; value: string; comment: string }[] }> = {
  nextjs: {
    name: "Next.js",
    vars: [
      { key: "NODE_ENV", value: "development", comment: "Environment" },
      { key: "NEXT_PUBLIC_API_URL", value: "http://localhost:3001", comment: "Public API endpoint" },
      { key: "DATABASE_URL", value: "postgresql://user:password@localhost:5432/mydb", comment: "PostgreSQL connection" },
      { key: "NEXTAUTH_SECRET", value: "", comment: "NextAuth.js secret (generate with: openssl rand -base64 32)" },
      { key: "NEXTAUTH_URL", value: "http://localhost:3000", comment: "NextAuth.js URL" },
    ],
  },
  express: {
    name: "Express.js",
    vars: [
      { key: "PORT", value: "3000", comment: "Server port" },
      { key: "NODE_ENV", value: "development", comment: "Environment" },
      { key: "DATABASE_URL", value: "postgresql://user:password@localhost:5432/mydb", comment: "Database connection" },
      { key: "REDIS_URL", value: "redis://localhost:6379", comment: "Redis connection" },
      { key: "JWT_SECRET", value: "", comment: "JWT signing secret" },
      { key: "CORS_ORIGIN", value: "http://localhost:3000", comment: "Allowed CORS origin" },
    ],
  },
  django: {
    name: "Django",
    vars: [
      { key: "DJANGO_SECRET_KEY", value: "", comment: "Django secret key" },
      { key: "DJANGO_DEBUG", value: "True", comment: "Debug mode" },
      { key: "DJANGO_ALLOWED_HOSTS", value: "localhost,127.0.0.1", comment: "Allowed hosts" },
      { key: "DATABASE_URL", value: "postgresql://user:password@localhost:5432/mydb", comment: "Database" },
      { key: "REDIS_URL", value: "redis://localhost:6379", comment: "Cache/Celery broker" },
    ],
  },
  docker: {
    name: "Docker Compose",
    vars: [
      { key: "POSTGRES_USER", value: "myuser", comment: "PostgreSQL user" },
      { key: "POSTGRES_PASSWORD", value: "mypassword", comment: "PostgreSQL password" },
      { key: "POSTGRES_DB", value: "mydb", comment: "Database name" },
      { key: "REDIS_PASSWORD", value: "", comment: "Redis password (optional)" },
      { key: "APP_PORT", value: "3000", comment: "Application port" },
    ],
  },
  github_actions: {
    name: "GitHub Actions Secrets",
    vars: [
      { key: "AWS_ACCESS_KEY_ID", value: "", comment: "AWS access key" },
      { key: "AWS_SECRET_ACCESS_KEY", value: "", comment: "AWS secret key" },
      { key: "DOCKER_USERNAME", value: "", comment: "Docker Hub username" },
      { key: "DOCKER_PASSWORD", value: "", comment: "Docker Hub password/token" },
      { key: "DEPLOY_KEY", value: "", comment: "SSH deploy key" },
      { key: "SLACK_WEBHOOK_URL", value: "", comment: "Slack notification webhook" },
    ],
  },
};

export default function EnvGenerator() {
  const [vars, setVars] = useState<{ key: string; value: string; comment: string }[]>([
    { key: "", value: "", comment: "" },
  ]);
  const [copied, setCopied] = useState(false);

  const addVar = () => setVars([...vars, { key: "", value: "", comment: "" }]);
  const removeVar = (i: number) => setVars(vars.filter((_, idx) => idx !== i));
  const updateVar = (i: number, field: "key" | "value" | "comment", val: string) => {
    const newVars = [...vars];
    newVars[i] = { ...newVars[i], [field]: val };
    setVars(newVars);
  };

  const loadTemplate = (id: string) => setVars([...TEMPLATES[id].vars]);

  const output = vars
    .filter((v) => v.key.trim())
    .map((v) => {
      const comment = v.comment ? `# ${v.comment}\n` : "";
      return `${comment}${v.key}=${v.value}`;
    })
    .join("\n\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <ToolHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">.env File Generator</h1>
              <p className="text-[13px] text-[var(--text-tertiary)]">Generate environment variable files with templates for popular frameworks</p>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="bg-white border border-[var(--border-default)] rounded-xl p-5 mb-4">
          <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Templates</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TEMPLATES).map(([id, t]) => (
              <button key={id} onClick={() => loadTemplate(id)} className="px-3 py-1.5 text-[12px] border border-[var(--border-default)] rounded-lg hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors">
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Editor */}
          <div className="bg-white border border-[var(--border-default)] rounded-xl p-5">
            <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Variables</h3>
            <div className="space-y-2">
              {vars.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={v.key} onChange={(e) => updateVar(i, "key", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                    placeholder="KEY" className="w-1/3 px-2 py-1.5 text-[12px] font-mono border border-[var(--border-default)] rounded bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]" />
                  <input value={v.value} onChange={(e) => updateVar(i, "value", e.target.value)}
                    placeholder="value" className="flex-1 px-2 py-1.5 text-[12px] font-mono border border-[var(--border-default)] rounded bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]" />
                  <input value={v.comment} onChange={(e) => updateVar(i, "comment", e.target.value)}
                    placeholder="comment" className="w-1/4 px-2 py-1.5 text-[11px] border border-[var(--border-default)] rounded bg-[var(--bg-secondary)] focus:outline-none focus:border-[var(--brand)]" />
                  <button onClick={() => removeVar(i)} className="p-1 text-[var(--text-tertiary)] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button onClick={addVar} className="mt-3 flex items-center gap-1 text-[12px] text-[var(--brand)] hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add variable
            </button>
          </div>

          {/* Output */}
          <div className="bg-white border border-[var(--border-default)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">.env</span>
              <div className="flex items-center gap-2">
                <button onClick={handleDownload} className="text-[11px] flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                  <Download className="w-3 h-3" /> Download
                </button>
                <button onClick={handleCopy} className="text-[11px] flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                  {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </div>
            <pre className="p-5 text-[12px] font-mono text-[var(--text-secondary)] overflow-auto max-h-96 whitespace-pre">{output || "# Add variables to generate .env file"}</pre>
          </div>
        </div>

        <ToolCTA feature="Secrets misconfigured? That's one of the top CI failure causes. WarpFix detects and auto-fixes environment variable issues." />
      </main>
      <ToolFooter />
    </div>
  );
}
