#!/usr/bin/env node
/**
 * Regenerate docs/DECISIONS.md — single-pane aggregation of every standing
 * decision in the project, drawn from three sources:
 *
 *   1. CHANGELOG.md (active) + docs/changelog-archive/*.md — "🟢 Decisions"
 *      subsections inside each `### YYYY-MM-DD` block
 *   2. docs/adr/*.md — title + status + first paragraph of "## Decision"
 *   3. CLAUDE.md §16 HARD RULES — the numbered list verbatim
 *
 * Idempotent: always regenerates. Safe to re-run. Called by /end after
 * doc writes land.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outPath = path.join(root, 'docs/DECISIONS.md');
const today = new Date().toISOString().slice(0, 10);

// ─── Source 1: CLAUDE.md §16 ──────────────────────────────────────────────

function extractHardRules() {
  const claudePath = path.join(root, 'CLAUDE.md');
  if (!fs.existsSync(claudePath)) return { rules: [], error: 'CLAUDE.md not found' };
  const text = fs.readFileSync(claudePath, 'utf8');
  const lines = text.split('\n');
  const startIdx = lines.findIndex((ln) => /^## 16\. HARD RULES/.test(ln));
  if (startIdx === -1) return { rules: [], error: '§16 heading not found' };

  // Walk until next `## ` heading
  const rules = [];
  let i = startIdx + 1;
  while (i < lines.length && !/^## /.test(lines[i])) {
    const m = lines[i].match(/^\s*(\d+)\.\s+\*\*([^*]+)\*\*\s*(.*)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const title = m[2].trim();
      const rest = m[3].replace(/^[\s—–-]+/, '').trim();
      rules.push({ num, title, rest });
    }
    i++;
  }
  return { rules };
}

// ─── Source 2: docs/adr/*.md ──────────────────────────────────────────────

function extractAdrs() {
  const adrDir = path.join(root, 'docs/adr');
  if (!fs.existsSync(adrDir)) return [];

  const files = fs
    .readdirSync(adrDir)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .sort();

  return files.map((file) => {
    const full = path.join(adrDir, file);
    const text = fs.readFileSync(full, 'utf8');

    const titleMatch = text.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : file;

    const statusMatch = text.match(/^\*\*Status\*\*:\s*(.+?)(?=\n\*\*|$)/ms);
    const status = statusMatch ? statusMatch[1].trim().split('\n')[0] : '—';

    const dateMatch = text.match(/^\*\*Date\*\*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/m);
    const date = dateMatch ? dateMatch[1] : '—';

    // First non-blank paragraph after "## Decision" heading
    const decMatch = text.match(/^##\s+Decision\s*\n+([\s\S]*?)(?=\n## |$)/m);
    let decision = '';
    if (decMatch) {
      const para = decMatch[1].trim().split(/\n\n/)[0];
      // Strip markdown list bullets and bold
      decision = para
        .replace(/^[-*]\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 250);
      if (para.length > 250) decision += '…';
    }

    return { id: file.replace('.md', ''), title, status, date, decision };
  });
}

// ─── Source 3: CHANGELOG "🟢 Decisions" sections ──────────────────────────

function extractChangelogDecisions(filePath, sourceLabel) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');

  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const sessionHeader = lines[i].match(/^### (\d{4}-\d{2}-\d{2})([^\n]*)/);
    if (!sessionHeader) continue;

    const date = sessionHeader[1];
    const title = sessionHeader[2].trim();

    // Find "### 🟢 Decisions" subsection within this session (before next ### YYYY-MM-DD)
    let j = i + 1;
    const sessionEnd = (() => {
      for (let k = i + 1; k < lines.length; k++) {
        if (/^### \d{4}-\d{2}-\d{2}/.test(lines[k])) return k;
      }
      return lines.length;
    })();

    while (j < sessionEnd) {
      // Match either `### 🟢 Decisions` heading (2-4 hashes) OR
      // `**🟢 Decisions / patterns:**` bold-paragraph marker (also common).
      const isHeading =
        /^#{2,4}\s*(🟢\s*)?Decisions\b/.test(lines[j]) ||
        /^\*\*\s*(🟢\s*)?Decisions\b[^*]*\*\*\s*:?$/.test(lines[j].trim());

      if (isHeading) {
        // Collect bullets until next bold paragraph marker / heading / blank-followed-by-text-non-bullet.
        const bullets = [];
        let k = j + 1;
        while (k < sessionEnd) {
          const trimmed = lines[k].trim();
          // Stop on next bold paragraph header
          if (/^\*\*[^*]+\*\*\s*:?$/.test(trimmed) && !/Decisions/.test(trimmed)) break;
          // Stop on heading
          if (/^####?\s+/.test(lines[k])) break;

          const bm = lines[k].match(/^\s*[-*]\s+(.+)$/);
          if (bm) {
            // Strip leading bold markers and clean up
            let cleaned = bm[1]
              .replace(/^\*\*([^*]+)\*\*\s*[—–-]?\s*/, '$1 — ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 300);
            bullets.push(cleaned);
          }
          k++;
        }
        if (bullets.length > 0) {
          out.push({ date, title, bullets, source: sourceLabel });
          break;
        }
      }
      j++;
    }
  }
  return out;
}

// ─── Build output ──────────────────────────────────────────────────────────

const hardRules = extractHardRules();
const adrs = extractAdrs();

const changelogActive = path.join(root, 'docs/CHANGELOG.md');
const changelogArchiveDir = path.join(root, 'docs/changelog-archive');

const allDecisions = [];
allDecisions.push(...extractChangelogDecisions(changelogActive, 'active'));

if (fs.existsSync(changelogArchiveDir)) {
  const archives = fs.readdirSync(changelogArchiveDir).filter((f) => f.endsWith('.md'));
  for (const f of archives) {
    allDecisions.push(...extractChangelogDecisions(path.join(changelogArchiveDir, f), `archive:${f}`));
  }
}

// Sort sessions newest first; keep last 90 days only
const cutoff = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
})();
const recentDecisions = allDecisions
  .filter((d) => d.date >= cutoff)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const totalBullets = recentDecisions.reduce((s, d) => s + d.bullets.length, 0);

// ─── Render ────────────────────────────────────────────────────────────────

const lines = [];
lines.push('---');
lines.push('type: reference');
lines.push('status: active');
lines.push(`last_verified: ${today}`);
lines.push('owner: tech@digitaldsa.com');
lines.push('generated_by: scripts/generate-decisions-log.mjs');
lines.push('---');
lines.push('');
lines.push('# Decisions Log — Aggregated');
lines.push('');
lines.push('Single-pane view of every standing decision in the project. **Auto-regenerated** at every `/end` from three sources:');
lines.push('');
lines.push('1. `CLAUDE.md §16` — hard-rules (durable process invariants)');
lines.push('2. `docs/adr/*.md` — Architecture Decision Records (locked design choices)');
lines.push('3. `docs/CHANGELOG.md` + archives — "🟢 Decisions / patterns" sections from session-close blocks (rolling 90 days)');
lines.push('');
lines.push(`**Counts**: ${hardRules.rules.length} hard-rules · ${adrs.length} ADRs · ${recentDecisions.length} sessions / ${totalBullets} bullets (last 90 days)`);
lines.push('');
lines.push("Do NOT edit this file directly — edits will be overwritten on next regenerate. To make a new decision durable, log it via `/end` (it will land in CHANGELOG, then this file picks it up next run). To change a hard-rule, edit `CLAUDE.md §16`.");
lines.push('');
lines.push('---');
lines.push('');

// Section 1: Hard rules
lines.push('## §16 Hard Rules (durable process)');
lines.push('');
if (hardRules.error) {
  lines.push(`*Could not extract: ${hardRules.error}*`);
} else {
  for (const r of hardRules.rules) {
    lines.push(`${r.num}. **${r.title}** ${r.rest}`);
  }
}
lines.push('');
lines.push('---');
lines.push('');

// Section 2: ADRs
lines.push('## ADRs — Architecture Decision Records');
lines.push('');
lines.push('| ID | Title | Status | Date | Decision (summary) |');
lines.push('|---|---|---|---|---|');
for (const a of adrs) {
  const safeTitle = a.title.replace(/\|/g, '\\|').slice(0, 80);
  const safeStatus = a.status.replace(/\|/g, '\\|').slice(0, 60);
  const safeDecision = a.decision.replace(/\|/g, '\\|');
  lines.push(`| [${a.id}](adr/${a.id}.md) | ${safeTitle} | ${safeStatus} | ${a.date} | ${safeDecision} |`);
}
lines.push('');
lines.push('---');
lines.push('');

// Section 3: Session decisions (last 90 days)
lines.push('## Session decisions — last 90 days');
lines.push('');
if (recentDecisions.length === 0) {
  lines.push('*No session decisions in the last 90 days.*');
} else {
  for (const d of recentDecisions) {
    lines.push(`### ${d.date}`);
    if (d.title) lines.push(`*${d.title.replace(/^—\s*/, '').slice(0, 200)}*`);
    lines.push('');
    for (const b of d.bullets) {
      lines.push(`- ${b}`);
    }
    lines.push('');
  }
}

lines.push('---');
lines.push('');
lines.push(`*Generated ${today} by \`scripts/generate-decisions-log.mjs\`. To regenerate manually: \`node scripts/generate-decisions-log.mjs\`.*`);
lines.push('');

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`Wrote ${path.relative(root, outPath)}:`);
console.log(`  ${hardRules.rules.length} hard-rules`);
console.log(`  ${adrs.length} ADRs`);
console.log(`  ${recentDecisions.length} sessions / ${totalBullets} bullets`);
