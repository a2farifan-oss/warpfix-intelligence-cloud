// Local mirror of WarpFix's production patch prompt + file-block parser so the
// corpus we build matches exactly what the live engine sends/receives.
// Copied verbatim (behaviour-preserving) from backend/src/agents/patchGenerator.js.

const SYSTEM_PROMPT = `You are an expert CI repair agent. Analyze the error and fix the SOURCE code (not the tests).

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
- Do NOT wrap the file blocks in markdown code fences`;

function buildPatchPrompt(logData, classification, context, sourceFiles = {}) {
  let prompt = `Fix this ${classification.type} error.\n\n`;
  prompt += `Error: ${logData.errorMessage}\n\n`;
  if (logData.stackTrace) prompt += `Stack trace:\n${logData.stackTrace.substring(0, 2000)}\n\n`;
  if (logData.rootCause) prompt += `Root cause: ${logData.rootCause}\n\n`;
  if (logData.affectedFiles?.length > 0) prompt += `Affected files: ${logData.affectedFiles.join(', ')}\n\n`;

  const fileEntries = Object.entries(sourceFiles);
  if (fileEntries.length > 0) {
    prompt += `\n----- CURRENT SOURCE FILES (read-only, for reference) -----\n`;
    for (const [path, content] of fileEntries) {
      prompt += `\n>>>>> BEGIN ${path} >>>>>\n${content.substring(0, 4000)}\n<<<<< END ${path} <<<<<\n`;
    }
    prompt += `----- END SOURCE FILES -----\n\n`;
  }
  if (classification.suggestedApproach) prompt += `Suggested approach: ${classification.suggestedApproach}\n\n`;
  if (context?.language) prompt += `Language: ${context.language}\n`;
  if (context?.package_manager) prompt += `Package manager: ${context.package_manager}\n`;
  prompt += '\nGenerate the fix using the ===FILE: path=== / ===END_FILE=== format with complete file content:';
  return prompt;
}

function stripContentFence(content) {
  const m = content.match(/^```[\w-]*\n([\s\S]*?)\n?```$/);
  return m ? m[1].trim() : content;
}

function parseFileBlocks(llmOutput) {
  const files = [];
  if (!llmOutput) return files;
  let text = llmOutput.trim();
  const outerFence = text.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  if (outerFence && /===\s*FILE:/i.test(outerFence[1])) text = outerFence[1];

  const regex = /===\s*FILE\s*:\s*(.+?)\s*===\n([\s\S]*?)===\s*END_FILE\s*===/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const path = match[1].trim();
    const content = stripContentFence(match[2].trim());
    if (path && content) files.push({ path, content });
  }
  if (files.length === 0) {
    const open = text.match(/===\s*FILE\s*:\s*(.+?)\s*===\n([\s\S]*)$/i);
    if (open && !/===\s*END_FILE\s*===/i.test(open[2])) {
      const path = open[1].trim();
      const content = stripContentFence(open[2].trim());
      if (path && content) files.push({ path, content });
    }
  }
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

module.exports = { SYSTEM_PROMPT, buildPatchPrompt, parseFileBlocks, stripContentFence };
