/**
 * [TOMBSTONE — archived 2026-04-21, S77c Phase 3.3]
 * ═══════════════════════════════════════════════════════════════════
 *
 * This file previously re-exported Svelte-4-compatible store wrappers
 * around the canonical runes module. ALL importers have migrated; the
 * shim no longer has any runtime surface.
 *
 * ▸ Archived copy (with full preserved exports) lives at:
 *     src/lib/stores/_archive/legacy-shims/cleanPayloadStore.ts
 *   The `_archive/**` tree is excluded from `tsconfig.json` so it does
 *   not participate in compilation — it exists as a restorable record
 *   per the repo's "archive, never delete" policy.
 *
 * ▸ Active consumers should import from:
 *     '$lib/stores/cleanPayloadStore.svelte'
 *   and use `cleanPayloadState.cleanPayload` / `.casePayload` directly.
 *
 * ▸ This tombstone file exports nothing. Any accidental
 *   `import { X } from '$lib/stores/cleanPayloadStore'` will fail the
 *   TypeScript check with "Module has no exported member 'X'", which is
 *   the intended loud-fail behaviour.
 *
 * ▸ Why a tombstone instead of outright deletion? The workspace sandbox
 *   disallows `rm`; this file is kept as an intentionally-empty module
 *   until a follow-up session removes it from the repo root.
 *
 * @deprecated Import from '$lib/stores/cleanPayloadStore.svelte' instead.
 */

export {};
