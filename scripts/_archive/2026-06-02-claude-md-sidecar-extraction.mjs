#!/usr/bin/env node
/**
 * One-shot surgery: extract CLAUDE.md §3, §4, §14 into sidecar files and
 * replace each section body in CLAUDE.md with a short pointer.
 *
 * Idempotent — refuses to run if the sidecar files already exist.
 *
 * Delete this script after surgery lands.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const claudePath = path.join(root, 'CLAUDE.md');
const original = fs.readFileSync(claudePath, 'utf8');

const sidecars = [
  path.join(root, 'docs/PITFALLS-INDEX.md'),
  path.join(root, 'docs/PREFLIGHT-GREPS.md'),
  path.join(root, 'docs/FILE-MAP.md'),
];

for (const f of sidecars) {
  if (fs.existsSync(f)) {
    console.error(`Refusing to run — sidecar already exists: ${f}`);
    process.exit(1);
  }
}

const lines = original.split('\n');

const findLine = (re) => {
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i;
  }
  return -1;
};

const i3  = findLine(/^## 3\. CRITICAL PITFALLS/);
const i4  = findLine(/^## 4\. PRE-FLIGHT GREP CHECKS/);
const i5  = findLine(/^## 5\. DONE CHECKLIST/);
const i14 = findLine(/^## 14\. KEY FILE PATHS/);
const i15 = findLine(/^## 15\. TOOLING CONVENTIONS/);

if ([i3, i4, i5, i14, i15].some((x) => x === -1)) {
  console.error(`Anchor not found — i3=${i3} i4=${i4} i5=${i5} i14=${i14} i15=${i15}`);
  process.exit(2);
}

// Section body = everything after the heading line, up to BUT NOT INCLUDING
// the next section's heading.
const bodySection3  = lines.slice(i3 + 1,  i4 ).join('\n');
const bodySection4  = lines.slice(i4 + 1,  i5 ).join('\n');
const bodySection14 = lines.slice(i14 + 1, i15).join('\n');

const today = '2026-06-02';
const frontmatter = (extra) => `---
type: reference
status: active
last_verified: ${today}
owner: tech@digitaldsa.com
extracted_from: CLAUDE.md
${extra}---

`;

// ─── Sidecar 1: PITFALLS-INDEX.md ─────────────────────────────────────────
const pitfallsIndex = frontmatter('section: "§3 — Critical Pitfalls Index"\n') +
`# Pitfalls Index

This file holds the 68-row pitfall index that used to live in CLAUDE.md §3. Full pitfall bodies (wrong → right → why → detection → enforcement) live in [\`PITFALLS.md\`](PITFALLS.md). Pre-flight greps live in [\`PREFLIGHT-GREPS.md\`](PREFLIGHT-GREPS.md).

This file is loaded on-demand when working on a feature area whose pitfalls are relevant, NOT auto-loaded into every session — that's a deliberate cache-discipline choice (CLAUDE.md edits would bust the prompt cache; sidecar edits don't).

${bodySection3}
`;

// ─── Sidecar 2: PREFLIGHT-GREPS.md ────────────────────────────────────────
const preflightGreps = frontmatter('section: "§4 — Pre-Flight Grep Checks"\n') +
`# Pre-Flight Grep Checks

This file holds the per-pitfall grep recipes that used to live in CLAUDE.md §4. Each grep is a 5-second sanity scan paired with a pitfall in [\`PITFALLS-INDEX.md\`](PITFALLS-INDEX.md) / [\`PITFALLS.md\`](PITFALLS.md).

Before claiming "done" on any non-trivial change, run the greps scoped to your change area. \`/end\` should also fan these out as part of its verification Workflow.

Add a new grep when you add a new pitfall. The grep IS the pitfall's regression test until a CI lock test exists.

${bodySection4}
`;

// ─── Sidecar 3: FILE-MAP.md ───────────────────────────────────────────────
const fileMap = frontmatter('section: "§14 — Key File Paths"\n') +
`# File Map — Where Things Live

This file holds the "I need to..." lookup table + sub-system path map that used to live in CLAUDE.md §14. Loaded on-demand when finding code; not auto-loaded (paths drift across refactors, and the lookup is mostly only needed at the start of a task).

${bodySection14}
`;

fs.writeFileSync(sidecars[0], pitfallsIndex, 'utf8');
fs.writeFileSync(sidecars[1], preflightGreps, 'utf8');
fs.writeFileSync(sidecars[2], fileMap, 'utf8');

// ─── Replace CLAUDE.md sections with pointers ────────────────────────────

const pointerSection3 = [
  '## 3. CRITICAL PITFALLS',
  '',
  '**Catalog** (full bodies): [`docs/PITFALLS.md`](docs/PITFALLS.md)  ·  **Index** (68 rows): [`docs/PITFALLS-INDEX.md`](docs/PITFALLS-INDEX.md)  ·  **Greps**: [`docs/PREFLIGHT-GREPS.md`](docs/PREFLIGHT-GREPS.md)',
  '',
  'Sidecars are loaded on-demand when working in the relevant area. NOT auto-loaded into every session — that\'s a deliberate cache-discipline choice (edits to PITFALLS-INDEX.md or PREFLIGHT-GREPS.md don\'t bust CLAUDE.md\'s prompt cache).',
  '',
  'When you suspect a pitfall is no longer applicable, mark it `(verified obsolete YYYY-MM-DD)` in PITFALLS.md rather than deleting. Add new pitfalls there following the existing template (wrong → right → why → detection → enforcement → last verified).',
  '',
  '',
].join('\n');

const pointerSection4 = [
  '## 4. PRE-FLIGHT GREP CHECKS',
  '',
  'Full catalog at [`docs/PREFLIGHT-GREPS.md`](docs/PREFLIGHT-GREPS.md) (extracted 2026-06-02 to keep CLAUDE.md cache-warm). Each grep is paired with a pitfall in [`docs/PITFALLS-INDEX.md`](docs/PITFALLS-INDEX.md).',
  '',
  'Before claiming "done" on a non-trivial change, run the greps scoped to your change area. `/end` fans these out as part of its verification Workflow (planned).',
  '',
  'Add a new grep when you add a new pitfall. The grep IS the pitfall\'s regression test until a CI lock test exists.',
  '',
  '',
].join('\n');

const pointerSection14 = [
  '## 14. KEY FILE PATHS',
  '',
  'Full lookup at [`docs/FILE-MAP.md`](docs/FILE-MAP.md) (extracted 2026-06-02). Covers the "I need to..." table + sub-system path maps (server utilities, company/director, rule engine, form wizard, i18n, docs read order, session lifecycle).',
  '',
  'Read FILE-MAP.md when you need to find WHERE something lives. Paths drift across refactors, so prefer this lookup over memorized paths.',
  '',
  '',
].join('\n');

// Splice the new pointers in. Walk back-to-front so earlier indices stay valid.
const newLines = [...lines];
newLines.splice(i14, i15 - i14, ...pointerSection14.split('\n'));
newLines.splice(i4,  i5  - i4,  ...pointerSection4.split('\n'));
newLines.splice(i3,  i4  - i3,  ...pointerSection3.split('\n'));

fs.writeFileSync(claudePath, newLines.join('\n'), 'utf8');

const linesBefore = lines.length;
const linesAfter = newLines.length;
console.log(`Done.`);
console.log(`  CLAUDE.md:        ${linesBefore} → ${linesAfter} lines (Δ ${linesAfter - linesBefore})`);
console.log(`  PITFALLS-INDEX:   ${pitfallsIndex.split('\n').length} lines`);
console.log(`  PREFLIGHT-GREPS:  ${preflightGreps.split('\n').length} lines`);
console.log(`  FILE-MAP:         ${fileMap.split('\n').length} lines`);
