#!/usr/bin/env node
/**
 * Archive CHANGELOG.md entries past the cutoff into
 * docs/changelog-archive/YYYY-MM.md monthly files. Regenerate (a) the
 * index table at the top (50 most-recent kept entries) and (b) the tail
 * pointer listing all archive months.
 *
 * Default cutoff: today - 30 days. Override with `--cutoff=YYYY-MM-DD`.
 *
 * Idempotent: re-runs are no-ops if nothing crossed the cutoff. Safe to
 * call from `/end` every session.
 *
 * The "active" entries are those between the INDEX marker and the TAIL
 * marker (or between first `### YYYY-MM-DD` and EOF for first-run).
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const changelogPath = path.join(root, 'docs/CHANGELOG.md');
const archiveDir = path.join(root, 'docs/changelog-archive');
const INDEX_MARK = '<!-- CHANGELOG_INDEX -->';
const TAIL_MARK = '<!-- CHANGELOG_ARCHIVE_TAIL -->';

function parseCutoff() {
  const arg = process.argv.find((a) => a.startsWith('--cutoff='));
  if (arg) return arg.slice('--cutoff='.length);
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

const CUTOFF_DATE = parseCutoff();
const today = new Date().toISOString().slice(0, 10);

if (!fs.existsSync(changelogPath)) {
  console.error(`archive-changelog: ${changelogPath} not found.`);
  process.exit(1);
}

const text = fs.readFileSync(changelogPath, 'utf8');
const lines = text.split('\n');

// First entry position
const firstEntryIdx = lines.findIndex((ln) => /^### \d{4}-\d{2}-\d{2}/.test(ln));
if (firstEntryIdx === -1) {
  console.log('archive-changelog: no entries found.');
  process.exit(0);
}

// Active end = tail-marker position OR "## Older archives" heading (legacy
// tail format without marker) OR end of file.
let tailIdx = lines.findIndex((ln) => ln.includes(TAIL_MARK));
if (tailIdx === -1) {
  // Fallback for legacy state: stop at the first "## Older archives" heading.
  // This rare-path keeps a re-run from re-absorbing the old tail into the last entry's body.
  tailIdx = lines.findIndex((ln, idx) => idx > 0 && /^## Older archives\s*$/.test(ln));
}
const activeEndIdx = tailIdx === -1 ? lines.length : tailIdx;

// Parse entries within [firstEntryIdx, activeEndIdx)
const entries = [];
let i = firstEntryIdx;
while (i < activeEndIdx) {
  if (!/^### \d{4}-\d{2}-\d{2}/.test(lines[i])) { i++; continue; }
  const m = lines[i].match(/^### (\d{4}-\d{2}-\d{2})([^\n]*)/);
  const date = m[1];
  const title = m[2].trim();
  const startIdx = i;
  let endIdx = i + 1;
  while (endIdx < activeEndIdx && !/^### \d{4}-\d{2}-\d{2}/.test(lines[endIdx])) endIdx++;
  entries.push({ date, title, content: lines.slice(startIdx, endIdx).join('\n') });
  i = endIdx;
}

const keep = entries.filter((e) => e.date >= CUTOFF_DATE);
const archive = entries.filter((e) => e.date < CUTOFF_DATE);

// If nothing crosses cutoff AND the file already has index+tail markers, no-op.
const hasIndex = lines.findIndex((ln) => ln.includes(INDEX_MARK)) !== -1;
const hasTail = tailIdx !== -1;
if (archive.length === 0 && hasIndex && hasTail) {
  console.log(`archive-changelog: 0 entries past cutoff ${CUTOFF_DATE} and markers present. No-op.`);
  process.exit(0);
}

if (archive.length > 0) {
  console.log(`archive-changelog: archiving ${archive.length} entry/entries past ${CUTOFF_DATE}.`);
} else {
  console.log(`archive-changelog: 0 entries past cutoff — refreshing index + tail markers only.`);
}

if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

// Group archives by month + append
const byMonth = {};
for (const e of archive) {
  const month = e.date.slice(0, 7);
  if (!byMonth[month]) byMonth[month] = [];
  byMonth[month].push(e);
}

for (const [month, monthEntries] of Object.entries(byMonth)) {
  const archivePath = path.join(archiveDir, `${month}.md`);
  monthEntries.sort((a, b) => (a.date < b.date ? -1 : 1));

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
      'extracted_from: docs/CHANGELOG.md',
      '---',
      '',
      `# CHANGELOG archive — ${month}`,
      '',
      `Session entries from ${month}, ordered chronologically (oldest first). Auto-archived from CHANGELOG.md when entries aged past the 30-day rolling window.`,
      '',
      '---',
      '',
    ].join('\n');
  }

  const body = monthEntries.map((e) => e.content).join('\n\n');
  fs.writeFileSync(archivePath, existing + body + '\n', 'utf8');
  console.log(`  → ${monthEntries.length} entry/entries appended to ${path.relative(root, archivePath)}`);
}

// Regenerate INDEX block (50 most-recent kept entries)
const indexRows = keep
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .slice(0, 50)
  .map((e) => `| ${e.date} | ${e.title.replace(/\|/g, '\\|').slice(0, 100)} |`);

const indexBlock = [
  INDEX_MARK,
  '## Active index (most-recent 50 entries)',
  '',
  `Active file holds entries dated ≥ ${CUTOFF_DATE} (rolling 30-day window). Older entries are in monthly archives — see "Older archives" at the bottom of this file.`,
  '',
  '| Date | Title |',
  '|---|---|',
  ...indexRows,
  '',
  '---',
  '',
].join('\n');

// Regenerate TAIL pointer from current archive dir listing
const archiveFiles = fs.readdirSync(archiveDir)
  .filter((f) => /^\d{4}-\d{2}\.md$/.test(f))
  .sort()
  .reverse();

const tailLines = [
  '',
  '---',
  '',
  TAIL_MARK,
  '## Older archives',
  '',
  `Entries dated before the 30-day window have been rolled into monthly archive files. Last roll: ${today}.`,
  '',
  ...archiveFiles.map((f) => {
    const content = fs.readFileSync(path.join(archiveDir, f), 'utf8');
    const entryCount = (content.match(/^### \d{4}-\d{2}-\d{2}/gm) || []).length;
    return `- [\`changelog-archive/${f}\`](changelog-archive/${f}) — ${entryCount} entries`;
  }),
  '',
  'Read archives only when investigating a specific past decision.',
  '',
];

// Head = everything before the first INDEX_MARK if present, else before firstEntryIdx
const existingIndexIdx = lines.findIndex((ln) => ln.includes(INDEX_MARK));
const headEndIdx = existingIndexIdx !== -1 ? existingIndexIdx : firstEntryIdx;
const headBlock = lines.slice(0, headEndIdx).join('\n');

const keptContent = keep
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map((e) => e.content)
  .join('\n');

const newText = headBlock + '\n' + indexBlock + '\n' + keptContent + '\n' + tailLines.join('\n') + '\n';
fs.writeFileSync(changelogPath, newText, 'utf8');

console.log(`archive-changelog: CHANGELOG.md ${lines.length} → ${newText.split('\n').length} lines.`);
