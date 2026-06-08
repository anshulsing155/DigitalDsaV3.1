# Archived Code — Store Layer

This directory contains deprecated and archived code from the store layer, organized by category and archival phase.

## Archive Structure

```
_archive/
├── README.md                           # This file
├── legacy-shims/
│   ├── _bridge.ts                      # Deprecated Svelte 4 bridge stub (Phase 1)
│   └── (TBD: auth-bridge.svelte.ts in Phase 7)
├── auth-v1/                            # (TBD: v1 auth implementation)
└── commented-code/                     # (TBD: multi-line commented blocks)
```

## Archived Files

### Phase 1: Deprecated Bridge Files (Completed 2026-02-27)

**`legacy-shims/_bridge.ts`** — Svelte 4 bridge stub

- **Reason**: Explicitly marked as deprecated. All bridge utilities migrated to `_bridge.svelte.ts` which supports Svelte 5 runes.
- **Archived**: 2026-02-27
- **Restoration**: `git show 7678e225:src/lib/stores/_bridge.ts`
- **Impact**: No active code depends on this file; it was a compatibility shim only.
- **Next step**: Delete from active codebase when no possibility of rollback needed.

### Phase 2: Submission Pipeline Rewrite — S77c (Completed 2026-04-21)

**`legacy-shims/cleanPayloadStore.ts`** — Svelte 4 store-compatible bridge over the runes module

- **Reason**: The canonical source is `src/lib/stores/cleanPayloadStore.svelte.ts` (runes). This shim exposed store-compatible `$cleanPayload` / `$casePayload` auto-subscription plus pass-through function re-exports. All consumers migrated to the runes module as part of S77c Phase 3 (PayloadDebugger + 6 form pages). No live importers remain.
- **Archived**: 2026-04-21
- **Restoration**: `git show <pre-S77c-commit>:src/lib/stores/cleanPayloadStore.ts` — the S77c pre-archival copy. Content is also preserved verbatim inside `legacy-shims/cleanPayloadStore.ts` with corrected relative imports so it type-checks if re-instated.
- **Impact**: None — live tombstone at `src/lib/stores/cleanPayloadStore.ts` exports nothing. Accidental resurrected imports will fail at type-check with a clear "Module has no exported member X" error.
- **Next step**: Delete the live tombstone file when workspace policy permits physical file removal.

## Archival Policy

All archived code follows these principles:

1. **Archive, don't delete** — Code stays in git history with full traceability
2. **Preserve in \_archive/** — Organized by type (legacy-shims, deprecated-apis, etc.)
3. **Add archival headers** — Dated comments explain why code was archived
4. **Update imports** — Only reference active code, not archived code
5. **Document restoration path** — Include notes on how to restore if needed
6. **Prove zero importers with a literal command** — every archival entry must
   include the ripgrep/grep command used to verify no live importers remain
   (e.g. `` rg "from ['\"]\$lib/stores/cleanPayloadStore['\"]" src/ ``), plus
   its output trimmed to the set of "dead" matches. Prose summaries like
   "only inbound edge was X" have been wrong in practice — see the form-layer
   README (`src/lib/form/_archive/README.md`) 2026-04-21 S77b-4B correction
   for a case study where a relative-path import (`./schema`) was missed.
   A copy-pasteable command is re-executable by future sessions and
   self-auditing, and forces the archiver to cover relative-path as well as
   `$lib/...` imports. This policy is mirrored in the form-layer archive
   README to preserve the subsystem-agnostic archival-policy invariant.

## Future Phases

### Phase 2: Legacy Store Exports (Pending)

- Audit `stores.ts` and individual legacy store files
- Mark Phase 7 candidates for eventual migration
- Archive after all components migrated to runes-based state

### Phase 3: Console Statements (Pending — Phase 8)

- Migrate 111 console statements to structured logger
- Effort: 2-3 hours

### Phase 4: Commented Code (Pending — Phase 9)

- Archive multi-line commented blocks
- Effort: 4-5 hours

## Git References

For detailed archival strategy and planning, see: `docs/ARCHIVAL-STRATEGY.md`

## Questions?

If you need to restore archived code or understand why something was archived, check:

1. The archival header comment at the top of the archived file
2. The commit hash listed in the header (use `git show <commit>:<path>`)
3. This README.md for phase descriptions
4. `docs/ARCHIVAL-STRATEGY.md` for comprehensive strategy
