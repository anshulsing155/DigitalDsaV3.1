---
type: sprint
phase: V5-PHASE-2B
sprint: 12
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 12 — 7-Role Team + Branches + Sub-DSA (Weeks 25-26)

## Goal

Team management at scale: 7 roles, branch hierarchy, lead/case assignment, Sub-DSA as a User-with-sourcing-role.

## Scope

### 7 roles + permissions matrix

- Owner, Admin, Branch Head, Sales, Processor, Telecaller, RM Coordinator
- Permission matrix in code (per [../../05-domains/11-TEAM.md](../../05-domains/11-TEAM.md))
- Override allowed per-member (rare)

### Branch hierarchy

- `Branch` entity with optional parent
- `branch_id` on User and Case
- Branch Head sees only their branch (and sub-branches)

### Assignment

- `assigned_to_user_id` on Case and Lead
- Assignment endpoint, audit-logged
- Work Queue filters by assignee

### Sub-DSA

- User with `is_sub_dsa: true` and `sub_dsa_terms`
- Commission `employee_split` computed from terms
- Internal split on commission record (not external payable)

### UI

- `/team` member list + branch view
- `/team/[id]` member profile + productivity card
- Invite flow with role + branch
- Case detail: assignment dropdown (role-gated)

### Progressive disclosure

- Solo DSAs (1 user) see no team UI (capability gated)
- Plan upgrade enables `module.team` → UI appears with sample-data walkthrough

### A-16 acceptance

Sub-DSA authenticates, gets case access, commission is internal split not partner payable.

## Tasks

| Task | Acceptance |
|---|---|
| 7 roles + matrix | Permission lookup works per role/scope/action |
| Branch entity + hierarchy | CRUD; parent-child enforced |
| Assignment on Case + Lead | Endpoint, audit, notifications |
| Sub-DSA terms + commission integration | Split correctly computed |
| Team UI (mobile + desktop) | Per design |
| Invite flow | MSG91 OTP for joining |
| Productivity card | Reads from ClickHouse fact tables |
| A-16 lock test | Passes |
| Capability gating ensures solo DSAs see nothing | Tested |

## Tests

- Permission matrix lock tests per role
- Branch isolation: Branch Head sees only branch data
- Sub-DSA commission split correct
- Assignment audit trail

## Decisions needed

- D-5 (final role matrix + Sub-DSA scope)

## Exit criteria

- FR-TEAM-1..5 satisfied + Sub-DSA per §6.4
- A solo DSA's UI unchanged
- A small DSA firm can onboard 5 team members across 2 branches

## Owner involvement

4-6 hours/day.
