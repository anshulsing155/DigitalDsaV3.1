---
type: reference
status: archived
last_verified: 2026-06-02
archived_on: 2026-06-02
owner: tech@digitaldsa.com
---

# Archived Session Prompts

This folder contains 14 `SESSION-N-PROMPT.md` files (S53–S66, dated 2026-04-04 → 2026-04-09) that were used as session-starter prompts before the `/start` slash command existed.

## Why archived

Once `/start` was introduced (see `.claude/commands/start.md`), these per-session prompt files became dead weight:
- `/start` dynamically computes "what's next" from live state (git, SESSION-HANDOFF, DEVELOPMENT-PLAN) rather than a pre-written file
- The session-state.py hook surfaces the same info at session-open
- The per-session prompts were a snapshot-in-time, never updated after their session

None of these are referenced anywhere in the codebase or documentation as of the archival date.

## Why kept (not deleted)

Per CLAUDE.md §16 hard-rule #4 — "never delete files, move to `_archive/`". The institutional memory of "this is how we used to bootstrap sessions before /start" has value for future archaeology even if the files themselves are no longer used.

## Contents

| File | Date | Purpose |
|---|---|---|
| SESSION-53-PROMPT.md | ~2026-04-04 | Pre-`/start` session starter |
| SESSION-54-PROMPT.md | ~2026-04-04 | Pre-`/start` session starter |
| SESSION-55-PROMPT.md | ~2026-04-05 | Pre-`/start` session starter |
| SESSION-56-PROMPT.md | ~2026-04-05 | Pre-`/start` session starter |
| SESSION-57-PROMPT.md | ~2026-04-06 | Pre-`/start` session starter |
| SESSION-58-PROMPT.md | ~2026-04-06 | Pre-`/start` session starter |
| SESSION-59-PROMPT.md | ~2026-04-07 | Pre-`/start` session starter |
| SESSION-60-PROMPT.md | ~2026-04-07 | Pre-`/start` session starter |
| SESSION-61-PROMPT.md | ~2026-04-08 | Pre-`/start` session starter |
| SESSION-62-PROMPT.md | ~2026-04-08 | Pre-`/start` session starter |
| SESSION-63-PROMPT.md | ~2026-04-09 | Pre-`/start` session starter |
| SESSION-64-PROMPT.md | ~2026-04-09 | Pre-`/start` session starter |
| SESSION-65-PROMPT.md | ~2026-04-09 | Pre-`/start` session starter |
| SESSION-66-PROMPT.md | ~2026-04-09 | Pre-`/start` session starter |

## Current state replacement

Session prompts → `/start` slash command + `session-state.py` SessionStart hook
Per-session continuity → structured `# Active Handoff` block in `SESSION-HANDOFF.md`
Decisions / drift / in-flight tracking → `/end` slash command (Step 2b classifier)
