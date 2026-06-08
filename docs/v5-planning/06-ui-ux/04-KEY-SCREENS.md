---
type: ui-ux
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Key Screens

The 12 most important screens in V5. Each shown in mobile-first sketch, then desktop variations noted.

## 1. Home (Work Queue + Today)

### Mobile

```
┌─────────────────────────────────────┐
│ [≡]  Home          [🔍] [🔔] [👤]    │
├─────────────────────────────────────┤
│ Namaste Rahul                       │
│ Aaj ka kaam (8 items)               │
│                                     │
│ ──── Pichhle tareekh ka (3) ────    │
│ ⚠ Priya Singh — Bank query reply    │
│   HDFC LAP • 1 day late             │
│   [Reply] [Snooze]                  │
│                                     │
│ ⚠ Ramesh Kumar — Doc collection     │
│   Salary slip pending • 2 days late │
│                                     │
│ ──── Aaj (3) ────                   │
│ • Call: Amit Verma (lead)           │
│ • Disburse check: Sushil case       │
│ • Bank submit: Anjali HDFC          │
│                                     │
│ ──── Kal (2) ────                   │
│ • Property visit: Kunal             │
│ • Follow-up: Rekha                  │
├─────────────────────────────────────┤
│ Today's stats                       │
│ Leads:2 | Cases:1 | Sanctions:0     │
│                                     │
│ Yeh mahina ₹3.4 lakh kamaaye        │
├─────────────────────────────────────┤
│ [Home] [Cases] [People] [Money][⋯]  │
└─────────────────────────────────────┘
                                  [+]
```

### Desktop additions

- Three-column layout: Work Queue (left, dominant) · Recent Activity feed (centre) · Stats card (right)
- Recent Activity is WhatsApp-style scroll: "Priya uploaded salary slip · 14:23"

## 2. Cases list (Pipeline view)

### Mobile

```
┌─────────────────────────────────────┐
│ [≡]  Cases         [🔍] [🔔] [👤]    │
├─────────────────────────────────────┤
│ [All] [Mine] [Active] [Stuck]       │
│ Filter: needs attention             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Priya Singh — HDFC LAP          │ │
│ │ ₹52 lakh · File building        │ │
│ │ Stuck 4 days · ⚠ Bank query    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Ramesh Kumar — Axis HL          │ │
│ │ ₹38 lakh · Sanctioned ✓         │ │
│ │ Disburse expected next week     │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
├─────────────────────────────────────┤
│ [Home] [Cases] [People] [Money][⋯]  │
└─────────────────────────────────────┘
```

### Desktop: Kanban + List toggle

```
┌─────────────────────────────────────────────────────────────────┐
│ Cases    [Kanban] [List]    Filter: [Needs attention ▼]  + New │
├─────────────────────────────────────────────────────────────────┤
│ Intake | Profiling | File Build | Submitted | Sanctioned | Disb │
│ ░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░░ ░░░░░░░ │
│ [card]  [card]     [card]      [card]     [card]      [card]  │
│ [card]  [card]     [card]      [card]                          │
│         [card]     [card]      [card]                          │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Case detail

Tabs (mobile: bottom segmented control / desktop: top tabs):
- Overview
- Form (embedded comprehensive loan form)
- Offers
- Documents
- Communications
- Timeline
- Tasks

Header on every tab:
```
┌─────────────────────────────────────┐
│ ← Back                              │
│ CASE-2026-04531                     │
│ Priya Singh ← link to customer      │
│ HDFC LAP · ₹52 lakh · File building │
│ Stage timeline: ▓▓▓▓░░░░░░          │
│                                     │
│ [Advance to next] (primary action)  │
└─────────────────────────────────────┘
```

## 4. Customer profile

```
┌─────────────────────────────────────┐
│ ← Back                              │
│ Priya Singh                         │
│ Mobile: 98XXXXX664                  │
│ Last contacted: 3 days ago          │
│                                     │
│ [Overview] [Cases] [Conversations]  │
│ [Documents] [Activity]              │
│                                     │
│ ── Cases (3) ──                     │
│ • HDFC LAP — In progress            │
│ • Axis Home Loan — Disbursed (2024) │
│ • SBI Personal — Closed (2023)      │
│                                     │
│ ── Loan anniversaries ──            │
│ • Home Loan disbursed: 15 Sep 2024  │
│   Top-up window opens: 15 Mar 2027  │
│                                     │
│ ── Birthday ──                      │
│ 22 December (8 weeks away)          │
└─────────────────────────────────────┘
```

## 5. Conversation thread (WhatsApp-style)

```
┌─────────────────────────────────────┐
│ ← Priya Singh    [📞] [⋯]            │
│ All cases  |  HDFC LAP  |  Personal │
│                                     │
│   [Bank query from HDFC]            │
│   "Need updated salary slip"        │
│   ───────────────  via case HDFC LAP│
│                                     │
│                Rahul (you) ▼        │
│         "Sure, will send"           │
│                       14:23  ✓✓     │
│                                     │
│   Priya                             │
│   📎 SalarySlip_Sept.pdf            │
│   14:45                             │
│   [Attach to case]                  │
└─────────────────────────────────────┘
[Type message]  [📎] [🎤] [Send]
```

## 6. Money / Commission pillar

```
┌─────────────────────────────────────┐
│ [≡]  Paisa         [Export] [👤]    │
├─────────────────────────────────────┤
│ [Pending] [Approved] [Received]     │
│                                     │
│ Yeh mahina commission               │
│ ₹3,42,500 receive ho gaya           │
│ ₹1,80,000 approve ho gaya           │
│ ₹2,15,000 pending                   │
│                                     │
│ Filters: Bank ▼ | Mahina ▼ | Partner│
│                                     │
│ ──── Disburse this month ────       │
│ ┌─────────────────────────────────┐ │
│ │ Priya Singh HDFC LAP            │ │
│ │ Disbursed 12 Sep · ₹52 lakh     │ │
│ │ Expected ₹62,400 (1.2%)         │ │
│ │ Status: Approved ✓              │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
└─────────────────────────────────────┘
```

## 7. Offer comparison (inside case detail)

```
┌─────────────────────────────────────┐
│ Offers for Priya's HDFC LAP         │
│ Last updated: 12 min ago [Refresh]  │
│                                     │
│ ┌─── HDFC Bank ─── [Top match] ─── ┐│
│ │ Rate: 8.75% | Tenure: 20 yr     ││
│ │ Eligible: ₹54 lakh max          ││
│ │ TAT: ~7 days                    ││
│ │                                  ││
│ │ Note from DigitalDSA:           ││
│ │ "HDFC strong for salaried LAP   ││
│ │  in Mumbai metro. Ravi (PM)     ││
│ │  picks up calls."               ││
│ │ — Pranav, last reviewed 18 Aug  ││
│ │                                  ││
│ │ [Payout comparison ▼] (10 CorpDSAs)│
│ └──────────────────────────────────┘│
│                                     │
│ ┌─── ICICI Bank ──────────────────┐│
│ │ Rate: 8.85% | Eligible ₹50 lakh ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 8. New Lead (quick capture)

```
┌─────────────────────────────────────┐
│ ← Back  Naya Lead                   │
│                                     │
│ Customer mobile* (10 digits)        │
│ [98_____________]                   │
│                                     │
│ Customer ka naam                    │
│ [_______________________]           │
│                                     │
│ Konsa loan?                         │
│ ⚪ Home Loan  ⚪ LAP  ⚪ Personal     │
│ ⚪ Business  ⚪ Professional  ⚪ Plot │
│                                     │
│ Approx kitne ka?                    │
│ [₹___________]                      │
│                                     │
│ Source                              │
│ ⚪ Walk-in ⚪ Referral ⚪ Builder    │
│ ⚪ CA ⚪ Dealer ⚪ Online ⚪ Other    │
│                                     │
│ [Save] [Save + Convert to Case]     │
└─────────────────────────────────────┘
```

## 9. Lender Hub detail

```
┌─────────────────────────────────────┐
│ ← Back  HDFC Bank                   │
│                                     │
│ ─── Published policy ─── (dominant) │
│ Products: HL, LAP, BT+TopUp         │
│ Rates: 8.50% - 9.25%                │
│ Eligibility: see Engine             │
│ TAT: 7-12 days                      │
│ RM contacts: 4 active               │
│                                     │
│ ─── DigitalDSA view ─── (callout)   │
│ ✓ Strong for salaried HL in Tier-1  │
│   Note: HDFC tends to give 0.25%    │
│   rate concession for credit score  │
│   780+. Worth asking.               │
│   Recommendation: avoid self-emp    │
│   LAP in tier-2 — go to Aavas       │
│   — Pranav K, Sr Policy Analyst     │
│   Last reviewed: 18 Aug 2026        │
│   [Needs review] (>90 days)         │
│                                     │
│ ─── From your cases ─── (data band) │
│ Last 90 days: 47 cases              │
│ Sanction rate: 78% (avg 71%)        │
│ Avg TAT: 8.2 days                   │
└─────────────────────────────────────┘
```

## 10. Modules / Capability settings

```
┌─────────────────────────────────────┐
│ ← Settings  Modules                 │
│                                     │
│ Aapka plan: Pro                     │
│ Monthly: ₹2,500                     │
│ [Change plan]                       │
│                                     │
│ ─── Loan types ─── (ON)             │
│ ✓ Home Loan          [toggle]       │
│ ✓ LAP                [toggle]       │
│ ✓ Personal           [toggle]       │
│ ✓ Business           [toggle]       │
│ ✗ Plot               [toggle]       │
│ ✗ Professional       [toggle]       │
│                                     │
│ ─── Modules ─── (ON)                │
│ ✓ Customers          [toggle]       │
│ ✓ Cases              [toggle]       │
│ ✓ Conversations      [toggle]       │
│ ✓ Commission         [toggle]       │
│ ✗ Team               [toggle] (₹200/seat)│
│ ✗ Builder routes     [toggle]       │
└─────────────────────────────────────┘
```

## 11. New Case wizard (Quick mode)

For first-timer DSAs, "Quick" defaults:

```
Step 1 of 4: Loan basics
  Customer mobile → auto-look-up
  Loan type → radio
  Approximate amount

Step 2: Customer KYC (if new customer)
  Full name
  PAN
  DOB
  Address city + pincode

Step 3: Employment & income
  Employment type
  Monthly income
  Co-applicant? Y/N

Step 4: Run engine
  Engine produces offers
  Pick top 3 lenders to file with
```

"Full" mode opens the comprehensive form — for experienced DSAs.

## 12. Universal search results

```
┌─────────────────────────────────────┐
│ [🔍 priya singh______] [×]          │
│                                     │
│ Customers (1)                       │
│  Priya Singh · 98XXXXX664           │
│  3 cases · last activity 3d ago     │
│                                     │
│ Cases (3)                           │
│  Priya Singh / HDFC LAP             │
│  Priya Singh / Axis HL (closed)     │
│  Priya Singh / SBI Personal (closed)│
│                                     │
│ Leads (0)                           │
│ Partners (0)                        │
└─────────────────────────────────────┘
```

## Related docs

- [01-DESIGN-PRINCIPLES.md](01-DESIGN-PRINCIPLES.md)
- [02-NAVIGATION-MODEL.md](02-NAVIGATION-MODEL.md)
- [03-LANGUAGE-LOCALES.md](03-LANGUAGE-LOCALES.md)
- Per-domain docs in `../05-domains/`
