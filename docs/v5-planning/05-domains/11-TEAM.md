---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2B Sprint 12
capability_key: module.team
---

# Team Domain

## What this domain is

Team management for DSA orgs that have more than one person. Covers users, roles, branches, assignment, performance tracking, and the Sub-DSA model.

V3 had 4 roles (admin / data_entry / viewer / field_agent) with no branch scoping. V5 has 7 roles + branch hierarchy + assignment + Sub-DSA as a sourcing role.

## The 7 roles

| Role | What they can do |
|---|---|
| **Owner** | Everything. Plan changes, billing, capability toggles. Cannot be deleted (one per org). |
| **Admin** | Most things except billing and Owner-only operations |
| **Branch Head** | Sees and manages their branch only; cannot see other branches' data |
| **Sales** | Creates leads + cases, communicates with customers, no commission visibility for others |
| **Processor** | Works on cases in pipeline (file building, doc collection, bank queries); doesn't initiate leads |
| **Telecaller** | Outbound calling, lead intake, follow-ups; limited case access |
| **RM Coordinator** | Manages bank RM relationships, RM contacts, conversation threads with RMs |

Plus a special **Sub-DSA** sourcing role (see below).

## Schemas

```typescript
export const TeamMemberSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  user_id: ObjectIdSchema,                       // links to User auth entity
  role: z.enum(['owner', 'admin', 'branch_head', 'sales', 'processor', 'telecaller', 'rm_coordinator']),
  branch_id: ObjectIdSchema.optional(),
  is_sub_dsa: z.boolean().default(false),       // sourcing flag
  sub_dsa_terms: z.object({
    split_percent_bp: z.number(),                // basis points
    payout_basis: z.enum(['percent_of_commission', 'flat_per_case']),
    flat_inr: z.number().optional(),
  }).optional(),
  status: z.enum(['invited', 'active', 'suspended', 'archived']),
  invited_at: z.date().optional(),
  invited_by_user_id: ObjectIdSchema.optional(),
  joined_at: z.date().optional(),
  permissions_override: z.record(z.boolean()).optional(),  // fine-tune defaults
  created_at: z.date(),
  updated_at: z.date(),
});

export const BranchSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  name: z.string(),
  parent_branch_id: ObjectIdSchema.optional(),   // hierarchy
  head_user_id: ObjectIdSchema.optional(),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string().length(6),
  }).optional(),
  active: z.boolean().default(true),
  created_at: z.date(),
});
```

## Permission matrix (default by role)

```typescript
const DEFAULT_PERMISSIONS = {
  owner: { all: true },
  admin: { all: true, except: ['billing.change_plan', 'team.assign_owner'] },
  branch_head: {
    cases: { read: 'own_branch', write: 'own_branch' },
    leads: { read: 'own_branch', write: 'own_branch' },
    commissions: { read: 'own_branch', write: 'own_member' },
    team: { read: 'own_branch', write: 'own_branch' },
    partners: { read: 'own_branch', write: 'own_branch' },
    reports: { read: 'own_branch' },
  },
  sales: {
    cases: { read: 'own', write: 'own' },
    leads: { read: 'own', write: 'own' },
    commissions: { read: 'own' },
    conversations: { read: 'own', write: 'own' },
  },
  processor: {
    cases: { read: 'assigned', write: 'assigned' },
    documents: { write: true },
    conversations: { read: 'assigned', write: 'assigned' },
  },
  telecaller: {
    leads: { read: 'org', write: 'org' },
    follow_ups: { read: 'own', write: 'own' },
    cases: { read: 'limited' },
  },
  rm_coordinator: {
    conversations: { read: 'org_rm_only', write: 'org_rm_only' },
    cases: { read: 'org', write: 'limited' },
  },
};
```

## Sub-DSA model

A Sub-DSA is a **User with a sourcing role** inside the org — not a Partner.

Key distinction:
- **Partner** (external) — only sends leads. Earns commission as an external payable. Doesn't have case access.
- **Sub-DSA** (internal) — sources leads + processes cases. Earns commission as an **internal split** on the org's commission record.

```typescript
// Sub-DSA member
{
  user_id: ...,
  role: 'sales',
  is_sub_dsa: true,
  sub_dsa_terms: {
    split_percent_bp: 5000,  // 50%
    payout_basis: 'percent_of_commission',
  },
}
```

When the org's commission record is created on a case where the lead was sourced by a Sub-DSA, the commission's `employee_split` is computed from the Sub-DSA's terms.

## Service methods

```typescript
class TeamsService {
  // Members
  invite(orgId, mobile, role, branchId, by): Promise<TeamMember>
  activateInvitation(token, by): Promise<TeamMember>
  updateRole(memberId, role, by): Promise<TeamMember>
  updateSubDsaTerms(memberId, terms, by): Promise<TeamMember>
  suspend(memberId, by): Promise<TeamMember>
  archive(memberId, by): Promise<void>

  // Branches
  createBranch(input, by): Promise<Branch>
  listBranches(orgId): Promise<Branch[]>
  assignMember(memberId, branchId, by): Promise<TeamMember>

  // Assignment (case/lead level)
  assignCase(caseId, userId, by): Promise<void>
  assignLead(leadId, userId, by): Promise<void>

  // Permissions
  canAccess(member, resource, action, target): Promise<boolean>

  // Performance
  getMemberStats(memberId, dateRange): Promise<MemberStats>
  // { cases_created, cases_converted, conversion_rate, commission_attributed, follow_ups_completed }
}
```

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/team` | `module.team` |
| POST | `/api/internal/team/invite` | `module.team` (admin+) |
| POST | `/api/internal/team/:id/role` | `module.team` (owner/admin) |
| POST | `/api/internal/team/:id/sub-dsa-terms` | `module.team` + `feature.sub_dsa` |
| POST | `/api/internal/team/:id/suspend` | `module.team` (admin+) |
| GET | `/api/internal/branches` | `module.team` |
| POST | `/api/internal/branches` | `module.team` (owner/admin) |
| POST | `/api/internal/cases/:id/assign` | `module.cases` + permission |
| GET | `/api/internal/team/:id/stats` | `module.team` + `module.reports` |

## UI surfaces

| Screen | Description |
|---|---|
| `/team` | Member list with role + branch + status |
| `/team/[member_id]` | Member profile with productivity card |
| `/team/branches` | Branch hierarchy view |
| `/team/invite` | Invite flow |
| Case detail | Assignee dropdown (role-gated) |

### Progressive disclosure

Solo DSAs (one user) see no team UI. The capability `module.team` is off in their bundle, so nav items, settings sections, and assignment controls all disappear.

When their plan upgrades and `module.team` is enabled, team UI appears with a sample-data walkthrough.

## Cross-domain interactions

| Other domain | When |
|---|---|
| Cases | `assigned_to_user_id`, `branch_id` set on case |
| Leads | Same |
| Commissions | Sub-DSA terms compute `employee_split` |
| Permissions | Every service method checks `canAccess` |

## Capability keys

- `module.team` — base team management
- `feature.sub_dsa` — adds Sub-DSA sourcing role (depends on `module.team` + `module.commission`)

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [07-COMMISSION.md](07-COMMISSION.md)
- [08-PARTNER.md](08-PARTNER.md) — Partner vs Sub-DSA distinction
- [../09-sprints/V5-PHASE-2B/sprint-12-team-scale.md](../09-sprints/V5-PHASE-2B/sprint-12-team-scale.md)
