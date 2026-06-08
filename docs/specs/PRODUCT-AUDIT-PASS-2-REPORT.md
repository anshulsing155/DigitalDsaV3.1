# DigitalDSA — Product Audit Report

**Prepared for:** The product/sales/marketing owner
**Audit window:** 2026-05-19 to 2026-05-20
**Method:** Logged into the live development build as all three user types (DSA, RM, Admin), clicked through 50+ screens, and read the underlying code for the parts that don't show on screen (payments, compliance, integrations).
**Companion document:** A denser, table-based technical version of every finding lives in `PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md`. This report is the plain-English version meant to be read top-to-bottom by a non-engineer.

---

## How to read this report

This is written for someone who runs the business, not someone who writes the code. Every finding follows the same shape:

> **What I saw** (with a concrete example) → **Why it matters to the business** → **What I suggest doing about it.**

Severity is rated in plain words:
- **Blocker** — this will break for a real customer; fix before anyone new signs up.
- **Serious** — won't crash, but it makes the product feel unfinished or costs you money/customers.
- **Minor** — polish; fix when convenient.

---

## Part 1 — The big picture in one page

Here's the honest verdict.

**DigitalDSA is a real, working product — not a prototype.** A DSA can sign up, create a loan case across six loan types, get it evaluated against lender policies, and manage it through stages. An RM can encode bank policies through a genuinely impressive step-by-step wizard. An admin can review submissions, manage users, and read a detailed audit trail. The hard, defensible engineering — the rule engine, the income profiling, the encryption, the security guards — is built and working.

**But it reads like a strong internal tool that's about 80% of the way to a polished commercial product.** The gap isn't in the engine room; it's in the showroom. Three patterns repeat across almost every screen:

1. **Things meant for humans still show their database labels.** Your Cases page shows "Home Loan — 2026-05-06" instead of "Rajesh Kumar — Mumbai Home Loan." Loan types show "home_loan" instead of "Home Loan." A DSA's eye expects names; the screen gives them codes and dates.

2. **Test data is mixed in with real-looking data.** Your shared RM directory shows "xyz bank" and "Test RM" alongside real banks. The lender dropdowns show "Sample GOV Bank" next to "HDFC Bank." This is fine in a dev environment — but the exact same thing in production would make the platform look careless on the very screens that are supposed to build trust.

3. **The money and growth machinery isn't built yet.** Subscriptions work, but there's no GST invoice, no refund button, no "your card failed" follow-up sequence, no referral program, no way for a curious DSA to try the calculators before signing up. The platform can take money and grow by direct sales — but it can't yet invoice properly or grow by itself.

**The two specific things you said the last audit missed — I confirmed both.** The admin genuinely cannot key in a lender's policy on behalf of an RM who won't use the portal (Gap A). And the dashboards genuinely aren't at the intuitive, polished level of a Razorpay or a Stripe yet (Gap B). Details on both below.

**There is exactly one thing that is broken right now, today:** an RM who signs up fresh and opens their Settings page sees an error ("Profile not found") instead of their profile. That one needs fixing before you let any new RM in.

---

## Part 2 — The two gaps you flagged

### Gap A — The admin can't capture a policy on behalf of an RM

**What you said:** "Not all RMs will be ready to come to our portal to enhance or edit. Many will fax / WhatsApp / email a policy sheet to our admin team."

**What I found:** You are exactly right, and the platform can't handle this today.

Here's what the admin *can* do with policies right now:
- Upload a PDF of a policy and let the AI try to read it.
- Review and approve policies that an RM has already submitted through the portal.
- Edit the raw underlying data of a policy (but only as raw computer code — terrifying for a non-technical staff member).

Here's what the admin *cannot* do:
- Sit down with a policy sheet that came in over WhatsApp, open a clean form, and type in the bank's lending rules field-by-field on the RM's behalf.

**A concrete example of the problem:** An RM at a government bank phones your team. "I don't want to log into your website, but here are our home-loan rules — minimum income ₹50,000, maximum age 65, we don't lend in these three pin codes." Today, your admin has no screen to type that into. They'd have to either fake an RM account and log in as them, or hand-edit raw code. Neither is acceptable for a normal ops team.

**Why it matters:** Your competitive moat is lender coverage — the more banks' policies you have, the more useful you are to every DSA. But if the only way to add a policy is "the RM does it themselves," then your coverage is capped at the number of RMs willing to learn your portal. The old-school RMs at PSU banks and small NBFCs — often the ones with the most useful, least-digitized policies — will never do that. You're leaving your best coverage on the table.

**What I suggest:** Build one new admin screen that mirrors the RM's existing policy-capture wizard, with one extra question at the start: "Which RM is this for?" Tag everything captured this way as "entered by admin on behalf of RM" so there's a clear paper trail, and so that if the RM later does join the portal, they can see and edit what was entered for them. The RM-side wizard already exists, so this is mostly reusing what's built — roughly 3 to 5 days of work. **This is the single highest-value thing to build for your admin team.**

Severity: **Serious** (it's a missing capability, not a bug — but it caps your core moat).

---

### Gap B — The dashboards aren't yet at industry-standard polish

**What you said:** "DSA and RM dashboards are still not intuitive per industry standards."

**What I found:** Agreed, and I can now be specific about where and why.

I scored every page on five things a polished product gets right: how busy the screen feels, how easily you find what you need, how it handles empty/error states, whether your eye lands in the right place, and whether the words are clear. On a 25-point scale, here's how the three dashboards came out:

- **DSA dashboard: 76%** — the most pages, the most polish gaps.
- **RM dashboard: 78%** — one outstanding page (the encode wizard, a perfect score), one broken page (Settings).
- **Admin dashboard: 80%** — the most mature, because your own team built it for themselves.

The telling pattern: **the pages your customers use most are the least polished, and the pages your own team uses are the most polished.** That's normal for an early-stage company — you build outward from your own needs — but it means the customer-facing surface needs disproportionate attention now.

The specific, repeatable issues (with examples) are in Part 3, where I walk through each user's experience.

Severity: **Serious overall**, but made of many **Minor** fixes that add up.

---

## Part 3 — Walking through the product as your three users see it

### 3A. The DSA's experience (your primary customer)

I logged in as a DSA and visited every page. Here's the walk-through.

**The login page is genuinely good.** Strong headline ("India's #1 Intelligence Platform for Loan DSAs"), real social-proof numbers (2,940+ loans matched, 100+ lenders, 80+ cities), a clear "Continue" button, and a "Explore Demo Dashboard" option for the curious. One small technical glitch: the page has two buttons that both act as "submit," so pressing Enter on your keyboard could trigger the wrong one. Easy fix.

**The home page is friendly but has rough edges.** It greets you by time of day ("Good evening") and shows what needs attention. But:
- *Example:* The "Needs Attention" list showed the same line — "Home Loan — Stuck in Intake for 86 days" — five times in a row. Even if those are five real different cases, showing them as five identical-looking rows makes the screen look broken.
- It says "43 active cases, 0 files submitted" with no explanation of why the zero. A new user wonders if something's wrong.
- The notification bell has no number on it, even though 8 cases need attention.
- The "Delete Account" button sits permanently in the sidebar — a tired DSA at 11pm could click it by accident. That belongs tucked away in a settings "danger zone."
- There's no search box at the top — a DSA with 43 cases can't quickly find one by the customer's phone number.
- *My suggestion:* Group or de-duplicate the attention list, add a number badge to the bell, move Delete Account into settings, and add a top-bar search. None of these is hard.

**The Cases list has the single most damaging cosmetic issue in the product.** Every case is labelled by its creation date — "Home Loan — 2026-05-06" — so you see four identical-looking titles in a row. A DSA thinks in names, not dates. *My suggestion:* generate the label from the applicant's name and city — "Rajesh K. — Mumbai HL." This one change cleans up three different screens at once (the Cases list, the case detail page, and the home page). It's the highest-value cosmetic fix in the whole product.

Also on this page: the loan-type filter shows the raw code "home_loan" sitting next to the proper "Home Loan." And the search box only looks up case label or ID — not the customer's phone or PAN, which is how DSAs actually search.

**The case detail page is comprehensive but missing the one thing that matters most: who the customer is.** It shows the loan, the stage, the timeline, notes, tasks — all good. But the header just says "Home Loan — 2026-05-06" and a case ID. *Example:* a DSA on the phone with a bank needs the applicant's name and number right there at the top, and it isn't. *My suggestion:* put applicant name + mobile in the page header.

**The CRM page is solid** — pipeline view, conversion metrics, money totals ("₹37.70 Cr in intake"). The main gap is there's no date filter, so you can't say "show me just this month."

**The RM Contacts page is your moat — and it's leaking test data.** This is the crowdsourced directory of bank contacts, with social proof like "Confirmed by 33 DSAs." That's a genuinely strong feature. But:
- *Example:* The lender filter listed "Digital DSA" (your own company), "xyz bank," and "testing" as if they were real banks. A real contact, "Test RM," showed "Confirmed by 4 DSAs."
- The city filter showed both "Ghaziabad" and "ghaziabad" as separate cities (a capitalization slip).
- The "Confirm" button has no explanation — a new DSA doesn't know if it means "I confirm this RM still works here" or "I confirm their number."
- *My suggestion:* Run a one-time cleanup to quarantine test entries, normalize the city names, and add a one-line tooltip explaining what "Confirm" does. This page is too important to your trust story to have "xyz bank" on it.

**The Team page has the best sales copy in the product.** Its empty state says: "Free tier: team members can fill forms and create cases. Upgrade to Pro to unlock results, analytics, file builder, and custom permissions." That's exactly the right way to nudge an upgrade. The only miss: no price shown or "view pricing" link right there.

**The Analytics page has a couple of credibility-damaging defaults.** It gamifies performance with a score out of 100. But:
- *Example:* the "Total Sanctioned Amount" target is set to ₹1,000 — nonsensical for home loans that average ₹40 lakh+. Looks like a placeholder that shipped.
- When a metric has no data yet, it shows "Excellent — 100%." So a DSA who has done nothing is told they're excellent. That rewards inactivity.
- The page is labelled "PRO / unlocks later" in the sidebar but is fully accessible anyway — so the upgrade label is meaningless.
- *My suggestion:* Fix the target defaults, make "no data" show as "—" not "Excellent," and either enforce or remove the PRO label.

**The Billing page is where you're leaving money on the table.** Three clear plans (₹999 / ₹3,999 / ₹9,999). But:
- *Example:* this account had 43 active cases while on no paid plan — yet the cheapest plan is supposed to cap at 10. So either the limit isn't enforced (you're giving away the product) or this account is special. Either way, the paywall has no teeth.
- Two plans both shout for attention ("MOST POPULAR" and "BEST VALUE") — pick one.
- No annual option (Indian DSAs often prefer paying yearly for tax reasons).
- No free trial button (you only offer "pay now").
- No mention of whether GST is included in the price — a GST-registered DSA needs to know.
- The feature lists are 80% identical across plans, so the reason to upgrade isn't obvious.
- *My suggestion:* Enforce the case limit (block the 11th case on Basic, suggest Pro), add annual pricing, add GST clarity, and show only what's *different* between plans. This is the highest-value commercial fix on the DSA side.

**The Communication, Profile, Shared Links, and Tools pages are mostly fine.** Two things worth noting: the message templates a DSA sends to customers are English-only (despite you having a full Hindi/Marathi translation system — a missed chance, since many customers prefer their own language), and the Profile page lists loan types like "Vehicle Loan" and "Gold Loan" that aren't actually among your six supported loan types (so it slightly misleads DSAs about what the platform does).

---

### 3B. The RM's experience (your bank partners)

**The RM dashboard is cleaner than the DSA's but emptier.** Fewer pages, simpler navigation. But the home page is barren — just a greeting and one "Find DSAs Near You" button. An RM whose whole job is reviewing cases and maintaining policies should see "X cases waiting for you" and "Y policies need re-verification" the moment they log in. Right now they see nothing useful.

**The Policy Library is strong.** 78 lenders, each tagged by type (private bank / government / NBFC / housing finance / small finance bank), and a smart proactive nudge: "State Bank of India verification due in 6 days — verify now." That kind of prompt is exactly right. The gaps: all 78 are owned by a single email address (fine in dev, but in real life that's a single-point-of-failure), there's no search box for 78 entries, and every entry just says "Verified" — it would mean more to say "Verified 2 months ago."

**The Encode Wizard is the best-designed screen in the entire product.** When an RM encodes a bank's policy, they get a clean six-step process (Document Setup → Clause Review → Encoding Review → Missed Items → Reconciliation → Submit), with the bank and product locked in and explained, and a reassuring message: "The AI will normalize terminology and atomize conditions — this takes 20–30 seconds, and your draft saves automatically." *This page should be the template for the polish level of everything else.* If the rest of the product felt like this page, you wouldn't have a Gap B.

**The Settings page is broken.** This is the one live bug. *Example:* logged in as the RM, the Settings page showed "Profile not found — unable to load your profile." The likely cause: when someone is granted RM access, their RM profile record isn't automatically created. So any RM who signs up fresh and clicks Settings hits an error wall. *My suggestion:* automatically create the RM profile when the role is granted. **Fix this before letting any new RM in — it's a first-impression killer.**

Severity: **Blocker.**

**The rest of the RM pages (Cases, Submissions, Broadcasts, DSA Search, Analytics) are functional but thin** — clean empty states, sensible structure, waiting for real activity to flow in. The notable gaps: the Broadcasts feature (send updates to all your DSAs) doesn't tell the RM how many DSAs they'll reach or whether anyone read it, and the DSA Search only filters by city — an RM in an area with no DSAs hits a dead end.

**One good security sign:** I tried to open a policy-review page that belonged to a different RM, and the system correctly blocked me with a "you don't have permission" message. The access controls are working.

---

### 3C. The Admin's experience (your operations team)

**The admin dashboard is the most mature of the three** — which makes sense, your team built it for themselves.

**The Audit Log is the best single page across the entire product.** You can filter every policy change by who did it, what kind of change, which lender, and so on, with a clear "2-year retention" note. This is real operational infrastructure.

But there's an important blind spot: **the audit log only tracks policy changes, not actions on people.** *Example:* when an admin suspends a user, or (eventually) processes a refund, or logs in as someone to debug — none of that shows up in the audit log. For a financial platform, you want every admin action on a user account recorded in one place, both for security and for compliance.

**The User Management page works but is thin on actions.** You can see all DSAs and RMs with their phone numbers and emails, and search by name. But the only thing you can *do* to a user is "Suspend." There's no "log in as this user to help them," no "change their role," no "delete with a record." Interestingly, the "log in as user" feature actually exists in the code — it's just not connected to a button on this page. *My suggestion:* connect it (with a consent prompt and an audit entry).

**A data-consistency issue worth flagging:** the number of lenders is reported differently on different screens — one page says 288, another says 78, another says 62, and the policy-health page says zero policies are actually published. *Example:* the RM-facing library proudly shows 78 lenders, but the admin health-check says 0 published policies. That means either nothing has actually gone live yet, or the system is counting wrong. Worth a focused look, because "how many banks do we cover" is a number you'll quote to customers and investors.

**The admin can upload policy PDFs for the AI to read, review RM submissions, and check registry health** — all working. What's missing is the structured "type it in on behalf of an RM" form (that's Gap A, above).

---

## Part 4 — The business machinery behind the scenes

These are the things you can't see by clicking around — I read the code to assess them. They matter most to finance, legal, and growth.

### Money (the CFO view)

**What works:** Taking payments through Razorpay is done properly — secure verification, no double-charging, and a sensible cancellation policy (you keep access until the period you paid for ends). Trial and renewal reminder emails go out 3 days before expiry.

**What's missing — and this is the most under-built area of the whole platform:**

- **No GST invoices.** You collect a DSA's GST number at signup, but nothing generates a proper tax invoice when they pay. A GST-registered DSA is legally entitled to one. *Example:* a DSA pays ₹3,999, gets a "thanks" email, but no invoice they can claim against their taxes. *Suggest:* auto-generate a GST invoice PDF on every payment. ~3 days.
- **No refund button.** Your refund policy page promises refunds "case by case" — but there's no actual button for your team to issue one. They're presumably doing it manually in Razorpay's own dashboard, off the books. *Suggest:* build an admin refund button with an audit record. ~1 day.
- **No "your payment failed" follow-up.** If a DSA's card fails at renewal, nothing happens — no reminder, no grace period, no eventual lockout. They just silently lose access or keep it for free. *Suggest:* build a simple failed-payment email sequence. ~3 days.
- **No auto-pay (e-NACH).** DSAs have to manually pay every single month. *Suggest:* enable Razorpay's auto-mandate. ~2 days.
- **No commission tracking or "my earnings" page** for DSAs (if your model pays them commission on disbursed loans).
- **No automatic reconciliation** between your records and Razorpay's settlement reports.

*Bottom line:* the subscription engine is solid, but the finance department's day-to-day tools around it aren't built. This is roughly 3–6 weeks of work in total and will become painful the moment real finance operations begin.

### Compliance (the legal view)

- **No "download my data" feature.** India's data protection law (DPDP, Section 11) gives users the right to get a copy of their data. There's no way to fulfil that today. *Suggest:* a "download my data" button that emails a structured export. ~3–5 days. Lower urgency until someone formally requests it — but a regulator-visible gap if they do.
- **No extra security on sensitive admin actions.** Admins log in with the same phone-OTP as everyone else. For accounts that can manage all users and edit lending rules, you want a second factor (an authenticator app). *Suggest:* add 2FA for admin accounts. ~3 days.
- **No "log out my other devices" option** if a phone is lost or stolen.
- **Tax records aren't explicitly kept for the legally-required 6 years** separate from other data.

### Integrations (the partnerships view)

There is currently **no way for the platform to talk to outside systems** — no automated notifications to other tools, no public way for a DSA's accounting software to read their data, no embeddable calculators for a DSA's own website, and no connections to credit bureaus (CIBIL), bank-statement services (Account Aggregator), or document services (DigiLocker). This is fine for now, but the first time a customer asks "can I connect this to my Tally/Zoho," the answer is no. *Suggest:* build outbound notifications and a basic read-only public API when you hit your next pricing tier.

### Growth (the marketing view)

The platform can grow by **direct sales and word of mouth — but not by itself.** There's no referral program (a DSA can't invite another DSA for a reward), no campaign tracking (you can't tell which ad brought which signup), no public eligibility checker (a curious person can't try it before signing up), and no embeddable widgets. *Example:* the only taste a non-customer gets is the "Demo Dashboard" button on login — everything else requires a full phone-OTP signup. *Suggest, in priority order:* referral codes (biggest lever), a public "check your eligibility" page that captures leads, then campaign tracking. Also worth adding: a required "why was this dropped?" reason when a DSA drops a case (so you learn why deals are lost), and a simple satisfaction (NPS) survey.

---

## Part 5 — The one thing that's broken right now

To be crystal clear, because everything else above is "missing" or "needs polish" rather than "broken":

**The RM Settings page shows an error.** A relationship manager who signs up and clicks "Settings" sees "Profile not found" instead of their profile. The fix is to automatically create their profile record when they're granted RM access. **This must be fixed before you onboard any new RM** — it's the kind of first-impression failure that loses a partner on day one.

---

## Part 6 — My recommended plan

Here's how I'd sequence the work, grouped by how much time you have before you want to launch more widely.

### If you fix only 3 things first
1. **Fix the broken RM Settings page.** It's a live bug and a blocker. (~half a day)
2. **Build the admin "capture policy on behalf of RM" screen (Gap A).** It's the single highest-value capability for both your ops team and your lender coverage. (~3–5 days)
3. **Change case labels from dates to customer names.** One change that cleans up your three most-used DSA screens at once. (~1 day)

### If you fix 5 things first (add these two)
4. **Generate GST invoices on payment.** Legal requirement and looks professional. (~3 days)
5. **Put teeth in the pricing plans** — enforce the case limit, add annual pricing, clarify GST, recommend a plan based on usage. (~2 days)

### If you fix 10 things first (add these five)
6. **Clean out the test data** ("xyz bank," "Test RM," "Sample Bank") across all screens before any new customer sees it.
7. **Connect the "log in as user" button** in admin (the feature exists, it's just not wired up) and add 2FA for admins.
8. **Build the admin refund button.**
9. **Reconcile the lender counts** so every screen agrees on how many banks you cover.
10. **Build the "download my data" feature** for data-protection compliance.

### If you have ~20 days of polish (add these)
11. Translate the customer message templates into Hindi and Marathi.
12. Build the "your payment failed" follow-up email sequence.
13. Make all dates display consistently across the product.
14. Turn on the missing notifications (case progressed, loan disbursed, payment received/failed, policy changed, etc.).
15. Add a referral program for DSA-invites-DSA growth.
16. Add a public "check your eligibility" page to capture leads.
17. Add a "why was this dropped?" reason to dropped cases.
18. Add a search box at the top of the dashboard (find by phone/PAN/name).
19. Add bulk actions to the Cases list (select several, act on all).
20. Investigate why "0 policies are published" despite 78 lenders in the library.

---

## Part 7 — What I didn't check, and why

In the interest of honesty about the limits of this audit:

- **I couldn't capture screenshots** — the screenshot tool kept timing out, so this report is based on reading the actual page content and structure rather than pictures. For text, labels, and layout logic this is reliable; for fine visual details (exact colors, spacing) it isn't.
- **I didn't load-test or re-run the security audit** — the previous audit covered encryption, access controls, and rate limiting; I only spot-confirmed that access controls work.
- **I didn't verify the Android app builds** — the mobile project exists in the code, but I didn't compile it.
- **I didn't test the full policy-encoding pipeline end-to-end** — I confirmed the wizard's first step looks right, but didn't paste in a real policy and run it all the way through.
- **I didn't switch the dashboards to Hindi to check translation quality** — I noted that the translation system exists and that message templates are English-only, but didn't audit the depth of dashboard translation.

Any of these can be a focused follow-up if you want certainty on them.

---

## Closing thought

You have a genuinely strong engine wrapped in a product that's about 80% dressed for market. The remaining 20% is unglamorous — name labels instead of date codes, invoices, a refund button, a cleanup of test data, a referral link — but it's exactly the 20% that separates "an impressive demo" from "a product a DSA trusts with their livelihood and a bank trusts with their policies." The good news: almost none of it is hard. It's a focused sprint or two of polish and plumbing, not a rebuild.

The two things I'd genuinely lose sleep over before a wider launch: the broken RM Settings page (fix this week) and the missing admin-on-behalf-of policy capture (build this month). Everything else is sequencing.

---

*This report consolidates a three-session audit. The detailed technical findings — including per-page scoring tables, exact file paths, and the route-by-route Gap A investigation — are in `PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md`.*
