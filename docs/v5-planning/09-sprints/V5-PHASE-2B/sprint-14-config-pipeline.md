---
type: sprint
phase: V5-PHASE-2B
sprint: 14
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 14 — Config Pipeline + Hinglish + Knowledge + Reports (Weeks 29-30)

## Goal

Multiple smaller items in parallel: config-driven pipeline stages, Hinglish locale first-class, Knowledge Center, Reports module.

## Scope

### Config-driven pipeline stages

- Move `CaseStage` from TS enum to `pipeline_config` collection
- Per-org pipeline override possible
- Admin UI for stage editing
- A-6 acceptance: add new stage via UI, no code deploy

### Hinglish locale

- `packages/i18n/src/hi-en.ts` first-class file
- Native-speaker copywriter review
- Locale picker on first-run
- Voice input recognises Hinglish (`hi-IN`)

### Knowledge Center

- Markdown-backed routes under `/knowledge`
- Sections: Policies · Product Guides · SOPs · FAQ
- Per-locale content
- In-context links from case detail and engine result

### Reports module

- `/reports` under More pillar
- Tabs: Sales · Operations · Finance · Team
- Pre-built dashboards from ClickHouse
- CSV export
- Mobile-friendly cards; desktop tables

## Tasks

| Task | Acceptance |
|---|---|
| Pipeline config collection | CRUD |
| Stage transition validation reads config | Tested |
| Admin UI to edit stages | A-6 passes |
| Hinglish locale file | First 100 screens populated |
| Native-speaker review | Owner approval on first 20 screens |
| Knowledge Center routes + Markdown loader | 10 initial articles |
| Reports module dashboards | 4 tabs × 3 reports each = 12 reports |
| ClickHouse queries for reports | Cached; performant |
| CSV export | Works on each report |

## Tests

- Add a pipeline stage via admin → appears in app without code change
- Hinglish renders for every Sprint 4 screen
- Reports show correct totals (cross-check vs Mongo)

## Decisions needed

- None (defaults apply)

## Exit criteria

- FR-CASE-2 config-driven satisfied
- A-6 passes
- Hinglish first-class
- Knowledge Center live with 10 articles
- Reports module live with 12 reports

## Owner involvement

3-5 hours/day. Hinglish copy review is high-touch.
