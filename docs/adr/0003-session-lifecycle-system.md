# ADR-0003 — `/start` + `/end` session-lifecycle system

**Status**: Accepted
**Date**: 2026-05-14
**Session**: S98

---

## Context

This codebase is worked on across many sessions. Each Claude Code session starts with no memory of previous sessions — only the files auto-loaded from `CLAUDE.md` (~40KB of technical truth), `MEMORY.md` (~8KB of user preferences), and whatever the user manually instructs.

During the 2026-05-14 design conversation, the user articulated the actual pain:

> "Problem is Claude Code forgets context of one session in another even if I try so hard it forgets the protocols, standards or instructions. If you can prepare a system which never miss anything I am way happy to adopt your suggestions. I just want to write a single line next session and it should start working flawlessly there then only I will be able to complete all these."

The pain has five distinct mechanisms:

1. **Cross-session forgetting** — verbal instructions don't persist
2. **Mid-session drift** — early context fades as the session grows
3. **Verbal instructions** ("from now on do X") don't get written anywhere
4. **Skipping protocols when busy** — no automatic enforcement
5. **"Where did we leave off" confusion** — no standard handoff format

These compound: the user is reluctant to commit to a multi-week architecture migration because each session drifts and effort gets wasted re-explaining context.

## Decision

**We will adopt a six-layer session-lifecycle system that makes one-line invocation sufficient to resume any project state.**

The layers:

1. **`CLAUDE.md` + `MEMORY.md`** (already in place) — auto-loaded every session; durable technical truth and user preferences
2. **SessionStart hook** ([`.claude/hooks/session-state.py`](../../.claude/hooks/session-state.py)) — injects current branch, last commit, active-handoff summary, and next architecture-evolution item into the session context before the user types anything
3. **`/start` command** ([`.claude/commands/start.md`](../../.claude/commands/start.md)) — universal session opener; reads `SESSION-HANDOFF.md`, `ARCHITECTURE-EVOLUTION.md`, git state; presents a numbered plain-English menu of likely next actions; routes to the appropriate protocol on user choice
4. **`/end` command** ([`.claude/commands/end.md`](../../.claude/commands/end.md)) — atomic session close; audits work done, decisions, drifts, in-flight items; proposes doc updates with diff previews; applies on approval
5. **Auto-detect wrap-up intent** (rule in [`MEMORY.md`](../../../../../C:/Users/OJ/.claude/projects/F--TECH-DigitalDSA-REPOs-DigitalDSA-V3/memory/MEMORY.md)) — when the user says "let's stop" / "wrap up" / similar, do NOT immediately run `/end`; first audit what's pending and present a numbered close plan
6. **PreToolUse protocol guards** ([`.claude/hooks/protocol-guards.py`](../../.claude/hooks/protocol-guards.py)) — block dangerous Bash patterns (force push, branch switch, rm -rf, Co-Authored-By in commits, git config modifications) before they execute; turns descriptive rules in CLAUDE.md §16 into enforced rules

Plus a supporting cast:

7. **Protocol files** in [`.claude/protocols/`](../../.claude/protocols/) — durable, copy-pasteable instructions for executing each migration type (Zod migration, BOLA audit, load-function migration, code-review fix). The user never invokes these directly — `/start` routes to them based on the menu choice.
8. **The roadmap** at [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — the long-term plan that `/start` reads to know what's next, and that `/end` updates to reflect what was done.
9. **ADRs** in [`docs/adr/`](.) — capture significant decisions with their rationale.

## Consequences

**Positive:**
- The user can type `/start` in ANY session and get the full pending state in 5 seconds, with no manual context-loading
- `/end` is the only writer to handoff/changelog/roadmap docs — they only change at session boundaries, making them predictable and reviewable
- Wrap-up auto-detection means the user doesn't need to remember to type `/end` — saying "let's stop" surfaces the right prompt
- PreToolUse hooks turn CLAUDE.md §16 rules from "things to remember" into "things the system enforces" — humans (and Claude) can't accidentally violate them
- New contributors get oriented faster — the menu shows them what work is pending, the protocols show them how to do it
- Cross-project usefulness — the same `/start` + `/end` pattern works in any project that adopts the doc structure (just copy the `.claude/` directory and adjust the roadmap)

**Negative:**
- More moving parts to maintain — `/start` semantics, `/end` semantics, hook scripts, protocol files. A bug in any of them affects every session.
- The auto-load surface grows — every additional file or hook is more context every session pays for in tokens. We're explicitly within the documented caps (CLAUDE.md ≤40KB, MEMORY.md ≤8KB / 150 lines) but the budget is consumed.
- The system is project-specific (`.claude/` is project-local) — porting to another project requires copying and adapting all the pieces.
- PreToolUse hooks can have false positives (e.g., a legitimate use of `git config --get` is allowed; we had to whitelist that). Maintenance burden when expanding the block list.

**Mitigations:**
- The protocols are pure prose — no code path can break them; just read and follow.
- Hook scripts have explicit "fail open" semantics: if the hook crashes or the input is malformed, the action is allowed. We prefer missing a block to breaking a legitimate workflow.
- The protocol-guards regex set is small and tested (see the script's docstring); expansion is conservative.

## Alternatives Considered

### Alternative A — Rely on CLAUDE.md and verbal instructions only

Keep doing what we're doing. Each session, the user re-establishes context manually. No `/start`, no `/end`, no protocols.

**Rejected because:**
- The whole conversation that produced this ADR started because of the pain of this approach
- The 2026-05-14 enterprise review found that the prior daily review's "3 files use json()" was wrong (actual 159) — drift like that is exactly what the lifecycle system prevents

### Alternative B — One big slash command per task

Have `/zod`, `/bola`, `/load-migrate`, `/cert-pinning`, etc. — many narrow commands the user invokes for specific work.

**Rejected because:**
- The user explicitly said: "I work on many projects. I can't remember all the slash commands."
- The "one universal opener that routes intelligently" pattern (`/start`) is strictly better UX
- Per-task commands still exist internally as protocols — they just aren't user-facing slash commands

### Alternative C — Build a separate planning/state tool (Notion, Linear, custom web UI)

Move the roadmap and session state into a dedicated external tool with a richer UI.

**Rejected because:**
- Every external tool is another credential to rotate, another integration to maintain, another place state can drift
- Markdown files in the repo are version-controlled — state moves with the code, can be diffed, doesn't need a separate auth system
- The user already has the file-based pattern working (SESSION-HANDOFF.md, CHANGELOG.md, DEVELOPMENT-PLAN.md) — this ADR just makes it complete, not relocates it

### Alternative D — Adopt the Claude Code "Skill" pattern more aggressively

Build everything as Skills (the project has 30+ already from various plugins). Skip the protocol files.

**Rejected because:**
- Skills are good for self-contained workflows; protocols here are reference material the model consults during work, not standalone workflows
- The Skills system loads Skills on-demand by keyword match — but during a specific protocol's execution, we need the protocol's content to be reliably present, not subject to keyword detection
- Both can coexist — Skills for workflow entry points (`/start`, `/end`, `/daily-review`), protocols for reference during execution

## Validation

The system is considered working when, in a fresh session:

1. Typing `/start` produces a sub-15-second response with: branch, test count, last commit, next pending item, and 4-6 numbered options
2. Picking option "1" (continue next item) reads the appropriate protocol and proceeds without further context-setting from the user
3. Saying "let's wrap up" produces a close-plan, not an immediate `/end` run
4. Typing `/end` produces a proposal-then-approve flow that updates exactly the right docs (no silent writes)
5. The next session opening with `/start` reflects the changes from the prior session's `/end`

This was tested via build-then-self-verify in session S98. End-to-end testing happens organically in subsequent sessions.

## References

- [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — the roadmap the system reads/writes
- [`.claude/commands/start.md`](../../.claude/commands/start.md) — `/start` protocol
- [`.claude/commands/end.md`](../../.claude/commands/end.md) — `/end` protocol
- [`.claude/protocols/`](../../.claude/protocols/) — per-task protocol library
- [`.claude/hooks/session-state.py`](../../.claude/hooks/session-state.py) — SessionStart context injector
- [`.claude/hooks/protocol-guards.py`](../../.claude/hooks/protocol-guards.py) — PreToolUse Bash guards
- [ADR-0001](0001-no-v4-repo.md) — the prerequisite decision (no V4 repo) that makes this incremental approach viable
