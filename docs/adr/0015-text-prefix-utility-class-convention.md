# ADR-0015 — Custom utility CSS classes adopt `text-*` prefix + camelCase font helpers

**Status**: Accepted
**Date**: 2026-05-23
**Session**: late-evening drop-in (team-member-submitted enhancement)

## Context

`src/app.css` defines a small set of custom typography utility classes alongside
the Tailwind defaults. Historically these used a mixed naming pattern:

- Typography blocks unprefixed and camelCase: `.titleText`, `.subTitleText`,
  `.sectionHeadingText`, `.regularText`, `.labelText`
- One typography block kebab-case: `.label-question`
- Font weight helpers kebab-case: `.font-title-bold`, `.font-title-medium`

This created three kinds of friction:

1. **Naming clashes with Tailwind's `text-*` namespace.** A reader scanning
   `class="labelText text-sm text-gray-700"` cannot tell at a glance which token
   is ours and which is Tailwind's. Tailwind owns `text-*` for font-size/color
   utilities — anything custom that LOOKS like a Tailwind token but isn't
   creates a hidden cliff during refactors.
2. **Inconsistency within our own custom set.** Three different patterns
   (unprefixed camelCase, kebab-case, prefixed mixed) for what is functionally
   one family of design-system utilities.
3. **Migration was already half-done unintentionally.** `font-titleBold` and
   `font-titleMedium` (camelCase) were already used in ~47 places alongside
   ~170 usages of `font-title-bold` / `font-title-medium` — accidental drift,
   not a planned migration, because both forms happened to work.

A team member submitted a drop-in `app.css` that renamed the full family and
asked the rename be applied repo-wide. The pre-flight investigation surfaced
that the drop-in implicitly renamed all 8 families, not just the one called
out in the request.

## Decision

All custom utility CSS classes adopt the following naming convention:

- **Typography blocks**: `text-` prefix + camelCase tail:
  `text-titleText`, `text-subTitleText`, `text-sectionHeadingText`,
  `text-regularText`, `text-labelText`, `text-labelQuestion`
- **Font weight helpers**: `font-` prefix + camelCase tail (no kebab-case):
  `font-titleBold`, `font-titleMedium`

The pattern: `<role-prefix>-<token>` where `role-prefix` matches Tailwind's
existing namespace conventions (`text-`, `font-`, etc.) and `<token>` is
camelCase. This signals "this is a design-system token, but it composes
predictably alongside Tailwind utilities."

The 8 old class names are removed from `app.css` and replaced with the new
forms across every active source file. The rename was a mechanical pass
(547 line insertions / 547 line deletions — exact symmetry, no other diffs)
gated by `(?<!text-)\b<class>\b` lookbehind to prevent `text-text-*` doubles.

## Consequences

### Positive

- Reader of any className string can immediately identify what is ours vs
  Tailwind's, even without IDE help.
- Future component additions have one obvious naming convention, not three.
- The drift between `font-title-*` and `font-titleX` is resolved at the
  source-of-truth (app.css), not by ongoing per-file judgment calls.
- The pattern extends naturally — any new design-system token slots in as
  `<tailwind-namespace>-<camelCaseToken>` without re-litigating.

### Negative

- One-time mechanical migration touched 85 files in a single commit (~525
  className strings), which shows up as a large diff in `git blame` for
  those lines until the line itself is touched again.
- Existing contributors' muscle memory has to shift; old names will appear
  in mental notes / old PR comments for a while.
- Slightly more verbose: `text-labelText` vs `labelText` is 5 characters
  longer per usage. Acceptable for the clarity gain.

### Migration is locked in by:

- `src/app.css` — only the prefixed/camelCase selectors are defined; the old
  selectors no longer exist, so any accidental re-introduction of an old
  name renders as unstyled text (visible during code review).
- The mechanical rename script (PowerShell `-creplace` with
  `(?<!text-)\b<class>\b` lookbehind) can be re-run anytime to catch new
  drift — see CHANGELOG 2026-05-23 very-late-evening for the exact invocation.

## Alternatives Considered

- **Status quo (leave 8 families with mixed naming).** Rejected because the
  drift was already happening accidentally (the half-migrated
  `font-titleBold`/`font-title-bold` coexistence proved that), and reading
  className strings was demonstrably confusing.
- **Custom non-Tailwind-aligned prefix like `ddsa-`** (e.g., `ddsa-labelText`).
  Rejected because it adds visual noise without leveraging Tailwind
  familiarity — every contributor already knows what `text-*` and `font-*`
  mean from Tailwind, so reusing those namespaces is free comprehension.
- **Tailwind plugin to formalize as official Tailwind utilities.** Rejected
  as overkill for ~10 classes; the `@layer components` definitions in
  `app.css` are functionally equivalent without adding plugin maintenance.
- **Rename only `labelText` (the literal original ask).** Rejected — would
  have left 7 other families with no CSS rules after the team-member's
  `app.css` dropped them, breaking ~525 className references across 60+
  files. Doing the full systematic rename was the only way to make the
  team-member's drop-in actually work without regressing visuals.

## References

- CHANGELOG entry: `docs/CHANGELOG.md` → 2026-05-23 very-late-evening
- Commits: `20bc0d0c..6411c1ac` on `main`
- Conflict resolution: `IncomeSourceForm.svelte:1687-1692` (kept both
  `{@html}` documentation comment AND the renamed class — they're orthogonal
  good changes)
- Locked-in by: `src/app.css` only defining the new selector names
