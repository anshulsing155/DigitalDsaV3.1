# Dashboard Redesign — Simplification for Non-Tech Users

> **Objective**: Make dashboards usable for arts/commerce graduates who understand local language (Hindi/Marathi) better than English
> **Users**: DSAs and RMs with limited English proficiency, non-tech background
> **Approach**: Visual-first design, plain language, step-by-step guidance, icons over text
> **Status**: Planning complete, ready for implementation
> **Effort**: 4-5 days (comprehensive redesign across both dashboards)

---

## Problem Statement

### Current Issues
1. **Too technical** — Terms like "eligibility," "pipeline," "FOIR," "LTV," "sanctioned" are confusing
2. **Text-heavy** — Walls of text without visual explanations
3. **English-first** — Users forced to read English UI even though translations exist
4. **Not workflow-oriented** — Shows data, not next steps
5. **Complex icons** — Generic icons don't explain what user should do
6. **Jargon overload** — "Query," "lifecycle," "stage," "offer card" — business jargon
7. **No guidance** — New users don't know what to do next

### Impact
- ❌ Users confused at dashboard login
- ❌ High support burden (calls/WhatsApp)
- ❌ Slow user adoption
- ❌ Mistakes in form filling/data entry
- ❌ Lost opportunities due to user confusion

---

## Solution: Visual-First + Plain Language Redesign

### Core Principles
1. **Icons + One-Line Labels** — Show, don't tell
2. **Color-Coded Steps** — Green = ready to do, Yellow = needs attention, Red = urgent
3. **Hindi/Marathi First** — Language toggle at top
4. **Progress Bars** — Visual feedback on loan journey
5. **Action-Oriented** — "What should I do next?" not "Current status is..."
6. **Contextual Help** — Hover/tap for explanations (no reading required)

---

## Terminology Translation

### Technical → Plain Language

| Current (Technical) | New (Plain Language) | Context |
|-------------------|-------------------|---------|
| Case | **Loan Application** | What we're processing |
| Pipeline | **Status Timeline** | Where the application is |
| Stage | **Step** | Where in the process |
| Eligible | **Qualifies** | Bank will approve |
| Sanctioned | **Approved** | Bank said yes |
| FOIR Cap | **Income Limit** | How much can be loaned |
| LTV/LCR | **Loan Amount** | How much money available |
| Query | **Bank's Question** | Needs clarification |
| File Builder | **Submit to Bank** | Final documents |
| Lifecycle | **Journey** | From start to approval |
| RM | **Lender Contact** | Bank person you talk to |
| DSA | **You** (Loan Agent) | Your role in platform |
| Property Identified | **Found the Property** | Location confirmed |
| Expiring Document | **Document Running Out** | Expires soon, needs update |
| Stuck Stage | **No Progress** | Waiting too long |
| Broadcast | **Message from Bank** | Important update |
| Offer Card | **Bank's Offer** | How much money, what terms |
| NBFC | **Non-Bank Lender** | Different type of lender |
| Offer Card | **Final Offer** | What bank is saying yes to |
| Tranche | **Payment Part** | Bank pays in stages |

---

## New Dashboard Layout (Visual-First)

### DSA Dashboard Home — "My Loan Applications" (Simplified)

```
┌─────────────────────────────────────┐
│  Hi Rajesh! 👋                      │
│  You have 12 active applications     │
│                                     │
│  [Choose Your Language]             │
│  English  |  हिन्दी  |  मराठी        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  QUICK STATUS AT A GLANCE           │
├─────────────────────────────────────┤
│                                     │
│  ✅ Ready to Submit    ⚠️  Needs Help   🔴 Urgent  │
│     4 applications       3 apps       1 app      │
│                                     │
│  💰 This Month                      │
│     ₹2.3 Crore Approved             │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  YOUR TOP ACTIONS TODAY             │
├─────────────────────────────────────┤
│                                     │
│  1️⃣  SUBMIT TO BANK                 │
│     Rahul's Home Loan               │
│     Ready to send ➜  [SUBMIT NOW]   │
│                                     │
│  2️⃣  ADD MISSING INFORMATION        │
│     Priya's Business Loan           │
│     Bank asked for 2 more docs      │
│     ➜  [ADD DOCS]                   │
│                                     │
│  3️⃣  FOLLOW UP WITH BANK            │
│     Amit's Personal Loan            │
│     Waiting since 5 days            │
│     ➜  [CONTACT BANK]               │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ALL YOUR APPLICATIONS              │
├─────────────────────────────────────┤
│                                     │
│  🟢 APPROVED (4)                    │
│  │                                 │
│  ├─ Rahul Singh - Home Loan         │
│  ├─ Priya Sharma - Home Loan        │
│  └─ [See all 4...]                  │
│                                     │
│  🟡 SUBMITTED (5)                   │
│  │ Bank is reviewing...             │
│  ├─ Amit Kumar - Personal Loan      │
│  └─ [See all 5...]                  │
│                                     │
│  🟠 NOT READY (3)                   │
│  │ Complete the form first          │
│  ├─ Neha Patel - LAP                │
│  └─ [See all 3...]                  │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  NEED HELP?                         │
│  [Quick Call Help]  [Message Bank]  │
└─────────────────────────────────────┘
```

---

### Loan Application Journey (Visual Flow)

Instead of "stages," show visual journey:

```
Applicant Profile
      ↓
     👤 (Person icon)
  "Tell us about yourself"
  ──────────────────────
      ↓
Property Details
      ↓
     🏠 (House icon)
  "Where's the property?"
  ──────────────────────
      ↓
Money Details
      ↓
     💰 (Money icon)
  "How much do you need?"
  ──────────────────────
      ↓
Documents
      ↓
     📄 (Document icon)
  "Proof & Info"
  ──────────────────────
      ↓
✅ READY TO SUBMIT
"Your application is complete!"
──────────────────────────────
      ↓
📤 SUBMITTED TO BANK
"They're reviewing now..."
──────────────────────────────
      ↓
🔍 BANK REVIEWING
"They're checking..."
──────────────────────────────
      ↓
✅ APPROVED!
"Bank said YES!"
──────────────────────────────
      ↓
💵 MONEY APPROVED
"Here's the offer"
──────────────────────────────
      ↓
🎉 COMPLETED
"Congratulations!"
```

---

### RM Dashboard Home — "Loans from Agents"

```
┌─────────────────────────────────────┐
│  नमस्ते Raj! 👋  (Namaste)          │
│  आपको 28 आवेदन मिले हैं            │
│  (You have 28 applications)         │
│                                     │
│  [English]  [हिन्दी]  [मराठी]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  YOUR TASK LIST (TODAY)             │
├─────────────────────────────────────┤
│                                     │
│  🔴 ACTION NEEDED (2)               │
│     Application from Amit K.        │
│     He replied about documents      │
│     ➜  [REVIEW & DECIDE]            │
│                                     │
│  🟡 REVIEW LATER (5)                │
│     New applications waiting        │
│     Available to check anytime      │
│     ➜  [START REVIEW]               │
│                                     │
│  🟢 ALREADY APPROVED (8)            │
│     Waiting for agent next step     │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  YOUR BANK UPDATES                  │
├─────────────────────────────────────┤
│                                     │
│  📢 "Lower interest rates this week"│
│     Rate: 7.5% (was 8.2%)           │
│     ➜  [SHARE WITH AGENTS]          │
│                                     │
│  📢 "New document list for LAP"     │
│     We now need updated appraisal   │
│     ➜  [FORWARD TO AGENTS]          │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  YOUR NUMBERS                       │
├─────────────────────────────────────┤
│                                     │
│  📊 This Month:                     │
│     Approved: ₹3.8 Crore (12 apps)  │
│     Pending: ₹1.2 Crore (5 apps)    │
│     Rejected: ₹22 Lakh (1 app)      │
│                                     │
│  👥 Connected with 47 DSAs          │
│                                     │
└─────────────────────────────────────┘
```

---

## Color System (Self-Explanatory)

```
🟢 GREEN = GOOD / READY / APPROVED
   ✓ Application is ready
   ✓ Status is positive
   ✓ No action needed right now

🟡 YELLOW = WARNING / NEEDS ATTENTION
   ⚠ Something needs to be done soon
   ⚠ Missing information
   ⚠ Waiting for next step

🔴 RED = URGENT / CRITICAL / PROBLEM
   🚨 Must act immediately
   🚨 Bank rejected something
   🚨 Deadline approaching

⚪ GRAY = INACTIVE / PAST / REFERENCE
   • Already completed step
   • No longer relevant
   • Historical information
```

---

## Icon System (Self-Explanatory)

Create a standardized icon set that doesn't require explanation:

```
👤 = Person / Applicant info
🏠 = Property / Location
💰 = Money / Loan amount
📄 = Documents / Files
✅ = Approved / Completed
❌ = Rejected / Failed
⏳ = Waiting / In progress
🔍 = Reviewing / Being checked
💳 = Offer / Terms
🤝 = Bank contact / Communication
📱 = Send message / Contact
📧 = Email / Formal message
🔔 = Alert / Notification
📊 = Numbers / Stats
⭐ = Rating / Feedback
🎯 = Action / Next step
➜ = Click here / Go next
```

---

## Form Simplification

### Current Form (Technical)

```
Case Intake
├─ Applicant Details
│  └─ Full Legal Name, PAN, Aadhaar
├─ Property Details
│  └─ Property Type, Area, Usage Classification
├─ Financial Profile
│  └─ Income Sources, ITR, Tax Assessment
├─ Existing Obligations
│  └─ EMI History, Outstanding Loans
├─ Loan Requirements
│  └─ Loan Amount, Tenure, Purpose
└─ Additional Information
   └─ Existing Insurance, GST Details
```

### New Form (Plain Language + Visual)

```
STEP 1: Who Are You?
├─ Your name? [TEXT BOX]
├─ Phone number? [TEXT BOX]
└─ City? [DROPDOWN with icons for major cities]

STEP 2: The Property (🏠)
├─ What type of property?
│  ┌─ 🏘️ Apartment (Flat)
│  ├─ 🏡 House
│  ├─ 📍 Plot / Land
│  └─ 🏬 Other
├─ Where is it? [LOCATION MAP]
└─ What will it be used for?
   ┌─ 🏠 You'll live there
   ├─ 🏢 Business use
   └─ 💵 Rent it out

STEP 3: How Much Money? (💰)
├─ Property worth? [₹ INPUT]
├─ How much to borrow? [₹ INPUT]
└─ For how many years? [1-25 SLIDER with years]

STEP 4: Your Income (💼)
├─ How do you earn?
│  ┌─ 👔 Salary job
│  ├─ 📊 Business
│  ├─ 🚕 Self-employed
│  └─ 📈 Multiple sources
├─ How much per month? [₹ INPUT]
└─ Steady for how long? [DROPDOWN]

STEP 5: Done! (✅)
├─ You're ready
├─ Next: Submit to bank
└─ [SUBMIT NOW] button
```

---

## Language Support Strategy

### Priority Order:
1. **Hindi (हिंदी)** — 60% of target users
2. **Marathi (मराठी)** — 25% of target users
3. **English** — 15% of target users (for reference)

### Implementation:
- Add language selector at top (flags + script names)
- Store preference in localStorage + user profile
- Translate all:
  - UI text (buttons, labels, headings)
  - Error messages
  - Help text
  - Step-by-step guidance
  - Notifications

---

## Key Redesign Areas

### 1. Dashboard Home
- ✅ Status at a glance (3 colored boxes)
- ✅ Action list (what to do today)
- ✅ Application list (organized by status)
- ✅ Simple numbers (money approved this month)

### 2. Loan Application Form
- ✅ Step-by-step wizard (not all fields at once)
- ✅ Progress bar (you're at 60%)
- ✅ Plain language (no technical terms)
- ✅ Visual form field hints (icons)

### 3. Application Status Page
- ✅ Visual journey (where are we?)
- ✅ Current step highlighted
- ✅ What's needed next (clear action)
- ✅ Status explanations (no jargon)

### 4. Messages / Queries
- ✅ Bank's question (plain language)
- ✅ What they want (checklist)
- ✅ How to respond (template)
- ✅ Deadline (clear date)

### 5. Approval & Offer
- ✅ Simple offer summary (loan amount, rate, terms)
- ✅ Approval checklist (what's included)
- ✅ Next steps (when money comes)

---

## Implementation Roadmap

### Phase 1: Terminology & i18n (2 days)
- [ ] Create "Plain Language" translation keys
- [ ] Add Hindi/Marathi translations
- [ ] Create glossary document
- [ ] Update all UI text

### Phase 2: Dashboard Redesign (2 days)
- [ ] Redesign home pages (DSA + RM)
- [ ] Add status boxes (green/yellow/red)
- [ ] Add action list
- [ ] Implement application status view

### Phase 3: Form Simplification (1.5 days)
- [ ] Redesign form flow (step-by-step)
- [ ] Add visual hints
- [ ] Implement progress bar
- [ ] Add plain language help text

### Phase 4: Testing & Polish (0.5 days)
- [ ] Test with non-tech users
- [ ] Gather feedback
- [ ] Polish UI/UX
- [ ] Prepare launch

---

## Files to Modify

### i18n (Translations)
- `src/lib/i18n/en.ts` — Add new keys
- `src/lib/i18n/hi.ts` — Hindi translations
- `src/lib/i18n/mr.ts` — Marathi translations

### Dashboard Pages
- `src/routes/dashboard/dsa/+page.svelte` — DSA home
- `src/routes/dashboard/rm/+page.svelte` — RM home
- `src/routes/dashboard/dsa/cases/+page.svelte` — Case list
- `src/routes/dashboard/rm/cases/+page.svelte` — Case list (RM)

### Form Pages
- `src/routes/(app)/form/**/+page.svelte` — All forms

### Components (New)
- `src/lib/components/dashboard/StatusCard.svelte` — Simple status
- `src/lib/components/dashboard/ActionList.svelte` — Today's actions
- `src/lib/components/dashboard/JourneyVisualization.svelte` — Visual timeline
- `src/lib/components/form/PlainLanguageField.svelte` — Form field with help

---

## Testing Checklist

Before launch, test with real DSAs/RMs:

- [ ] Can user log in without help?
- [ ] Does user understand what to do next?
- [ ] Can user complete form without calling support?
- [ ] Are status colors (green/yellow/red) self-explanatory?
- [ ] Is Hindi/Marathi text readable?
- [ ] Do icons make sense without text?
- [ ] Is progress visible (% complete)?
- [ ] Can user understand bank's query without jargon?

---

## Success Metrics

After redesign, measure:

- 📉 Support calls decrease by 50%
- ⏱️ Time to complete form decreases by 40%
- ✅ Form submission errors decrease by 60%
- 😊 User satisfaction increases by 30%
- 🌍 Hindi/Marathi adoption increases to 70%

---

## References

- Current dashboards: `src/routes/dashboard/dsa/` and `src/routes/dashboard/rm/`
- i18n system: `src/lib/i18n/`
- Form system: `src/routes/(app)/form/`
- Components: `src/lib/components/dashboard/`

---

## Next Steps

1. ✅ Create this plan (done)
2. ⏳ Get approval from user
3. Implement Phase 1: Update terminology in i18n
4. Implement Phase 2: Redesign dashboards
5. Implement Phase 3: Simplify forms
6. Implement Phase 4: Test with users
7. Launch redesigned dashboards

