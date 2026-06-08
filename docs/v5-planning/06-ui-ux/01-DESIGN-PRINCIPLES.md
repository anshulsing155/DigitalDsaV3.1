---
type: ui-ux
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# UI/UX Design Principles

The twelve principles from the SRS, applied to every screen.

## 1. The DSA thinks in tasks, not modules

Home answers "what do I do next?", never "how did I do this month?". Earnings is a destination, not the front door.

**Concrete:** Work Queue is dominant on Home. Stats are secondary. Charts (if any) live in `/reports`, not Home.

## 2. Five primary destinations, hard cap

Bottom nav has at most 5 items. Every additional capability nests under one of them or under "More."

**On mobile:** Home · Cases · People · Money · More
**On desktop:** Same five as primary sidebar groups; additional links in expanded groups.

A capability inventory is not a navigation bar. The capability list is on the Settings → Modules screen, where it belongs.

## 3. One primary action per screen

The single most likely next step is visually dominant. Other actions are visually secondary.

**Examples:**
- Home → "+ New Case" (big, persistent FAB on mobile / header button on desktop)
- Case list → "Filter to needs my attention" (default filter)
- Case detail → "Advance to next pipeline step" (primary CTA)
- Lead → "Convert to Case" (when status warrants)

## 4. Status uses colour AND icon AND word

A first-timer DSA can't be expected to learn the pipeline by colour. Every status indicator shows:
- A colour (red / amber / green / blue / grey)
- An icon (✗ / ⚠ / ✓ / ↑ / —)
- A word ("Rejected" / "Action needed" / "Approved" / "In progress" / "Closed")

Colour-blind reviewers test this. NFR-5 acceptance.

## 5. Hindi and Hinglish are first-class locales

Not translated-from-English. Native, with familiar register. Navigation uses verbs and plain nouns:

| Sterile (avoid) | Plain Hindi/Hinglish (use) |
|---|---|
| CRM | Mere Customer |
| Pipeline | Chal rahe Cases |
| Eligibility Assessment | Loan Eligibility |
| Application Processing | Loan Process |

## 6. ₹ and lakh/crore everywhere

Indian number format. Never millions, never USD.

| Amount | Display |
|---|---|
| ₹500 | ₹500 |
| ₹50,000 | ₹50,000 |
| ₹5,00,000 | ₹5 lakh |
| ₹50,00,000 | ₹50 lakh |
| ₹5,00,00,000 | ₹5 crore |
| ₹52,75,000 | ₹52.75 lakh |

Implemented via `formatINR()` utility in `packages/ui`.

## 7. Customer is master identity; Case is master unit of work

UI organisation: case-first daily flow. Data backing: customer-first. The DSA never re-keys a person.

**Example:** "Priya Singh" appears on her customer profile. From there → "New Case" auto-fills her KYC. From the case → header chip links to Priya's profile.

## 8. Configuration over conditionals

Loan-type differences, pipeline stages, form fields, status sets — schema-driven from config, not hardcoded conditionals in components. Adding a loan type doesn't require a UI code change.

## 9. The dashboard is dumb about lenders

Dashboard renders what the engine returns. No rates, eligibility logic, or ranking lives in dashboard code. NFR-8 acceptance: removing engine yields "offers unavailable" with the rest of the case still usable.

## 10. Offline-tolerant

Core read and capture flows work without a connection. "Last synced" indicator visible. Sync on reconnect.

## 11. Reliability before intelligence

Document tracking ships before document extraction. Status capture ships before AI suggestions. AI surfaces inside existing screens, never as standalone tabs.

## 12. The platform amplifies, never replaces, the DSA

Every screen and feature passes the four-question test. Q4 ("could this bypass the DSA?") is absolute veto. See [../04-security/04-PRINCIPLE-12-GATE.md](../04-security/04-PRINCIPLE-12-GATE.md).

## Layout density

| Viewport | Card padding | Row height | Font scale |
|---|---|---|---|
| Mobile (sm) | 16px | 56px+ touch targets | Comfortable |
| Tablet (md) | 20px | 48px | Comfortable |
| Desktop (lg+) | 24px | 40px rows | Compact |

Density preference (comfortable / compact) is a per-user setting on desktop only.

## Empty states

Every list and screen has a non-empty empty state:
- **Beneficial copy:** "No leads yet. Capture one from your last 5 customers' referrals."
- **CTA:** primary action visible (button to do the thing)
- **Visual:** simple illustration or icon (not branded marketing)

No blank `<div>`s where data goes.

## Loading states

| Duration | Pattern |
|---|---|
| < 200ms | No indicator (would flash) |
| 200ms - 1s | Skeleton or spinner |
| 1s - 5s | Skeleton + "Loading..." copy |
| > 5s | Skeleton + "Taking longer than usual — checking..." |
| > 15s | Error or timeout option |

Skeletons are styled to match final layout — no layout shift on load.

## Error states

Errors show:
- What happened in plain Hindi/Hinglish/English
- What the user can do (retry / back / contact support)
- A reference ID for support to pick up

Never just "Error 500" or stack traces.

## Accessibility (WCAG 2.1 AA)

- Tap targets ≥ 44px × 44px on mobile
- Contrast ratio ≥ 4.5:1 for body text, 3:1 for large text
- Focus indicators visible
- Keyboard navigation works for all interactive elements
- Screen-reader-friendly: proper ARIA, semantic HTML, alt text
- Status conveyed by colour+icon+word (never colour alone)

## Related docs

- [02-NAVIGATION-MODEL.md](02-NAVIGATION-MODEL.md)
- [03-LANGUAGE-LOCALES.md](03-LANGUAGE-LOCALES.md)
- [04-KEY-SCREENS.md](04-KEY-SCREENS.md)
- [../02-architecture/06-MOBILE-DESKTOP-PARITY.md](../02-architecture/06-MOBILE-DESKTOP-PARITY.md)
