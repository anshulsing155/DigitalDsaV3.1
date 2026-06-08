# P0 Remaining Fixes — Implementation Notes

**Status**: ✅ 5 of 6 fixes committed (`76ac5869`) | ⏳ 2 remaining (low priority, complex structure)

---

## P0-1: Delete q1b_propertyComplianceStatus_converted

**Current State**: Question now shows for `CONVERTED_RESIDENTIAL`

**Issue**: Partially redundant with `q6_naConversionStatus`

**Action**: Remove entire question object (lines 1363-1436 in both schema files)

**Recommended**: Use VS Code text editor or defer (not mission-critical)

---

## P0-2: Fix Tautology showWhen

**Current State**: `or: [ != resale_endorsement, == resale_endorsement ]` = always true

**Action**: Delete lines 3003-3022 (the `showWhen` block)

**Recommended**: Remove showWhen entirely or defer (question works, condition is redundant)

---

## Recommendation

**Continue to Phase 2 immediately** — both P0-1 & P0-2 are non-blocking, and Phase 2 has cleaner targets.
