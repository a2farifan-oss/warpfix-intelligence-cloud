const { logger } = require('../utils/logger');
const { callLLM } = require('../services/llm');
const { getFewShotBlock } = require('./retrieval');

const PATCH_SAFETY_RULES = {
  maxDiffLines: 200,
  maxFilesChanged: 8,
  // Genuinely dangerous content. These are intentionally narrow: reading config
  // via process.env, or having a variable/comment that merely contains the word
  // "secret"/"env", is normal in real source files and must NOT be blocked —
  // otherwise every legitimate repair is rejected. We only block destructive
  // shell/SQL and hardcoded credential LITERALS.
  forbiddenPatterns: [
    /\brm\s+-rf\b/i,
    /\bDROP\s+(?:TABLE|DATABASE)\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    // A real secret hardcoded as a quoted literal assigned to a secret-named key
    // (e.g. apiKey = "AKIA....."). Does not match process.env.X reads.
    /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
  ],
  // Paths the repair must never write. Matched against file paths only.
  forbiddenFileChanges: [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ],
};

// Path-based rules: env files, CI workflow files, and test files are off-limits.
const FORBIDDEN_PATH = /(^|\/)\.env(\.|$)|(^|\/)\.github\/workflows\//i;
const TEST_PATH = /(^|\/)(tests?|__tests__|__mocks__|spec)\/|\.(test|spec)\.\w+$|(^|\/)test\.\w+$/i;

async function generatePatch({ logData, classification, repository, context, installation_id, workflow_run }) {
  // The bug lives on the branch/commit whose CI failed, NOT necessarily the
  // default branch. Read (and later patch) the failing ref so the LLM sees the
  // actual broken code instead of an already-correct default branch.
  const ref = workflow_run?.head_sha || workflow_run?.head_branch
    || repository?.default_branch || 'main';
  logger.info('Generating patch', { type: classification.type, repo: repository?.full_name, ref });

  // Fetch source files from GitHub for accurate patching.
  let sourceFiles = {};
  const knownFiles = new Set();
  if (installation_id && repository) {
    const affected = (logData.affectedFiles || []).filter(Boolean);
    // Affected files (from the stack trace) come FIRST — they almost always hold
    // the bug. Repo-tree files only pad context when few/no files are known.
    // Sending fewer, more-relevant files is the single biggest token saving:
    // it avoids shipping ~5 arbitrary source files on every repair.
    const filesToFetch = [...affected];
    const repoSrcFiles = await fetchRepoSourceTree(repository, installation_id, ref);
    for (const f of repoSrcFiles) {
      knownFiles.add(f);
      if (!filesToFetch.includes(f)) filesToFetch.push(f);
    }
    for (const f of affected) knownFiles.add(f);
    // When we already know the affected file(s) we don't need to pad with as
    // much repo context. Override both via env (PATCH_MAX_FILES / its narrower
    // affected-only variant) if a repo needs more.
    const maxFiles = parseInt(process.env.PATCH_MAX_FILES, 10) || 4;
    const fetchCount = affected.length > 0
      ? Math.min(maxFiles, Math.max(affected.length, parseInt(process.env.PATCH_MAX_FILES_AFFECTED, 10) || 2))
      : maxFiles;
    sourceFiles = await fetchSourceFiles(filesToFetch.slice(0, fetchCount), repository, installation_id, ref, fetchCount);
    for (const f of Object.keys(sourceFiles)) knownFiles.add(f);
    logger.info('Fetched source files', { count: Object.keys(sourceFiles).length, files: Object.keys(sourceFiles), ref });
  }

  let prompt = buildPatchPrompt(logData, classification, context, sourceFiles);

  // Retrieval-augmented few-shot: prepend similar, previously-verified fixes so
  // the model learns conventions it can't infer from the error alone. Gated and
  // capped; on failure it returns '' and we proceed exactly as before.
  const fewShot = getFewShotBlock({
    errorMessage: logData.errorMessage,
    description: classification.suggestedApproach || logData.rootCause || '',
    category: classification.type,
  });
  if (fewShot) prompt = `${fewShot}\n${prompt}`;

  const result = await callLLM({
    system: `You are an expert CI repair agent. Analyze the error and fix the SOURCE code (not the tests).

Output your fix in this EXACT format for each file you need to change:
===FILE: path/to/file.js===
(complete new file content here)
===END_FILE===

Rules:
- FIX THE SOURCE CODE, not the test files. Tests are correct; the source has the bug
- Output the COMPLETE new file content (not a diff), with the fix applied
- Keep changes minimal and focused - only change the buggy line(s)
- Never modify lockfiles, workflow files (.github/workflows/), .env files, or test files
- Never add console.log or debug statements
- Never create new files - only modify existing source files
- Include ALL original file content, only changing what's needed to fix the error
- Fix the ROOT CAUSE, not just the failing assertion (e.g. if a parser returns the wrong type, fix it at the source so every downstream operation is correct)
- You MUST output at least one ===FILE: ...=== / ===END_FILE=== block
- The reference files below are wrapped in >>>>> BEGIN ... <<<<< delimiters; that is INPUT formatting only. Do NOT copy that style. Your output MUST use ===FILE: path=== / ===END_FILE===
- Do NOT wrap the file blocks in markdown code fences`,
    user: prompt,
    // The completion only needs to hold the rewritten source file(s). 8000 was
    // wildly over-reserved: Groq bills max_tokens against the per-day budget, so
    // it capped the free tier at ~11 repairs/day. 4000 covers normal source
    // files and ~doubles daily throughput. Override via PATCH_MAX_TOKENS.
    maxTokens: parseInt(process.env.PATCH_MAX_TOKENS, 10) || 4000,
  });

  let patch;
  const fileBlocks = parseFileBlocks(result);
  if (fileBlocks.length > 0) {
    // Store as JSON with _warpfix_format marker for the PR agent
    patch = JSON.stringify({ _warpfix_format: 'file_blocks', files: fileBlocks });
  } else {
    patch = extractDiff(result);
  }

  // Safety validation (incl. scope guards: no inventing files / gutting files)
  const safetyCheck = validatePatchSafety(patch, { knownFiles: Array.from(knownFiles), sourceFiles });
  if (!safetyCheck.safe) {
    logger.warn('Patch failed safety check', { reasons: safetyCheck.reasons });
    // Non-retryable: regenerating won't make an unsafe patch safe, so the worker
    // skips this job instead of retrying (which would waste LLM tokens).
    const err = new Error(`Patch safety violation: ${safetyCheck.reasons.join(', ')}`);
    err.code = 'PATCH_UNSAFE';
    throw err;
  }

  return patch;
}

async function fetchRepoSourceTree(repository, installationId, ref) {
  try {
    const { getInstallationOctokit } = require('../services/github');
    const octokit = await getInstallationOctokit(installationId);
    const treeish = ref || repository.default_branch || 'main';
    
    const tree = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
      owner: repository.owner,
      repo: repository.name,
      tree_sha: treeish,
      recursive: '1',
    });
    
    // Return source files repo-wide (not just src/) so repos that keep code at
    // the root or in lib/, app/, etc. are still repairable. Exclude tests,
    // vendored/build output, and non-source paths.
    const EXCLUDE = /(^|\/)(node_modules|dist|build|out|coverage|vendor|\.next|\.github|\.git)\//;
    const TESTISH = /(^|\/)(tests?|__tests__|__mocks__|spec)\/|\.(test|spec)\.\w+$|(^|\/)test\.\w+$/i;
    const SRC_EXT = /\.(js|jsx|ts|tsx|py|rb|go|rs|java|php|c|cpp|cs)$/;
    return tree.data.tree
      .filter(f => f.type === 'blob'
        && SRC_EXT.test(f.path)
        && !EXCLUDE.test(f.path)
        && !TESTISH.test(f.path))
      // Prefer shallower paths (more likely to be the entrypoint with the bug).
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length)
      .map(f => f.path)
      .slice(0, 15);
  } catch (err) {
    logger.error('Failed to fetch repo tree', { error: err.message });
    return [];
  }
}

async function fetchSourceFiles(affectedFiles, repository, installationId, ref, maxFiles = 5) {
  const files = {};
  try {
    const { getInstallationOctokit } = require('../services/github');
    const octokit = await getInstallationOctokit(installationId);
    const owner = repository.owner;
    const repo = repository.name;
    const branch = ref || repository.default_branch || 'main';

    for (const filePath of affectedFiles.slice(0, maxFiles)) {
      try {
        const resp = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner, repo, path: filePath, ref: branch,
        });
        if (resp.data.content) {
          files[filePath] = Buffer.from(resp.data.content, 'base64').toString('utf8');
        }
      } catch {
        // File may not exist
      }
    }
  } catch (err) {
    logger.error('Failed to fetch source files', { error: err.message });
  }
  return files;
}

function buildPatchPrompt(logData, classification, context, sourceFiles = {}) {
  let prompt = `Fix this ${classification.type} error.\n\n`;
  prompt += `Error: ${logData.errorMessage}\n\n`;

  if (logData.stackTrace) {
    prompt += `Stack trace:\n${logData.stackTrace.substring(0, 1200)}\n\n`;
  }

  if (logData.rootCause) {
    prompt += `Root cause: ${logData.rootCause}\n\n`;
  }

  if (logData.affectedFiles?.length > 0) {
    prompt += `Affected files: ${logData.affectedFiles.join(', ')}\n\n`;
  }

  // Include actual source file contents for accurate patching. The delimiter
  // here MUST NOT look like the required output marker (===FILE: path===).
  // Weaker models (e.g. the free GitHub Models fallback) otherwise echo this
  // input delimiter verbatim, so parseFileBlocks finds no ===FILE: blocks and
  // the repair ships nothing ("No committable source files").
  const fileEntries = Object.entries(sourceFiles);
  if (fileEntries.length > 0) {
    // Token budget: cap per-file size and total reference-source size so a big
    // repo can't blow the prompt (and the per-day token budget). Tunable via
    // env. Files are already ordered affected-first, so the relevant code is
    // never the part that gets dropped.
    const perFile = parseInt(process.env.PATCH_FILE_CHARS, 10) || 3500;
    const totalBudget = parseInt(process.env.PATCH_SRC_CHAR_BUDGET, 10) || 12000;
    prompt += `\n----- CURRENT SOURCE FILES (read-only, for reference) -----\n`;
    let used = 0;
    for (const [path, content] of fileEntries) {
      if (used >= totalBudget) break;
      const slice = content.substring(0, Math.min(perFile, totalBudget - used));
      prompt += `\n>>>>> BEGIN ${path} >>>>>\n${slice}\n<<<<< END ${path} <<<<<\n`;
      used += slice.length;
    }
    prompt += `----- END SOURCE FILES -----\n\n`;
  }

  if (classification.suggestedApproach) {
    prompt += `Suggested approach: ${classification.suggestedApproach}\n\n`;
  }

  if (context?.language) {
    prompt += `Language: ${context.language}\n`;
  }
  if (context?.package_manager) {
    prompt += `Package manager: ${context.package_manager}\n`;
  }

  prompt += '\nGenerate the fix using the ===FILE: path=== / ===END_FILE=== format with complete file content:';
  return prompt;
}

function parseFileBlocks(llmOutput) {
  const files = [];
  if (!llmOutput) return files;
  // Some models wrap the whole answer in a markdown fence despite instructions.
  // Strip a single outer ``` ... ``` wrapper so the FILE markers are reachable.
  let text = llmOutput.trim();
  const outerFence = text.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  if (outerFence && /===\s*FILE:/i.test(outerFence[1])) text = outerFence[1];

  // Tolerate spacing around the marker: "===FILE: path===" / "=== FILE : path ==="
  const regex = /===\s*FILE\s*:\s*(.+?)\s*===\n([\s\S]*?)===\s*END_FILE\s*===/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const path = match[1].trim();
    const content = stripContentFence(match[2].trim());
    if (path && content) {
      files.push({ path, content });
    }
  }

  // Tolerate a truncated final block (model hit max_tokens before ===END_FILE===):
  // capture the last opened FILE block that was never closed.
  if (files.length === 0) {
    const open = text.match(/===\s*FILE\s*:\s*(.+?)\s*===\n([\s\S]*)$/i);
    if (open && !/===\s*END_FILE\s*===/i.test(open[2])) {
      const path = open[1].trim();
      const content = stripContentFence(open[2].trim());
      if (path && content) files.push({ path, content });
    }
  }

  // Safety net: weaker models sometimes drop the "FILE:" keyword and emit the
  // file path with bare "=== path ===" headers (mimicking the reference-file
  // delimiter). Only used when no proper ===FILE: blocks were found. We accept a
  // header only if it looks like a real source path (has a file extension), and
  // capture its content up to the next "=== ... ===" header / END marker / EOF.
  if (files.length === 0) {
    const bare = /===\s*([^\n=]+?\.[a-z0-9]{1,8})\s*===\r?\n([\s\S]*?)(?=\r?\n===\s*[^\n]+?===|\r?\n?===\s*END_FILE\s*===|$)/gi;
    let m2;
    while ((m2 = bare.exec(text)) !== null) {
      const path = m2[1].trim();
      const content = stripContentFence(m2[2].trim());
      if (path && content) files.push({ path, content });
    }
  }
  return files;
}

// Remove a leading/trailing ```lang ... ``` fence around file content if present.
function stripContentFence(content) {
  const m = content.match(/^```[\w-]*\n([\s\S]*?)\n?```$/);
  return m ? m[1].trim() : content;
}

function extractDiff(llmOutput) {
  // Try to extract diff block
  const diffMatch = llmOutput.match(/```(?:diff)?\n([\s\S]*?)```/);
  if (diffMatch) return diffMatch[1].trim();

  // Check if the output itself looks like a diff
  if (llmOutput.includes('---') && llmOutput.includes('+++')) {
    return llmOutput.trim();
  }

  return llmOutput.trim();
}

function validatePatchSafety(patch, options = {}) {
  const reasons = [];
  // knownFiles = the source files that actually exist on the failing ref.
  // sourceFiles = path -> original content (used to detect file-gutting).
  const knownFiles = new Set(options.knownFiles || Object.keys(options.sourceFiles || {}));
  const sourceFiles = options.sourceFiles || {};

  // For JSON format, extract content for safety checks
  let patchToCheck = patch;
  let filePaths = [];
  let blocks = [];
  try {
    const parsed = JSON.parse(patch);
    if (parsed._warpfix_format === 'file_blocks' && Array.isArray(parsed.files)) {
      blocks = parsed.files;
      filePaths = parsed.files.map(f => f.path);
      // Check file content for forbidden patterns too, not just paths
      patchToCheck = parsed.files.map(f => `${f.path}\n${f.content || ''}`).join('\n');
    }
  } catch {
    // Not JSON — check as diff
  }

  // SCOPE GUARDS (audit P1): stop hallucinated rewrites.
  // 1) Touching too many files at once is a smell — a focused repair edits a few.
  if (blocks.length > PATCH_SAFETY_RULES.maxFilesChanged) {
    reasons.push(`Patch touches too many files: ${blocks.length} (max ${PATCH_SAFETY_RULES.maxFilesChanged})`);
  }
  for (const f of blocks) {
    const p = (f.path || '').trim();
    if (!p) continue;
    const original = sourceFiles[p];
    // 2) Inventing brand-new files. WarpFix once created a 168-line component
    //    from a generic "exit code 1". Only allow new files when we have no
    //    knowledge of the repo tree (knownFiles empty) — otherwise require the
    //    target to be an existing file.
    if (knownFiles.size > 0 && original === undefined && !knownFiles.has(p)) {
      reasons.push(`Refusing to create a brand-new file not referenced by the failure: ${p}`);
      continue;
    }
    // 3) Gutting an existing file (mass deletion). Reject if the rewrite drops
    //    more than half of a non-trivial file.
    if (typeof original === 'string' && original.trim()) {
      const origLines = original.split('\n').length;
      const newLines = (f.content || '').split('\n').length;
      if (origLines >= 40 && newLines < origLines * 0.5 && (origLines - newLines) > 40) {
        reasons.push(`Over-aggressive rewrite of ${p}: ${origLines}→${newLines} lines (removes ${origLines - newLines})`);
      }
    }
  }

  const lines = patchToCheck.split('\n');
  const changedLines = lines.filter(l => l.startsWith('+') || l.startsWith('-')).length;
  if (!filePaths.length && changedLines > PATCH_SAFETY_RULES.maxDiffLines) {
    reasons.push(`Diff too large: ${changedLines} lines (max ${PATCH_SAFETY_RULES.maxDiffLines})`);
  }

  // Check forbidden patterns against the changed/added content (for diffs, only
  // added lines; for whole-file blocks, the full content).
  const contentToCheck = filePaths.length
    ? patchToCheck
    : lines.filter(l => l.startsWith('+')).join('\n');
  for (const pattern of PATCH_SAFETY_RULES.forbiddenPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(contentToCheck)) {
      reasons.push(`Forbidden pattern detected: ${pattern}`);
    }
  }

  // Collect the set of paths the patch touches (file_blocks paths + diff headers).
  const allPaths = [...filePaths];
  for (const l of lines) {
    const m = l.match(/^[+-]{3}\s+[ab]\/(.+)$/);
    if (m) allPaths.push(m[1].trim());
  }

  // Exact-name forbidden files (lockfiles).
  for (const file of PATCH_SAFETY_RULES.forbiddenFileChanges) {
    if (allPaths.some(p => p === file || p.endsWith(`/${file}`))) {
      reasons.push(`Forbidden file change: ${file}`);
    }
  }
  // Pattern-based forbidden paths (.env*, CI workflows) and test files.
  for (const p of allPaths) {
    if (FORBIDDEN_PATH.test(p)) reasons.push(`Forbidden file change: ${p}`);
    else if (TEST_PATH.test(p)) reasons.push(`Refusing to modify test file: ${p}`);
  }

  return { safe: reasons.length === 0, reasons: [...new Set(reasons)] };
}

module.exports = { generatePatch, validatePatchSafety, buildPatchPrompt };
