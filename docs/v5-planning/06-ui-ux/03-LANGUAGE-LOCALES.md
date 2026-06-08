---
type: ui-ux
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Language and Locales

## The three primary locales

V5 ships with three first-class locales at GA:

| Locale | Code | Register | Audience |
|---|---|---|---|
| English | `en` | Plain India English, SaaS-familiar | Urban DSAs, larger firms |
| Hindi (Devanagari) | `hi` | Colloquial, not formal | Tier-2/3 DSAs, North India |
| Hinglish (Roman script) | `hi-en` | Plain Hindi in Roman script with English nouns | Younger DSAs, WhatsApp-natives |

Phase 2B adds: Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, Punjabi (in roughly this order based on Beta cohort feedback).

## Why Hinglish is first-class

Many Indian users type Hindi in Roman script daily on WhatsApp. They read formal Devanagari Hindi awkwardly, find pure English distancing. Hinglish hits the middle.

Hinglish is NOT machine-translated English. It's hand-written by a Hindi-speaking copywriter for each screen. The cost is real — about 3× a typical locale — but it's why we're better than competitors that ship "Hindi" by Google Translating English strings.

## Writing register

| Sterile (avoid) | Plain (use) |
|---|---|
| "Submit application" | "Apply karein" / "Apply" |
| "Eligibility assessment in progress" | "Eligibility check ho rahi hai" |
| "Pipeline" | "Chal rahe Cases" |
| "Customer relationship management" | "Mere Customers" |
| "Disbursement" | "Disburse" (technical loan term, kept) |
| "Sanctioned" | "Sanction mil gaya" |

Rule: use the verb form people speak. Avoid noun-ification ("application processing" → "process ho raha hai").

## Implementation

Each locale has its own file:

```
packages/i18n/src/
  en.ts
  hi.ts
  hi-en.ts        # Hinglish
  mr.ts           # Phase 2B
  gu.ts
  ta.ts
  ...
  index.ts
```

Locale files are keyed by namespace:

```typescript
// hi-en.ts
export default {
  nav: {
    home: 'Aaj',
    cases: 'Cases',
    people: 'Log',
    money: 'Paisa',
    more: 'Aur',
  },
  home: {
    work_queue_title: 'Aaj ka kaam',
    overdue: 'Pichhle tareekh ka',
    today: 'Aaj',
    tomorrow: 'Kal',
    this_week: 'Is hafte',
    no_tasks: 'Sab clear hai!',
  },
  case: {
    new: 'Naya Case',
    stage_intake: 'Intake mein',
    stage_processing: 'Process ho raha',
    stage_sanctioned: 'Sanction mil gaya',
    // ...
  },
  // ...
};
```

Usage in components:

```svelte
<script lang="ts">
  import { t } from '$i18n';
</script>
<h1>{$t('home.work_queue_title')}</h1>
```

## Locale switching

- User picks locale on first sign-in (`module.first_run_setup`)
- Persisted in user profile
- Changeable anytime via Settings → Language
- Per-user, not per-org (a team can have members in different locales)

## Indian number formatting

Same regardless of locale:

```typescript
export function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} crore`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}
```

Examples:
- `52,75,000` → `₹52.75 lakh`
- `1,40,00,000` → `₹1.40 crore`
- `9,800` → `₹9,800`

## Indian date formatting

Default: `DD MMM YYYY` ("15 Sep 2026"). Time: 12-hour with am/pm ("4:30 pm"). Adjusted per locale conventions.

## Voice input

Web Speech API on desktop, Capacitor speech-recognition plugin on mobile.

| Locale | Speech recognition lang |
|---|---|
| `en` | `en-IN` |
| `hi` | `hi-IN` |
| `hi-en` | `hi-IN` (recognises Hinglish reasonably) |

Mic icon visible on every text input where dictation makes sense (follow-up notes, lead capture, conversation messages).

## i18n lint rule

ESLint rule `no-hardcoded-user-strings`: any user-facing string in `.svelte` or component `.ts` files must come from `$t()`. Catches strings like:

```svelte
<button>Submit</button>            ❌
<button>{$t('common.submit')}</button>  ✅
```

Exceptions: debug labels, console-only output, technical IDs.

## Translation workflow

1. Engineer adds a new English string in `en.ts`
2. CI bot detects new key, opens a sibling PR with placeholders in other locale files (`hi.ts`, `hi-en.ts`)
3. Native-speaker copywriter (contractor or owner reviews) fills in
4. PR merges with all locales populated

A weekly "locale gaps" report shows missing translations.

## Onboarding language picker

First-run UX:

```
"Aapki bhasha kya hai?"
"Which language do you prefer?"

[ English ]   [ हिंदी ]   [ Hinglish ]

(You can change this anytime in Settings)
```

The picker uses both Devanagari and Roman scripts so anyone can read it.

## Related docs

- [01-DESIGN-PRINCIPLES.md](01-DESIGN-PRINCIPLES.md)
- [02-NAVIGATION-MODEL.md](02-NAVIGATION-MODEL.md)
