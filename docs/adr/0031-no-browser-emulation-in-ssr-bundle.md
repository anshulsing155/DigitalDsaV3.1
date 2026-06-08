---
type: adr
epic: none
status: active
last_verified: 2026-06-04
related_specs: []
related_adrs: []
test_coverage: [src/lib/testing/__tests__/payloadSanitization.test.ts]
owner: tech@digitaldsa.com
---

# ADR-0031 — No browser-emulation libraries in the SSR bundle

**Status**: Accepted
**Date**: 2026-06-04
**Session**: S223

## Context

On 2026-06-04 from ~11:54 IST, every form route (`/form/home-loan`,
`/form/how-can-we-help`, and by extension every page that imports
`$lib/utils/sanitizeHtml`) returned 500 on first cold-start of each
Vercel function pod. Existing warm pods continued to serve until they
expired, masking the regression for hours during low overnight traffic.

The actual error, surfaced via the `sendErrorAlert` email path:

```
Error: Could not resolve "canvas" imported by "jsdom". Is it installed?
  at file:///var/task/.svelte-kit/output/server/chunks/sanitizeHtml.js:1:351237
  at ModuleJob.run (node:internal/modules/esm/module_job:343:25)
  at async Module.component (file:///var/task/.svelte-kit/output/server/nodes/4.js:5:59)
```

**Mechanism.** `src/lib/utils/sanitizeHtml.ts` used `isomorphic-dompurify`,
which on the server backs DOMPurify with `jsdom` for a real Web DOM.
jsdom has an optional `require("canvas")` in `lib/jsdom/utils.js:101`
that is normally guarded by a try/catch — if canvas isn't installed,
jsdom continues without canvas support, which is fine for HTML
sanitization. We never installed `canvas` (a native module needing
cairo + pixman + libpng — well-known to fail on Vercel serverless).

The problem: `vite.config.ts` `ssr.noExternal` had `jsdom` and its
transitive chain (`isomorphic-dompurify`, `html-encoding-sniffer`,
`@exodus/bytes`) configured to inline into the SSR bundle. This was
added incrementally over three prior incidents (`b171d318`, `8bb1b289`)
to bridge CJS/ESM interop issues that broke Vercel SSR cold-start.

When Vite inlines `jsdom` source directly into the bundle, it has to
resolve every nested `require()` call in jsdom's source — including the
optional `require("canvas")`. Since `canvas` isn't in `node_modules`,
Vite emitted a runtime-stub throw in place of the import:
`throw new Error('Could not resolve "canvas" imported by "jsdom". Is
it installed?')`. That throw fires at module-init time the first cold
start that any code path imports the `sanitizeHtml.js` chunk — i.e.,
every form route, instantly killing it. jsdom's own try/catch never
gets a chance to swallow the failure because the throw is **before**
runtime, embedded by the bundler.

Three fix attempts failed in succession (~3 hours of outage):
1. `85e35695` — `ssr.external: ['canvas']`. Vite's `ssr.external`
   doesn't propagate into requires made by `noExternal`'d modules,
   so the bundler still processed jsdom's `require("canvas")`.
2. `2f02768e` — expanded `ssr.external` with MongoDB optional peers.
   Tangential to the actual problem; didn't help.
3. `5261393b` — `resolve.alias.canvas` → empty stub. **Fixed canvas
   resolution at the bundle level** (verified by local-build chunk
   inspection — no canvas throw stub remained), but a different
   module-init throw deeper in the jsdom chunk continued to 500 form
   pages with no email alert (handleError doesn't catch chunk-init
   throws — observability gap chipped separately).

The actual durable fix (`6e3eff24`, then cleanup in `76c7de73`):
**eliminate jsdom from the SSR bundle entirely** by swapping
`isomorphic-dompurify` for `sanitize-html` (pure-JS, htmlparser2-based,
~50 KB minified vs jsdom's ~3 MB raw + canvas + html-encoding-sniffer
+ @exodus/bytes + several other transitive packages).

## Decision

**Server-side HTML sanitization must use pure-JavaScript libraries.
No library that emulates a Web DOM (`jsdom`, `happy-dom`, `linkedom`
when used for full DOM emulation) may be present in the SSR bundle
graph.**

Concretely:

1. `sanitize-html` is the chosen sanitizer. Its API surface and our
   wrapper at `src/lib/utils/sanitizeHtml.ts` insulate callers from
   the underlying engine — 31 call sites across 13 components needed
   zero changes during the migration.

2. Any future work that needs server-side DOM operations (parsing HTML
   to a tree, querying selectors, extracting text) must:
   - First check if a pure-JS alternative covers the use case
     (`htmlparser2`, `parse5`, `cheerio` for jQuery-like API).
   - If a real DOM IS required (rare — typically only for live
     accessibility audits or visual-rendering tests), it MUST run
     OUT-of-process: a Vercel cron, a separate worker, or local dev
     tooling. NOT in the SSR request path.

3. `vite.config.ts` MUST NOT contain `noExternal` entries for
   jsdom or jsdom-adjacent packages going forward. If any future dep
   transitively pulls jsdom into the import graph and a Vercel SSR
   failure surfaces, the response is to remove the offending dep,
   not to add another `noExternal` shim.

4. The XSS-vector contract tests added in
   `src/lib/testing/__tests__/payloadSanitization.test.ts` under
   "canonical XSS vector contract" describe block (6 vectors) are the
   regression lock. They run on every push.

## Consequences

**Enables:**
- Smaller SSR bundle (jsdom subtree removal: `chunks/sanitizeHtml.js`
  dropped from 6.0 MB to estimated ~500 KB after Vercel rebuild).
- Faster Vercel cold starts (less JS to evaluate at module init).
- Zero risk of "fourth jsdom-on-Vercel patch" — the four-incident
  pattern (`b171d318`, `8bb1b289`, `85e35695`, `5261393b`) is closed
  by removing the dep entirely.
- Cleaner `vite.config.ts` — ~50 lines of dead workaround comments +
  conditional `noExternal` entries removed.

**Prevents:**
- Future engineers from reflexively reaching for `DOMPurify` /
  `isomorphic-dompurify` when an HTML sanitization need surfaces.
  Pitfall #74 + this ADR + the wrapper at `sanitizeHtml.ts` make the
  pure-JS choice the path of least resistance.

**Tradeoffs accepted:**
- `sanitize-html` has a slightly different API surface than DOMPurify
  (per-tag `allowedAttributes` vs flat `ALLOWED_ATTR`; explicit
  `allowedSchemes` vs DOMPurify's defaults). Our wrapper absorbed this;
  callers see no change.
- `sanitize-html` lacks DOMPurify's hook API (`addHook`). Audit
  confirmed we never used hooks (grep for `DOMPurify.addHook` returned
  zero), so this tradeoff has zero current cost.
- Lost the ability to do real DOM-tree operations in the same module.
  Acceptable — we never did them.

**Sunset trigger:** This ADR has no sunset trigger. The "no
browser-emulation in SSR" rule is a permanent architectural
constraint, not a transitional workaround. It should only be revisited
if a Vercel platform change makes native canvas/jsdom support free
(unlikely — the native-dep problem is structural, not Vercel-specific).

## Alternatives Considered

- **Install `canvas` as a real dep.** Rejected: canvas requires native
  compilation against cairo/pixman/libpng, which reliably fails on
  Vercel's serverless build environment. Even if it built, it'd add
  significant bundle weight for zero functional gain (we don't draw).

- **`DOMPurify + linkedom` shim.** Rejected: keeps the "DOMPurify API"
  familiarity but introduces a different XML/DOM emulator with its own
  edge cases. `sanitize-html` was strictly simpler since we don't use
  hooks and our allowedTags/allowedAttrs map cleanly.

- **Keep the `resolve.alias.canvas` stub and hope no further throw
  surfaces.** Rejected: even though the local-build inspection proved
  the canvas-throw stub was gone, production continued to 500 — a
  different module-init throw lurked in the jsdom chunk. The shim
  approach was treating symptoms; the architectural problem (a 3MB
  browser-emulator in the SSR cold-start path) needed root resolution.

- **Wait 30-60 min before cleanup commit (per peer-AI suggestion).**
  Adopted. Production was verified stable on the `6e3eff24` sanitize-html
  fix before the cleanup landed in `76c7de73`. The two commits are
  separable for bisect.

## References

- CHANGELOG.md S223 entry — full incident timeline + 3-failed-attempts narrative
- Pitfall #74 (`docs/PITFALLS.md`) — browser-emulation libs in SSR bundle, with grep recipe
- `docs/SESSION-HANDOFF.md` — Active Handoff for resumption context
- Commits: `85e35695` / `2f02768e` / `5261393b` (failed attempts), `6e3eff24` (actual fix), `76c7de73` (cleanup)
- Earlier prior-art incidents in same problem class: `b171d318` (added isomorphic-dompurify noExternal), `8bb1b289` (gated jsdom to build-only)
- Test coverage: `src/lib/testing/__tests__/payloadSanitization.test.ts` — "canonical XSS vector contract" describe block, 6 vectors
