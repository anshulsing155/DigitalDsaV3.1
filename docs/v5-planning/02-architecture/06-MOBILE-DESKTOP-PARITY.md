---
type: architecture
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Mobile + Desktop Parity — Same Codebase, Two Viewports

## The rule

Every feature ships mobile AND desktop in the same sprint. If only one viewport is done, the feature doesn't ship.

There's no separate "mobile app" team and no separate "desktop version." One codebase, viewport-aware, mounted in two shells:
- **Browser** — visited on a phone or a laptop
- **Capacitor wrapper** — installed as an Android app from the Play Store

## Why one codebase

V3's lesson: the moment you fork mobile and desktop, drift starts. Feature A lands on desktop; nobody remembers to port to mobile for two weeks; a tester finds 47 mobile bugs in retro. Then the team blames mobile for being "harder."

One codebase = parity is built-in. Components written once, responsive by design, tested in both viewports as a CI gate.

## Layout strategy

### Viewport breakpoints (Tailwind defaults, slightly tuned)

| Token | Width | Typical device |
|---|---|---|
| `sm` | 640px | Large phone landscape, small tablet |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape, small laptop |
| `xl` | 1280px | Laptop |
| `2xl` | 1536px | Desktop monitor |

Our primary mobile target is **360px–414px** (most Indian Android phones). Below `sm` is the mobile experience.

### Container queries for component-level adaptation

Layout decisions inside a component shouldn't depend on the viewport alone — they should depend on the **container** the component is sitting in.

Example: a `<CustomerCard>` looks one way when it's in a single-column list on mobile, another way when it's in a 3-column grid on a tablet. Container queries let the card decide based on its own width, not the page's.

```svelte
<div class="@container">
  <div class="flex flex-col @md:flex-row @md:items-center gap-2 @md:gap-4">
    <CustomerAvatar />
    <CustomerNameMobile />
    <CustomerLastCase />
  </div>
</div>
```

### Two distinct nav patterns

| Mobile (< md) | Desktop (≥ md) |
|---|---|
| Bottom tab bar with 5 items: Home · Cases · People · Money · More | Left sidebar with all nav items grouped |
| Top thin bar: search icon + notification + profile menu | Top bar: persistent search input + notification + profile |
| "More" drawer for: Lender Hub, Reports, Knowledge, Settings, Billing | All accessible in sidebar |
| FAB ("+") in bottom-right for primary action (e.g., "New Case") | Header button for primary action |

Both render from the same nav config — the breakpoint decides the shell.

## Touch and pointer

| Concern | Mobile rule | Desktop rule |
|---|---|---|
| Tap target size | Min 44px × 44px (Apple HIG / WCAG) | Min 32px |
| Gestures | Swipe-to-complete, swipe-to-snooze on lists | Keyboard shortcuts (`e` complete, `s` snooze, `j/k` navigate) |
| Drag-and-drop | Avoid (long-press to enter sort mode) | Standard drag-and-drop OK |
| Hover states | Don't depend on them (no hover on touch) | Subtle hover cue is OK as enhancement |
| Bottom sheet for actions | Yes — single-thumb reachable | Modal in centre |
| Voice input | Mic icon prominent on text fields | Mic icon present, less prominent |
| Camera capture | Capacitor Camera plugin, full-screen viewfinder | File picker upload |

## Capacitor 7 Android wrapper

The web app is the truth. The Capacitor wrapper adds:

- **Native splash + icon** — branded
- **SecureStorage** plugin for auth tokens (replaces localStorage)
- **Camera** plugin for in-app document capture
- **Geolocation** plugin for field-visit verification (Phase 2B, Sprint 12)
- **Push Notifications** via FCM
- **LocalNotifications** for offline reminders
- **App-state listeners** for background sync triggers
- **Network** plugin for connectivity events

Build pipeline:
```
pnpm build      # produces SvelteKit static assets
npx cap copy    # copies assets into android/ project
npx cap open    # opens Android Studio for build/sign
```

Every release ships:
- A Vercel deployment of the web app
- An updated Android APK / AAB to Play Store

## PWA, even outside Capacitor

The DSA app is also a Progressive Web App. DSAs on iPhones (a minority but growing) can install it via "Add to Home Screen":
- Service worker registered for offline cache
- Web manifest with icon + theme colour
- Push notifications via Web Push API (Safari support recent)

iOS-specific Capacitor wrapper deferred to post-GA — PWA covers the iOS minority for now.

## Offline tolerance

Core read flows work offline:
- Home / Work Queue (cached on last visit)
- Customer profile (cached when visited)
- Case detail (cached when visited)
- Search (last-10 results cached)

Core capture flows work offline:
- New lead (queued to sync)
- New follow-up (queued)
- Note on case (queued)
- Document photo capture (queued to upload)

Sync on reconnect:
- BullMQ-style queue persisted in IndexedDB
- Last-write-wins on notes and simple fields
- Flagged-merge on structured fields (rare; surfaces a "needs your decision" UI)

Banner shows "Offline — 3 changes will sync" while disconnected.

## Component library structure

Components in `packages/ui` are organised by:

- **Primitives** — Button, Input, Textarea, Select, Checkbox, Radio, Switch, Card, Badge, Spinner. Each ships with mobile + desktop variants.
- **Compounds** — Modal, Drawer (mobile bottom-sheet, desktop right-drawer), Sheet, Toast, Tooltip (touch-friendly long-press version on mobile).
- **Domain components** — CustomerCard, CaseRow, OfferComparison, FollowUpItem. Built once, viewport-responsive.

Every component has:
- A Storybook story showing mobile + desktop variants side-by-side
- A `__tests__/<name>.test.ts` with viewport-specific assertions
- Documentation in component-level Markdown

## QA exit checklist per PR

Every PR that touches UI must include:
- [ ] Mobile viewport screenshot (Chromium DevTools at 375×667)
- [ ] Desktop viewport screenshot (1440×900)
- [ ] If touch interaction added: video demo on mobile
- [ ] Keyboard navigation works on desktop
- [ ] Tab order is sensible
- [ ] Colour-only states have icon + word fallback (NFR-5)

CI bot reads the PR description and blocks if checklist boxes are empty.

## Performance budgets per viewport

| Metric | Mobile target | Desktop target |
|---|---|---|
| First Contentful Paint | < 2s on 3G | < 1s |
| Time to Interactive | < 4s on 3G | < 2s |
| Largest Contentful Paint | < 2.5s | < 1.5s |
| Cumulative Layout Shift | < 0.1 | < 0.1 |
| JS bundle (per route) | < 100KB gzipped | < 200KB |
| Image weight (per screen) | < 200KB | < 500KB |

Measured via Vercel Speed Insights + Lighthouse CI. Budgets enforced in CI — exceeding triggers PR comment and warns reviewer.

## Voice input (Phase 2A, Sprint 4 onward)

Many first-timer DSAs type slowly in English. Hindi typing is even slower. Voice input on a phone is 3× faster.

- **Web Speech API** for desktop browsers (Chrome/Edge support is sufficient)
- **Capacitor speech-recognition plugin** for mobile native
- **Locale-aware** — recognition language matches user's selected UI locale (hi, en, hi-en for Hinglish)
- **Surfacing** — mic icon on follow-up notes, lead capture, conversation messages, case notes

Not a separate feature — embedded into existing inputs.

## Related docs

- [01-SYSTEM-OVERVIEW.md](01-SYSTEM-OVERVIEW.md)
- [../06-ui-ux/01-DESIGN-PRINCIPLES.md](../06-ui-ux/01-DESIGN-PRINCIPLES.md)
- [../06-ui-ux/02-NAVIGATION-MODEL.md](../06-ui-ux/02-NAVIGATION-MODEL.md)
- [../06-ui-ux/03-LANGUAGE-LOCALES.md](../06-ui-ux/03-LANGUAGE-LOCALES.md)
