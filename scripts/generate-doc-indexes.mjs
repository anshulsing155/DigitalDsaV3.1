#!/usr/bin/env node
/**
 * Generate docs/{specs,reviews,runbooks}/INDEX.md from file listings.
 *
 * For each .md file in the target folder:
 *   - Try to parse YAML frontmatter (type/epic/status/last_verified/etc.)
 *   - Fallback: pull first H1 + file mtime + size
 *
 * Output is a sortable markdown table at the top of each INDEX.md +
 * a "Files without frontmatter" list to drive opportunistic backfill.
 *
 * Idempotent: always regenerates. Safe to re-run. Called by /end after
 * any docs/ changes. See CLAUDE.md §17 for the frontmatter convention.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const parseFrontmatter = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    fm[kv[1]] = kv[2].trim();
  }
  return fm;
};

const firstH1 = (text) => {
  const m = text.match(/^# (.+)$/m);
  return m ? m[1].trim() : '(no H1)';
};

const buildIndex = (folder, headerNote) => {
  const dir = path.join(root, folder);
  if (!fs.existsSync(dir)) {
    return null;
  }
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'INDEX.md')
    .sort();

  const rows = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    const text = fs.readFileSync(full, 'utf8');
    const fm = parseFrontmatter(text);
    const h1 = firstH1(text);
    const mtime = stat.mtime.toISOString().slice(0, 10);
    const sizeKb = Math.round(stat.size / 1024);

    rows.push({
      file,
      title: fm?.epic || h1.slice(0, 80),
      status: fm?.status || '—',
      type: fm?.type || '—',
      lastVerified: fm?.last_verified || mtime,
      sizeKb,
      h1: h1.slice(0, 100),
      hasFrontmatter: !!fm,
    });
  }

  // Sort by lastVerified descending (newest first), then by name
  rows.sort((a, b) => {
    if (a.lastVerified !== b.lastVerified) {
      return a.lastVerified > b.lastVerified ? -1 : 1;
    }
    return a.file.localeCompare(b.file);
  });

  const withFm = rows.filter((r) => r.hasFrontmatter).length;
  const fmCoverage = rows.length
    ? Math.round((withFm / rows.length) * 100)
    : 100;

  const lines = [
    '---',
    'type: reference',
    'status: active',
    `last_verified: ${new Date().toISOString().slice(0,10)}`,
    `owner: tech@digitaldsa.com`,
    `generated_by: scripts/generate-doc-indexes.mjs`,
    '---',
    '',
    `# ${folder.split('/').pop()} index`,
    '',
    headerNote,
    '',
    `**Total files**: ${rows.length}  ·  **Frontmatter coverage**: ${withFm}/${rows.length} (${fmCoverage}%)  ·  **Sorted by**: last verified (or mtime fallback), newest first`,
    '',
    'Regenerate with `node scripts/generate-doc-indexes.mjs`. `/end` calls this automatically after every session close.',
    '',
    '## Files',
    '',
    '| File | Title / Epic | Status | Last verified | Size |',
    '|---|---|---|---|---|',
    ...rows.map((r) =>
      `| [${r.file}](${r.file}) | ${r.title.replace(/\|/g, '\\|')} | ${r.status} | ${r.lastVerified} | ${r.sizeKb} KB |`
    ),
    '',
    '## Files without frontmatter',
    '',
    'These fall back to file mtime + first H1 in the index above. Add YAML frontmatter on next touch — see [CLAUDE.md §17 frontmatter convention](../../CLAUDE.md).',
    '',
    ...rows.filter((r) => !r.hasFrontmatter).map((r) => `- \`${r.file}\``),
    '',
  ];

  return {
    path: path.join(dir, 'INDEX.md'),
    content: lines.join('\n'),
    rowCount: rows.length,
    fmCoverage,
  };
};

const targets = [
  {
    folder: 'docs/specs',
    note: 'Feature design specifications. Each spec defines what gets built and how, with acceptance criteria. Sourced from `docs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md` plus per-feature deep-dives.',
  },
  {
    folder: 'docs/reviews',
    note: 'Code reviews + audits + contrast checks, dated by review run. Includes both AI-driven enterprise reviews and routine daily-review outputs.',
  },
  {
    folder: 'docs/runbooks',
    note: 'Operator playbooks (smoke tests, env setup, migrations). Each runbook should have Prerequisites + Steps + Verification + Rollback.',
  },
];

for (const t of targets) {
  const result = buildIndex(t.folder, t.note);
  if (!result) {
    console.log(`Skipped ${t.folder} (folder missing).`);
    continue;
  }
  fs.writeFileSync(result.path, result.content, 'utf8');
  console.log(`Wrote ${result.path}: ${result.rowCount} files, ${result.fmCoverage}% frontmatter coverage.`);
}
