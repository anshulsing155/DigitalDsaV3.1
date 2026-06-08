---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2B Sprint 9 + 10
capability_key: module.builder_whitelabel
---

# Builder Domain (White-label)

## What this domain is

A Builder is a property developer who wants an eligibility checker on their project website. When prospective buyers fill it, the system returns an indicative range and routes the lead to a nearby high-rated DSA in the builder's DSA pool.

This is V5's distribution moat and the biggest §13 Q4 risk. Done right, it grows DSAs' pipelines. Done wrong, it lets builders bypass DSAs.

## The architectural safety net

**White-label builders are independently signed by DigitalDSA — never sourced from any DSA's partner list.**

This is the data-pool wall:
- We never look at any DSA org's `partners` collection to find builders to onboard
- Every builder in any white-label pool has a signed contract on file (evidence archived to S3)
- The lead routing engine reads ranking inputs that are audited per lead
- A-19 acceptance lock test asserts the wall holds

## Schemas

```typescript
export const BuilderSchema = z.object({
  _id: ObjectIdSchema,                          // global (DigitalDSA-managed)
  name: z.string(),                             // "Acme Projects"
  legal_entity: z.string(),
  contact: z.object({
    primary_name: EncryptedString,
    primary_mobile: BlindIndexedMobile,
    primary_email: EncryptedString,
  }),
  signed_evidence_ref: z.string(),              // S3 link to signed contract
  signed_at: z.date(),
  active: z.boolean().default(true),
  subscription_id: ObjectIdSchema,
  embed_config: z.object({
    primary_color: z.string(),                  // hex
    logo_url: z.string().url().optional(),
    consent_text: z.string(),                   // localised consent copy
    allowed_loan_types: z.array(z.string()),
  }),
  dsa_pool_id: ObjectIdSchema,
  created_at: z.date(),
  updated_at: z.date(),
});

export const DsaPoolSchema = z.object({
  _id: ObjectIdSchema,
  builder_id: ObjectIdSchema,
  dsa_org_ids: z.array(ObjectIdSchema),
  join_rules: z.object({
    geo_pincodes: z.array(z.string()),          // serviceable pincodes
    min_reputation_score: z.number().optional(),
    rotation_policy: z.enum(['round_robin', 'weighted_reputation', 'nearest_first']),
  }),
  active: z.boolean().default(true),
});

export const BuilderLeadSchema = z.object({
  _id: ObjectIdSchema,
  builder_id: ObjectIdSchema,
  captured_at: z.date(),
  captured_via: z.literal('embed_widget'),
  captured_data: z.object({
    full_name_plaintext: z.string(),
    mobile_plaintext: z.string(),
    email_plaintext: z.string().optional(),
    loan_type: z.string(),
    estimated_amount_inr: z.number(),
    property_pincode: z.string(),
    consent_recorded: z.boolean(),
    consent_ip: z.string(),
    consent_user_agent_hash: z.string(),
  }),
  indicative_range_inr: z.object({
    min: z.number(),
    max: z.number(),
  }),
  routing: z.object({
    candidates: z.array(z.object({
      dsa_org_id: ObjectIdSchema,
      score: z.number(),
      reasoning: z.array(z.string()),           // why this rank: distance, reputation, load
      paid_placement: z.boolean().default(false),
    })),
    selected_dsa_org_id: ObjectIdSchema.optional(),
    selected_at: z.date().optional(),
    accepted_at: z.date().optional(),
    declined_at: z.date().optional(),
    re_routed_count: z.number().int().default(0),
  }),
  converted_to_lead_id: ObjectIdSchema.optional(),
  status: z.enum(['captured', 'routing', 'assigned', 'accepted', 'converted', 'lost', 'expired']),
});
```

## The flow

```
Consumer on builder's website
   ↓
Sees embedded widget (DigitalDSA-served from CDN)
   ↓
Fills 6-question eligibility form (loan, income, employment, city, property)
   ↓
Captures DPDP-compliant consent
   ↓
Submits → POST /embed/v1/leads
   ↓
Server-side:
  1. Validate, anti-bot (CAPTCHA + rate limit)
  2. Compute indicative range using engine (NEVER a confident single number)
  3. Routing engine ranks DSAs in builder's pool by (pincode_proximity, reputation, load)
  4. Selected DSA notified (push + email)
   ↓
DSA accepts/declines in their inbox
   ↓
On accept: lead created in DSA's org as a regular Lead with builder_attribution
   ↓
On decline / timeout (24h): re-route to next candidate
   ↓
Customer hears from DSA within ~1 working day
```

## The consumer-facing output — indicative, never a commitment

**§13 R-15 requirement.** The widget MUST show a range, never a confident single number. UI copy:

> Based on what you've shared, your eligibility is **₹35-42 lakh**. A qualified loan expert will reach out within one working day with a precise assessment.

NOT:

> ❌ You qualify for ₹38.5 lakh from HDFC at 8.7%.

A confident single number creates regulatory and liability exposure. Range + DSA assessment is the legal-safe shape.

## Routing transparency (D-12)

Ranking inputs logged per lead:

```typescript
candidates: [
  { dsa_org_id: '...', score: 87, reasoning: ['pincode_match_exact', 'reputation_high (4.6/5)', 'load_low (3 active cases)'] },
  { dsa_org_id: '...', score: 72, reasoning: ['pincode_match_adjacent', 'reputation_high (4.5/5)', 'paid_placement: true'], paid_placement: true },
]
```

If any candidate is paid placement, the widget shows "Promoted" badge — never silently boosted.

## The data-pool wall enforcement

Lock test (A-19):

```typescript
describe('A-19: builder data-pool wall', () => {
  it('every builder in any pool has signed_evidence_ref', async () => {
    const builders = await db.collection('builders').find().toArray();
    for (const b of builders) {
      expect(b.signed_evidence_ref).toBeTruthy();
      const obj = await s3.head({ Key: b.signed_evidence_ref });
      expect(obj).toBeDefined();
    }
  });

  it('no builder in any pool appears in any DSA org partners', async () => {
    const builders = await db.collection('builders').find().toArray();
    const builderMobileHashes = builders.map(b => b.contact.primary_mobile.blind_index);

    for (const orgPartners of allOrgsPartners) {
      const partnerMobileHashes = orgPartners.map(p => p.mobile.blind_index);
      const overlap = builderMobileHashes.filter(h => partnerMobileHashes.includes(h));
      expect(overlap).toHaveLength(0);  // no DSA partner is in our builder pool
    }
  });
});
```

If this test ever fails, GA cannot ship. Builder white-label launch blocked.

## Builder portal

A separate SvelteKit app at `apps/builder-app/`:
- Builder logs in via magic-link email
- Dashboard: leads captured, conversion funnel, DSA pool performance
- Subscription management (eNACH, plan tier, invoices)
- Embed configuration: theming, allowed loan types, target pincodes
- DSAs in pool view (shows DSA org names, not individual customers)

Builder portal NEVER shows:
- Customer mobile or PAN
- Lender details
- Case status beyond aggregate

## Embed widget

Tiny JS bundle delivered from a CDN. Under 30KB gzipped.

```html
<!-- Builder's website -->
<script src="https://cdn.digitaldsa.com/embed/v1.js"
        data-builder="acme-projects-token"></script>
<div id="digitaldsa-eligibility"></div>
```

Iframe-sandboxed: parent page (builder's site) cannot read consumer's inputs. CAPTCHA bot protection. Rate-limited per-builder and per-IP.

## Service methods

```typescript
class BuildersService {
  // Builder management (admin)
  create(input, by): Promise<Builder>            // admin role only
  attachDsaToPool(builderId, dsaOrgId, by): Promise<void>
  removeDsaFromPool(builderId, dsaOrgId, by): Promise<void>

  // Embed handling
  serveEmbedConfig(builderToken): Promise<EmbedConfig>
  submitLead(builderToken, input): Promise<BuilderLead>
  routeLead(builderLeadId): Promise<{ selected_dsa_org_id }>

  // DSA-side
  acceptLead(builderLeadId, by): Promise<{ lead: Lead }>
  declineLead(builderLeadId, by): Promise<void>

  // Reporting
  builderStats(builderId, dateRange): Promise<BuilderStats>
  dsaPoolStats(dsaOrgId): Promise<{ leads_received, accepted_rate, converted_rate }>
}
```

## Subscription

Builders pay subscription using existing Razorpay infra (Phase 1's billing system, copied into V5). Plans:

| Plan | Lead volume / month | Price |
|---|---|---|
| Starter | up to 50 | ₹X / month |
| Growth | up to 250 | ₹Y / month |
| Enterprise | unlimited | ₹Z + per-lead |

eNACH auto-pay; dunning if missed; status pauses widget if subscription lapses.

## Cross-domain interactions

| Other domain | When |
|---|---|
| Leads | Accepted builder lead becomes a regular DSA Lead with `source_attribution.builder_id` |
| Customers | On lead conversion, customer is created (or found) |
| Partners | Builder white-label is **distinct from Partner CRM** — Builder is on the platform side; Partner is on the DSA's side |
| Commission | A builder-sourced case computes commission with builder routing fee + DSA org take |
| Audit | Every routing decision logged |

## Capability key

`module.builder_whitelabel` — applies to the builder portal tenant. DSA orgs that opt into builder pools have a separate flag (`feature.accept_builder_leads`).

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [04-LEAD.md](04-LEAD.md)
- [08-PARTNER.md](08-PARTNER.md)
- [../04-security/04-PRINCIPLE-12-GATE.md](../04-security/04-PRINCIPLE-12-GATE.md)
- [../09-sprints/V5-PHASE-2B/sprint-9-partner-crm.md](../09-sprints/V5-PHASE-2B/sprint-9-partner-crm.md)
- [../10-decisions/OPEN-DECISIONS.md](../10-decisions/OPEN-DECISIONS.md) — D-10, D-12
