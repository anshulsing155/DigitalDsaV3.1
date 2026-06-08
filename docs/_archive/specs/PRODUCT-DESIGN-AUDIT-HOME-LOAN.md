# Home Loan Form — Product Design Audit Report

**Date**: 2026-02-26
**Status**: CRITICAL ISSUES IDENTIFIED
**Priority**: P0 — Blocks Testing & UAT

---

## Executive Summary

The Home Loan form has **3 critical logical inconsistencies** that violate product design principles:

1. Questions asked in wrong context (after preceding answer makes them irrelevant)
2. Broken conditional logic preventing questions from showing
3. Missing cascading filters (no state filtering based on zone type)

These issues are causing **credibility loss** with testing teams and should be fixed before UAT.

---

## CRITICAL ISSUES

### 🔴 ISSUE #1: NA Conversion Question NEVER Shows (Broken Logic)

**Page**: Property Condition & Compliance
**Question ID**: `q6_naConversionStatus`
**Question**: "What is the current status of the NA (Non-Agricultural) conversion order?"

**Problem**:

```json
"showWhen": {"==":[1,0]}
```

- This condition is **always FALSE** (1 never equals 0)
- Question NEVER displays, even for CONVERTED_RESIDENTIAL properties
- This means the NA conversion status is never collected

**Impact**:

- For converted land properties, lenders can't assess conversion risk
- Data gap in compliance assessment
- Rules engine can't use this signal

**Fix**:

```json
"showWhen": {
  "==": [
    {"var": "propertyAreaType"},
    "CONVERTED_RESIDENTIAL"
  ]
}
```

**Effort**: < 5 minutes

---

### 🔴 ISSUE #2: Asking for "Builder Demand Amount" After Registry is Done

**Page**: BT Registry & Possession
**Question ID**: `q3_bt_outstandingDemandAmount`
**Question**: "What is the total outstanding demand amount from the builder?"

**Problem**:

```json
"showWhen": {"==": [{"var": "isRegistryDone"}, "No"]}
```

- Shows only when `isRegistryDone = "No"`
- **But user reports being asked EVEN WHEN registry is DONE**
- Logical violation: After registry, there should be NO outstanding builder demand

**Scenario showing the issue**:

```
User flow:
1. Q1 Registry: "Has registry been done?" → User answers "YES"
2. Q2 Possession: "What is possession status?" → Asking about builder demand
3. Q3 Builder Demand: "What is outstanding demand amount?" → Makes NO SENSE

If registry is done, the property is already transferred to the owner!
Why ask about builder demand that should be zero?
```

**Impact**:

- DSAs confused about when to answer this
- Inconsistent data collection
- Testing teams question form logic

**Fix**:

```json
"showWhen": {
  "and": [
    {"==": [{"var": "isRegistryDone"}, "No"]},
    {
      "or": [
        {"==": [{"var": "bt_possessionAndDemandStatus"}, "POSSESSION_WITH_DEMAND"]},
        {"==": [{"var": "bt_possessionAndDemandStatus"}, "NO_POSSESSION_WITH_DEMAND"]}
      ]
    }
  ]
}
```

**Logic**:

- Only ask if registry NOT done AND builder has pending demand
- Skip if no demand ("NO_POSSESSION_NO_DEMAND")
- Skip if registry already done

**Effort**: < 5 minutes

---

### 🟠 ISSUE #3: No Cascading State Filter for Special Area Restrictions

**Problem**: Your CRZ scenario

```
User selects: "Coastal Regulation Zone" (special restricted area)
↓
System asks: "Which state is the property in?"
↓
User can select: "Rajasthan" (no coastline = INVALID!)
```

**Currently**:

- All 36 Indian states available for ALL property types
- No validation that state matches the selected area restriction
- Leads to impossible combinations (landlocked state + coastal zone)

**Missing Validations**:

| Selected Zone                 | Valid States                                                                            | Invalid States                                          |
| ----------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Coastal Regulation Zone (CRZ) | Gujarat, Goa, Kerala, Tamil Nadu, Maharashtra, Odisha, West Bengal, Puducherry, Andaman | Rajasthan, Punjab, Delhi, Haryana, Madhya Pradesh, etc. |
| Cantonment                    | States with military bases: Punjab, Rajasthan, Uttar Pradesh, etc.                      | States without cantonment areas                         |
| Tribal Areas                  | Jharkhand, Chhattisgarh, Odisha, Andhra Pradesh, Telangana, Meghalaya, etc.             | Metropolitan states                                     |
| Wetlands/Eco-sensitive        | Coastal + forest states                                                                 | Desert/urban states                                     |

**Impact**:

- Data quality issues
- Invalid combinations in submitted forms
- Testing team ridicule ("How can coastal zone be in Punjab?")

**Fix**:

1. Add metadata mapping: Zone Type → Valid States
2. Implement cascading filter on state/city selection
3. Add validation error: "Coastal Regulation Zone not applicable in [selected state]"

**Implementation**:

```typescript
// New mapping file needed
const ZONE_STATE_MAPPING = {
  "CRZ": ["Gujarat", "Goa", "Kerala", "Tamil Nadu", "Maharashtra", ...],
  "CANTONMENT": ["Punjab", "Rajasthan", ...],
  "TRIBAL": ["Jharkhand", "Chhattisgarh", ...],
  // etc
}

// Validation in form
if (specialZone && !validStates.includes(selectedState)) {
  showError(`${specialZone} not applicable in ${selectedState}`);
}
```

**Effort**: 1-2 hours (including testing)

---

## SUPPORTING LOGICAL ISSUES

### Issue #4: Multiple Pages Asking About Same Topic

**Pages with overlapping questions**:

- Property Condition & Compliance (Q1-Q12)
- Legal Verification (Q1, Q4-Q8)
- Seller & Transaction (property acquisition history)
- Deal & Financials (same property details asked again)

**Example redundancy**:

```
propertyCondition_homeLoan: Q5 "Is project RERA registered?"
            ↓
dealFinancials_homeLoan: Same question asked again?
```

**Impact**: DSA confusion, data quality variations
**Fix**: Single source of truth per question (ask once, reuse across pages)

---

### Issue #5: Construction Type Not Gating Relevant Questions

**Current**: All construction types get same questions
**Should be**:

- **Flat/Floor** → Ask about society approvals, membership
- **House** → Ask about municipal approval, building plan
- **Plot** → Ask about infrastructure, city plan approval

**Missing gates**:

```
q3_municipalApproval shows for ALL
Should: Gate to constructionType = "House" OR "Apartment"
```

---

## PRODUCT DESIGN PRINCIPLES VIOLATED

| Principle                  | Violation                                                | Example                                   |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| **Context Relevance**      | Question shown when preceding answer makes it irrelevant | Asking builder demand AFTER registry done |
| **Logical Consistency**    | Broken conditions or impossible combinations             | CRZ zone + landlocked state               |
| **Single Source of Truth** | Same info collected on multiple pages                    | Property details asked 3 different ways   |
| **Cascading Logic**        | Parent answer not gating child questions                 | Zone type doesn't filter states           |
| **Data Quality**           | Conditions allow invalid data collection                 | `showWhen: {"==":[1,0]}` never evaluates  |

---

## RECOMMENDATIONS (Priority Order)

### P0 - Fix Immediately (Blocks Testing)

1. ✅ Fix `q6_naConversionStatus` broken condition
2. ✅ Fix builder demand amount flow (gate properly)
3. ✅ Add state filtering for special zones

### P1 - Fix Before UAT (Product Quality)

4. Eliminate question redundancy (single source of truth)
5. Gate questions by construction type
6. Implement proper sequence validation

### P2 - Future Enhancement (Optimization)

7. Add visual flow indicators (why this question is asked)
8. Add dependent field validations
9. Implement conditional validation rules

---

## TESTING IMPACT

**Current State**: Testing teams question form credibility

- "Why ask about builder demand after ownership transfer?"
- "How can we select coastal zone in inland state?"
- "Why is this question never shown?"

**After Fixes**: Form flow is **logically consistent and defensible**

---

## Appendix: Full Condition Audit

### Questions with Broken/Suspicious Conditions

| ID                            | Question             | Current ShowWhen       | Issue               | Status        |
| ----------------------------- | -------------------- | ---------------------- | ------------------- | ------------- |
| q6_naConversionStatus         | NA conversion status | `{"==":[1,0]}`         | Always FALSE        | ❌ BROKEN     |
| q3_bt_outstandingDemandAmount | Builder demand       | `isRegistryDone=="No"` | Illogical gate      | ⚠️ NEEDS GATE |
| [Various]                     | Location selection   | None                   | No cascading filter | ⚠️ MISSING    |

---

## Next Steps

1. **Immediate**: Fix Issues #1 & #2 (< 10 minutes total)
2. **This Week**: Implement Issue #3 (state filtering)
3. **Before UAT**: Address Issues #4 & #5
4. **Sign-off**: Product team review of all question flows by loan type
