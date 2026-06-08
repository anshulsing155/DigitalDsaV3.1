#!/usr/bin/env node
/**
 * Archive SESSION-HANDOFF.md historical blocks past the cutoff into
 * docs/handoff-archive/YYYY-MM.md monthly files. Regenerate the pointer
 * block at the bottom of SESSION-HANDOFF.md from the archive directory
 * listing (always accurate).
 *
 * Default cutoff: today - 14 days. Override with `--cutoff=YYYY-MM-DD`.
 *
 * Idempotent: re-runs are no-ops if nothing crossed the cutoff. Safe to
 * call from `/end` every session — the dynamic cutoff naturally pulls
 * aging blocks into archives on the day they cross 14 days.
 *
 * Active blocks are those between the first `## Context snapshot` heading
 * and the `<!-- HANDOFF_ARCHIVE_POINTER -->` marker (or EOF if no marker).
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const handoffPath = path.join(root, 'docs/SESSION-HANDOFF.md');
const archiveDir = path.join(root, 'docs/handoff-archive');
const POINTER_MARK = '<!-- HANDOFF_ARCHIVE_POINTER -->';

function parseCutoff() {
  const arg = process.argv.find((a) => a.startsWith('--cutoff='));
  if (arg) return arg.slice('--cutoff='.length);
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

const CUTOFF_DATE = parseCutoff();
const today = new Date().toISOString().slice(0, 10);

if (!fs.existsSync(handoffPath)) {
  console.error(`archive-handoff: ${handoffPath} not found.`);
  process.exit(1);
}

const text = fs.readFileSync(handoffPath, 'utf8');
const lines = text.split('\n');

// Active window = [firstHistoryIdx, pointerIdx or EOF)
const pointerIdx = lines.findIndex((ln) => ln.includes(POINTER_MARK));
const activeEndIdx = pointerIdx === -1 ? lines.length : pointerIdx;

const firstHistoryIdx = lines.findIndex((ln) => /^## Context snapshot/.test(ln));
if (firstHistoryIdx === -1 || firstHistoryIdx >= activeEndIdx) {
  console.log('archive-handoff: no active history blocks. No-op.');
  process.exit(0);
}

// Parse blocks
const blocks = [];
let i = firstHistoryIdx;
while (i < activeEndIdx) {
  if (!/^## Context snapshot/.test(lines[i])) { i++; continue; }
  const m = lines[i].match(/^## Context snapshot \((\d{4}-\d{2}-\d{2})/);
  if (!m) { i++; continue; }
  const date = m[1];
  const startIdx = i;
  let endIdx = i + 1;
  while (endIdx < activeEndIdx && !/^## Context snapshot/.test(lines[endIdx])) endIdx++;
  blocks.push({ date, content: lines.slice(startIdx, endIdx).join('\n') });
  i = endIdx;
}

const keep = blocks.filter((b) => b.date >= CUTOFF_DATE);
const archive = blocks.filter((b) => b.date < CUTOFF_DATE);

if (archive.length === 0) {
  console.log(`archive-handoff: 0 blocks past cutoff ${CUTOFF_DATE}. No-op.`);
  process.exit(0);
}

console.log(`archive-handoff: archiving ${archive.length} block(s) past ${CUTOFF_DATE}.`);

if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

// Group + append to monthly files
const byMonth = {};
for (const b of archive) {
  const month = b.date.slice(0, 7);
  if (!byMonth[month]) byMonth[month] = [];
  byMonth[month].push(b);
}

for (const [month, monthBlocks] of Object.entries(byMonth)) {
  const archivePath = path.join(archiveDir, `${month}.md`);
  monthBlocks.sort((a, b) => (a.date < b.date ? -1 : 1));

  let existing = '';
  if (fs.existsSync(archivePath)) existing = fs.readFileSync(archivePath, 'utf8');

  if (!existing) {
    existing = [
      '---',
      'type: reference',
      'status: archived',
      `last_verified: ${today}`,
      `month: "${month}"`,
      'owner: tech@digitaldsa.com',
      'extracted_from: docs/SESSION-HANDOFF.md',
      '---',
      '',
      `# SESSION-HANDOFF archive — ${month}`,
      '',
      `Session-close blocks from ${month}, ordered chronologically (oldest first). Auto-archived from SESSION-HANDOFF.md when blocks aged past the 14-day rolling window.`,
      '',
      '---',
      '',
    ].join('\n');
  }

  const body = monthBlocks.map((b) => b.content).join('\n\n');
  fs.writeFileSync(archivePath, existing + body + '\n', 'utf8');
  console.log(`  → ${monthBlocks.length} block(s) appended to ${path.relative(root, archivePath)}`);
}

// Regenerate pointer block from archive dir listing (always accurate)
const archiveFiles = fs.readdirSync(archiveDir)
  .filter((f) => /^\d{4}-\d{2}\.md$/.test(f))
  .sort()
  .reverse();

const pointerLines = [
  '',
  '---',
  '',
  POINTER_MARK,
  '## Archived — older session-close blocks',
  '',
  `Blocks dated < ${CUTOFF_DATE} (rolling 14-day cutoff) have been moved to monthly archive files. Last roll: ${today}.`,
  '',
  ...archiveFiles.map((f) => {
    const content = fs.readFileSync(path.join(archiveDir, f), 'utf8');
    const blockCount = (content.match(/^## Context snapshot/gm) || []).length;
    return `- [\`handoff-archive/${f}\`](handoff-archive/${f}) — ${blockCount} blocks`;
  }),
  '',
  'Read archives only when investigating a specific past decision.',
  '',
];

// Rebuild active file
const headBlock = lines.slice(0, firstHistoryIdx).join('\n');
const keptContent = keep
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map((b) => b.content)
  .join('\n');

const newText = headBlock + '\n' + keptContent + '\n' + pointerLines.join('\n') + '\n';
fs.writeFileSync(handoffPath, newText, 'utf8');

console.log(`archive-handoff: SESSION-HANDOFF.md ${lines.length} → ${newText.split('\n').length} lines.`);
