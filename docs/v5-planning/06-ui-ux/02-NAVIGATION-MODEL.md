---
type: ui-ux
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Navigation Model

Five primary pillars (Principle 2 — hard cap). Capabilities nest beneath them; "More" catches the rest.

## The five pillars

| Pillar | Mobile label | Hindi/Hinglish | Capabilities it reaches |
|---|---|---|---|
| **Home** | Aaj | आज | Work Queue, follow-up engine, today's stats, recent activity, quick actions |
| **Cases** | Cases | Cases | Pipeline view, case detail, embedded form, offers, docs, timeline, communications |
| **People** | Log | लोग | Leads, Customers, Partners, RM directory |
| **Money** | Paisa | पैसा | Commission tracking, payouts, expenses, subscription/billing |
| **More** | More | और | Reports, Team, Knowledge Center, Settings, Lender Hub, Communication inbox |

## Mobile — bottom tab bar

```
┌──────────────────────────────────────────────┐
│ [Top thin bar: search • notif • profile]     │
│                                              │
│ [Page content]                               │
│                                              │
│ [Floating action button — primary action]    │
├──────────────────────────────────────────────┤
│ [Home] [Cases] [People] [Money] [More]       │
└──────────────────────────────────────────────┘
```

- Bottom bar fixed; 56px height; safe-area padded
- Active tab has icon + label colour change
- Long-press a tab → tab quick-actions (e.g., long-press "Cases" → "New Case", "Pipeline View", "My Assigned")
- Badge for unread counts (Inbox under More, Work Queue under Home)

## Desktop — left sidebar

```
┌─────────────┬────────────────────────────────────┐
│ [Logo]      │ [Top bar: persistent search        │
│             │    • notifications • profile menu] │
│ [Home]      │                                    │
│ [Cases]     │ [Page content]                     │
│ [People] ▼  │                                    │
│   Leads     │                                    │
│   Customers │                                    │
│   Partners  │                                    │
│   RMs       │                                    │
│ [Money]     │                                    │
│ [More] ▼    │                                    │
│   Reports   │                                    │
│   Team      │                                    │
│   Knowledge │                                    │
│   Lenders   │                                    │
│   Settings  │                                    │
│   Billing   │                                    │
└─────────────┴────────────────────────────────────┘
```

- Sidebar 240px expanded; 60px collapsed (icon-only)
- Expandable groups (People, More) show sub-items on click
- Active item has accent bar + bold label
- Bottom of sidebar: language selector + user profile

## Universal search (persistent)

A persistent element above the pillars on desktop, accessible by icon on mobile.

- **Desktop:** centred top bar with input box, `Ctrl/Cmd+K` shortcut, search-as-you-type
- **Mobile:** magnifying-glass icon in top thin bar → opens full-screen sheet on tap
- Result groups: Customers · Cases · Leads · Partners (each deep-linked)
- Voice input mic icon (Phase 2A Sprint 4+)

## Primary action per pillar

Each pillar has its dominant action, surfaced consistently:

| Pillar | Primary action |
|---|---|
| Home | "+ New Case" (FAB on mobile, header button on desktop) |
| Cases | "Filter to needs attention" (default) + "+ New Case" |
| People | "+ New Lead" (default sub-tab is Leads) |
| Money | "Reconcile" or "Export" |
| More | Context-dependent (no single primary) |

## Progressive disclosure for team capabilities

Solo DSAs (one user) never see Team controls — `module.team` is off. As soon as their plan enables Team:
- A "Team" item appears under More
- Assignment dropdowns appear on cases (role-gated)
- An onboarding flow walks them through inviting their first team member

This is the "Solo never sees a control they cannot use" rule.

## "More" drawer structure

On mobile, "More" opens a drawer with:

- **Account section:** Profile · Notifications · Settings · Billing
- **Work section:** Reports · Team · Communication Inbox
- **Reference section:** Lenders · Knowledge Center
- **Help section:** Support · Status · About

Each item shows an icon + label + optional badge (unread, alert).

## Breadcrumbs vs back button

- **Mobile:** explicit back button always visible in top thin bar (system back also works on Android)
- **Desktop:** breadcrumbs above the page title (`Cases > CASE-4531 > Documents`)
- No nested modal stacks > 2 levels (avoid losing context)

## Deep linking

Every screen has a URL. Universal search results deep-link directly. Sharing a URL with a teammate (in the same org) opens the same screen — auth-gated by capability and permission.

## Nav config

Defined in `packages/ui/src/nav/config.ts`:

```typescript
export const NAV_CONFIG: NavConfig = {
  pillars: [
    { id: 'home', label_en: 'Home', label_hi: 'आज', icon: 'home',
      route: '/', capability_required: null },
    { id: 'cases', label_en: 'Cases', label_hi: 'Cases', icon: 'briefcase',
      route: '/cases', capability_required: 'module.cases' },
    { id: 'people', label_en: 'People', label_hi: 'लोग', icon: 'users',
      route: '/people', capability_required: null,
      children: [
        { label_en: 'Leads', route: '/people/leads', capability_required: 'module.leads' },
        { label_en: 'Customers', route: '/people/customers', capability_required: 'module.customers' },
        { label_en: 'Partners', route: '/people/partners', capability_required: 'module.partners' },
        { label_en: 'RMs', route: '/people/rms', capability_required: 'module.cases' },
      ] },
    { id: 'money', label_en: 'Money', label_hi: 'पैसा', icon: 'rupee',
      route: '/money', capability_required: 'module.commission' },
    { id: 'more', label_en: 'More', label_hi: 'और', icon: 'menu',
      route: null,
      children: [
        { label_en: 'Reports', route: '/reports', capability_required: 'module.reports' },
        { label_en: 'Team', route: '/team', capability_required: 'module.team' },
        { label_en: 'Knowledge', route: '/knowledge', capability_required: 'module.knowledge' },
        { label_en: 'Lenders', route: '/lenders', capability_required: 'module.lender_hub' },
        { label_en: 'Inbox', route: '/inbox', capability_required: 'module.conversations' },
        { label_en: 'Settings', route: '/settings', capability_required: null },
        { label_en: 'Billing', route: '/billing', capability_required: null },
      ] },
  ],
};
```

Rendering: nav components filter children by `capability_required` against the current org's capability state.

## Related docs

- [01-DESIGN-PRINCIPLES.md](01-DESIGN-PRINCIPLES.md)
- [03-LANGUAGE-LOCALES.md](03-LANGUAGE-LOCALES.md)
- [04-KEY-SCREENS.md](04-KEY-SCREENS.md)
- [../02-architecture/04-CAPABILITY-SYSTEM.md](../02-architecture/04-CAPABILITY-SYSTEM.md)
