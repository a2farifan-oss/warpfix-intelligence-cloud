const { logger } = require('../utils/logger');
const { getInstallationOctokit } = require('../services/github');

async function createPullRequest({ patch, repository, installation_id, classification, confidence, fingerprint, workflow_run }) {
  logger.info('Creating pull request', { repo: repository?.full_name, confidence: confidence.score });

  if (!installation_id || !repository) {
    logger.warn('Missing installation_id or repository, skipping PR creation');
    return { url: null, number: null };
  }

  try {
    const octokit = await getInstallationOctokit(installation_id);
    const owner = repository.owner;
    const repo = repository.name;
    // Target the branch whose CI failed (where the bug actually is), falling
    // back to the default branch for push-to-default failures. Base the fix
    // branch off the exact failing commit so the patch applies on top of it.
    const baseBranch = workflow_run?.head_branch || repository.default_branch || 'main';
    const fixBranch = `warpfix/${fingerprint.hash}-${Date.now()}`;

    let startSha = workflow_run?.head_sha;
    if (!startSha) {
      const baseRef = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });
      startSha = baseRef.data.object.sha;
    }

    // Create fix branch off the failing commit
    await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
      owner,
      repo,
      ref: `refs/heads/${fixBranch}`,
      sha: startSha,
    });

    // Parse diff and apply changes via API
    const files = parsePatchFiles(patch);
    const committableFiles = files.filter(f =>
      !f.path.startsWith('.github/workflows/') &&
      !f.path.startsWith('test/') &&
      !f.path.startsWith('tests/') &&
      !f.path.startsWith('__tests__/') &&
      !f.path.endsWith('.test.js') &&
      !f.path.endsWith('.spec.js')
    );
    
    if (committableFiles.length === 0) {
      logger.warn('No committable source files in patch (only test/workflow files)', {
        allFiles: files.map(f => f.path),
      });
      // Clean up orphaned branch
      try {
        await octokit.request('DELETE /repos/{owner}/{repo}/git/refs/{ref}', {
          owner, repo, ref: `heads/${fixBranch}`,
        });
      } catch (branchErr) {
        logger.warn('Failed to delete orphaned branch', { branch: fixBranch, error: branchErr.message });
      }
      return { url: null, number: null };
    }

    for (const file of committableFiles) {
      try {
        let existingSha;
        try {
          const existing = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner, repo, path: file.path, ref: fixBranch,
          });
          existingSha = existing.data.sha;
        } catch {
          existingSha = undefined;
        }

        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
          owner,
          repo,
          path: file.path,
          message: `warpfix: ${classification.summary?.substring(0, 50)}`,
          content: Buffer.from(file.content).toString('base64'),
          branch: fixBranch,
          ...(existingSha ? { sha: existingSha } : {}),
        });
      } catch (err) {
        logger.error('Failed to update file', { file: file.path, error: err.message });
      }
    }

    // Create PR
    const prBody = buildPRBody(classification, confidence, fingerprint, patch);
    const pr = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner,
      repo,
      title: `[WarpFix] ${classification.summary?.substring(0, 80) || 'Automated repair'}`,
      body: prBody,
      head: fixBranch,
      base: baseBranch,
    });

    // Add labels. When the sandbox could not run the REAL test suite
    // (verified:false — non-Node stack or toolchain unavailable), flag the PR
    // "unverified" so reviewers know the fix was not proven by tests.
    try {
      const labels = ['warpfix', `confidence-${confidence.recommendation}`];
      labels.push(confidence.verified ? 'verified' : 'unverified-needs-review');
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner,
        repo,
        issue_number: pr.data.number,
        labels,
      });
    } catch {
      // Labels might not exist
    }

    logger.info('PR created', { url: pr.data.html_url, number: pr.data.number });

    return {
      url: pr.data.html_url,
      number: pr.data.number,
    };
  } catch (err) {
    logger.error('PR creation failed', { error: err.message });
    return { url: null, number: null };
  }
}

function buildPRBody(classification, confidence, fingerprint, patch) {
  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  }[classification.severity] || '⚪';

  const confidenceEmoji = confidence.score >= 85 ? '🟢' : confidence.score >= 60 ? '🟡' : '🔴';
  const recommendationLabel = confidence.recommendation?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Review';

  return `## 🔧 WarpFix Automated Repair

> **${classification.summary || 'CI failure detected and repaired'}**

---

### 📋 Error Classification

| Property | Value |
|----------|-------|
| **Type** | \`${classification.type}\` |
| **Severity** | ${severityEmoji} ${classification.severity} |
| **Category** | ${classification.category || classification.type} |

### ${confidenceEmoji} Confidence: ${confidence.score}/100

<details>
<summary>Score Breakdown</summary>

| Factor | Score |
|--------|-------|
${Object.entries(confidence.breakdown || {})
  .map(([key, val]) => `| ${key.replace(/_/g, ' ')} | +${val} |`)
  .join('\n')}

</details>

**Recommendation:** ${recommendationLabel}

### 🔍 Fingerprint

\`\`\`
Hash:    ${fingerprint.hash}
Pattern: ${fingerprint.errorPattern?.substring(0, 200) || 'N/A'}
\`\`\`

${fingerprint.matchCount > 0 ? `> 📊 This fingerprint has been matched **${fingerprint.matchCount}** times across your repos.` : ''}

### 📝 Changes

<details>
<summary>View Patch</summary>

\`\`\`diff
${formatPatchForDisplay(patch)}
\`\`\`

</details>

---

<sub>🤖 Generated by <a href="https://warpfix.org">WarpFix</a> — Autonomous CI Repair Agent · <a href="https://warpfix.org/security">Security</a> · <a href="https://warpfix.org/permissions">Permissions</a></sub>
`;
}

function formatPatchForDisplay(patch) {
  try {
    const parsed = JSON.parse(patch);
    if (parsed._warpfix_format === 'file_blocks' && Array.isArray(parsed.files)) {
      return parsed.files.map(f => `--- a/${f.path}\n+++ b/${f.path}\n${f.content.substring(0, 1500)}`).join('\n\n');
    }
  } catch {
    // Not JSON, display as-is
  }
  return patch.substring(0, 5000);
}

function parsePatchFiles(patch) {
  // Try new structured format first
  try {
    const parsed = JSON.parse(patch);
    if (parsed._warpfix_format === 'file_blocks' && Array.isArray(parsed.files)) {
      return parsed.files;
    }
  } catch {
    // Not JSON, try legacy diff format
  }

  // Legacy diff parser - extracts file paths and hunks from unified diff
  // NOTE: This returns diff hunks, not full file content.
  // The caller must fetch the existing file and apply the diff.
  const files = [];
  const sections = patch.split(/^diff --git/m).filter(Boolean);

  for (const section of sections) {
    const pathMatch = section.match(/\+\+\+ b\/(.+)/);
    if (pathMatch) {
      const lines = section.split('\n');
      const resultLines = [];
      let inHunk = false;
      for (const line of lines) {
        if (line.startsWith('@@')) {
          inHunk = true;
          continue;
        }
        if (!inHunk) continue;
        if (line.startsWith('-')) continue; // removed line
        if (line.startsWith('+')) {
          resultLines.push(line.substring(1)); // added line
        } else {
          resultLines.push(line.startsWith(' ') ? line.substring(1) : line); // context line
        }
      }

      if (resultLines.length > 0) {
        files.push({
          path: pathMatch[1],
          content: resultLines.join('\n'),
          _is_diff: true,
        });
      }
    }
  }

  return files;
}

module.exports = { createPullRequest };
