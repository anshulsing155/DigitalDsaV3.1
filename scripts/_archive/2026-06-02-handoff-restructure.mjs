#!/usr/bin/env node
/**
 * One-shot surgery: replace lines 1–68 of docs/SESSION-HANDOFF.md
 * (file header + giant `> **Updated**:` blockquote + old "Active Handoff —
 * START HERE" section through "Pick up Pass 2…") with the new 4-subsection
 * structure (Highway / Deroute Stack / Stale In-Flight / Drift Since Last Close).
 *
 * Idempotent: refuses to run if the new top marker is already present.
 * Anchors:
 *   start = "# Session Handoff — Automated Context Preservation"
 *   end   = "Pick up Pass 2 after the field-nomenclature rename completes."
 *
 * Delete this script after the surgery lands.
 */

import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.cwd(), 'docs/SESSION-HANDOFF.md');
const original = fs.readFileSync(target, 'utf8');

const startAnchor = '# Session Handoff — Automated Context Preservation';
const endAnchor   = 'Pick up Pass 2 after the field-nomenclature rename completes.';
const guardAnchor = '## 🛣️ Current Highway';

if (original.includes(guardAnchor)) {
  console.error('Refusing to run — new structure already present in SESSION-HANDOFF.md.');
  process.exit(1);
}

const startIdx = original.indexOf(startAnchor);
const endIdxRaw = original.indexOf(endAnchor);
if (startIdx === -1 || endIdxRaw === -1) {
  console.error('Anchor not found — aborting.');
  console.error(`  start present: ${startIdx !== -1}`);
  console.error(`  end present:   ${endIdxRaw !== -1}`);
  process.exit(2);
}
const endIdx = endIdxRaw + endAnchor.length;

const newTop = `# Session Handoff — Automated Context Preservation

> **Purpose**: Single source of truth for session continuity. Read the **Active Handoff** block below FIRST every session. Historical sessions preserved further down.
>
> **Last \`/end\`**: 2026-06-01 (S204) @ \`4fc0cc99\`  ·  **Current \`main\`**: \`eef65853\`
> **Status**: ⚠️ **DRIFT DETECTED** — 7 commits + working-tree changes since last close; needs \`/end\` reconciliation. See **📋 Drift Since Last Close** below.

---

# Active Handoff — START HERE

## 🛣️ Current Highway

**Item:** **Epic E.1 — DPDP §11 self-export** (Compliance Epic kickoff) + opportunistic RM dashboard polish

**Spec / ADR:** [\`docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md\`](specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md) §E.1

**Started:** ~2026-06-02 (S205) · **Last touched:** HEAD (uncommitted working tree)

**Progress so far:**
- ✅ Server side: DPDP §11 export job + endpoint (\`00713f84\`)
- ✅ UI: DSA + RM profile section (\`7e7012a2\`)
- ✅ QBC notification emails (\`32b1fe97\`) — closes 2026-06-01 P1 follow-up
- ✅ Plot-variant stash registry (\`32b1fe97\`) — closes 2026-06-01 P1 item 4 (engine-level generalization shipped: data-driven \`{loanName, scopeField, scopeValue, gatedField, stashKey}\` registry + \`applyVariantStashRules()\` helper; adding a new variant-gated question is now a one-row append)
- ✅ Closed 7 findings from CODE-REVIEW-2026-05-30 (\`76916f2d\`)
- ✅ RM dashboard polish — suggestedDsas + pipeline funnel (\`eef65853\`); UI cleanups (\`22ac48c4\`); active-versions scope fix (\`9d040139\`)
- 🟡 **Working-tree in-flight (9 modified + 3 untracked):** login, rm-onboarding, dashboard/+layout, dsa/profile, rm/{cases,communication,settings,submissions,index}, plus untracked \`docs/reviews/CODE-REVIEW-2026-05-30.md\`, \`CONTRAST-AUDIT-2026-05-30.md\`, \`src/lib/components/account/\` — likely continuation of Epic E.1 UI + RM polish

**Resume from:** uncommitted working tree — decide per-file: land, stash, or roll into next commit. Then either keep advancing Epic E.1 or pop a stack item.

---

## 🚨 Deroute Stack (top = most recent push)

> 2 paused items. Pop order is owner's call, not automatic.

### 1. **Submit/edit ConfirmModal redesign**
- **Pushed:** 2026-06-01 (S204, session-2)
- **State:** 🟡 BLOCKED on 5 owner decisions: (a) headline copy · (b) icon choice · (c) exhausted-state UX · (d) in-flight footer policy · (e) quota badge wording
- **Implementation ready:** additive API on \`dialogState.openConfirmModal\` (\`badge?\` + \`footerNote?\`) + new \`getInFlightCase(dsaId)\` helper + per-loan \`+page.server.ts\` threading. ~2 hours to ship once decisions land.
- **Age:** 1 session
- **Action when popped:** surface the 5 decisions to owner at next natural pause; ship in one shot

### 2. **SEC-8 AWS SES production-access**
- **Pushed:** 2026-05-27
- **State:** ⏸ EXTERNAL WAIT — AWS Support case \`177987930900751\` (24–72 hr review window opened 2026-05-27)
- **Implementation status:** code is live (\`src/lib/server/emailProviders/sesProvider.ts\`); sandbox-mode sends work to verified recipients; production-recipient sends gated on AWS approval
- **Age:** 5+ sessions
- **Action when popped:** check case status in AWS console; if approved, flip to production mode + smoke; if still pending, no-op

---

## ⚠️ Stale In-Flight

> Items not touched in 3+ sessions. Surfaces silent rot.

### **LEND-1 — Plot & Equity Loan Phases 2-4**
- **Last touched:** S200 (2026-05-29, spec ship)
- **Sessions idle:** 4 ⚠️
- **State:** ready to start; was sequenced after loan-field nomenclature (now done)
- **Spec:** [\`docs/specs/PLOT-EQUITY-LOAN-DESIGN.md\`](specs/PLOT-EQUITY-LOAN-DESIGN.md) + [ADR-0021](adr/0021-plot-equity-loan-modeling.md)
- **Action:** explicit pickup at next natural slot

### **RM Questionnaire Pass 2**
- **Last touched:** S195 (2026-05-27)
- **Sessions idle:** 6+ 🚨 (past 5-session escalation threshold)
- **State:** 4 owner questions still owed — Page 0 lead-or-trail / branch dedup granularity / document answer buckets / Pages 7-12 sub-pass timing
- **Pass 1 inventory:** [\`docs/specs/HOME-LOAN-RM-QUESTIONNAIRE-AUDIT.md\`](specs/HOME-LOAN-RM-QUESTIONNAIRE-AUDIT.md)
- **Action (escalation):** chase owner answers in next session OR demote to "blocked, indefinite" in DEVELOPMENT-PLAN

### **ARCHITECTURE-EVOLUTION.md "Next pending item pointer"**
- **Last refreshed:** 2026-05-29
- **Sessions idle:** 4 ⚠️
- **State:** still says "loan field nomenclature Phase A" — but nomenclature shipped end-to-end 2026-05-31. **Mechanically stale by 4 days.**
- **Action:** \`/end\` should auto-regenerate from this Highway block (planned scaffolding change)

---

## 📋 Drift Since Last Close

> \`/start\` shows this LOUDLY at session-open. \`/end\` reconciles it into the structured sections above.

**7 commits on \`main\` not reflected in prior handoff top block:**

| SHA | Subject |
|---|---|
| \`eef65853\` | feat(dashboard/rm): render suggestedDsas + pipeline funnel on home |
| \`22ac48c4\` | feat(dashboard/rm): UI cleanups — terminology, filters, dead tab, clickable cards |
| \`7e7012a2\` | feat(account): E.1 DPDP §11 self-export — DSA + RM profile UI section |
| \`00713f84\` | feat(account): E.1 DPDP §11 self-export — server side |
| \`76916f2d\` | chore(review): close 7 findings from CODE-REVIEW-2026-05-30 |
| \`32b1fe97\` | feat(billing+form): QBC notification emails + Plot variant stash registry |
| \`9d040139\` | fix(dashboard/rm): scope active-versions query to RM + preserve KPIs on empty threads |

**Working tree (9 modified, 3 untracked):**
- **M:** \`src/routes/(auth)/login/+page.svelte\` · \`src/routes/(onboarding)/rm-onboarding/+page.svelte\` · \`src/routes/dashboard/+layout.svelte\` · \`src/routes/dashboard/dsa/profile/+page.svelte\` · \`src/routes/dashboard/rm/+page.svelte\` · \`src/routes/dashboard/rm/cases/+page.svelte\` · \`src/routes/dashboard/rm/communication/+page.svelte\` · \`src/routes/dashboard/rm/settings/+page.svelte\` · \`src/routes/dashboard/rm/submissions/+page.svelte\`
- **??:** \`docs/reviews/CODE-REVIEW-2026-05-30.md\` · \`docs/reviews/CONTRAST-AUDIT-2026-05-30.md\` · \`src/lib/components/account/\`

**Reconcile action:** next \`/end\` classifies each chunk (highway / new deroute / resolved / discovered / direction change) and folds into the structured sections above.

---

## 🎯 Open task chips (separate sessions, non-blocking)

- IntroGuideHint z-index overlap with sidebar header ("✨ You can access the guide" badge covers "DSA Agent" label)
- Duplicate-looking "Recent Cases" rows on DSA dashboard — investigation needed (label-collision vs data-fetch vs render bug)

---

## 🕘 Long-tail backlog

See [\`docs/DEVELOPMENT-PLAN.md\`](DEVELOPMENT-PLAN.md) § "Next Up — UNIFIED EXECUTION ORDER" (single sequencing authority).

P2 items carried forward: MOB-1 / SEC-1 / SEC-3 Capacitor batch · PERF-2 streaming load · SEC-6 Vercel WAF · archive dead \`homeLoanApi.ts\` + 2 dormant offer pages + 4 dead OFFERS constants + BottomTabs \`/loan-offers\` nav link.

---

## ⏭ Removed from stack since last close

- ✅ **Plot-variant stash registry generalization** — engine-level generalization shipped in \`32b1fe97\` (data-driven registry). Was P1 item 4 on 2026-06-01.
- ✅ **QBC notification email templates** — shipped in \`32b1fe97\`. Was optional QBC follow-up.
- ⛔ **D.6 annual billing backend** — **killed 2026-06-02** per owner decision. Annual was reversed as a product feature in \`cb0f3139\` (2026-05-29); the backend carry-over slice (anchor-stamping / R6 cap at annual amounts) is moot. DEVELOPMENT-PLAN cleaned up to match.

---

> **Historical context snapshots preserved below** — each block represents a prior session close. Read forward from the active block above; drop into history only when investigating a specific past decision.

`;

const newContent = newTop + original.substring(endIdx);

// Strip the orphan blank lines / "---" left by the boundary cut
const cleaned = newContent.replace(
  /Historical context snapshots preserved below[^\n]*\n\n+\n---\n+/,
  (m) => m.replace(/\n---\n+/, '\n')
);

fs.writeFileSync(target, cleaned, 'utf8');
const linesBefore = original.split('\n').length;
const linesAfter = cleaned.split('\n').length;
console.log(`Done. Lines before: ${linesBefore}, after: ${linesAfter} (Δ ${linesAfter - linesBefore}).`);
