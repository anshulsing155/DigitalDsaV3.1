# JSON Content Optimization Audit

## Summary

**46 JSON files exist** in `src/lib/data/website/` — all are consumed by their matching components. ✅

All page-level components (Plot Loan, LAP, and Other HL sub-pages) have been fully migrated from hardcoded content to externalized JSON.

---

## ✅ Home Loan Pages — All Using JSON

| Route Slug | Component | JSON File | Status |
|---|---|---|---|
| `home-loan-for-business` | `HomeLoanForBusiness.svelte` | `homeLoanForBusiness.json` | ✅ |
| `balance-transfer` | `BalanceTransfer.svelte` | `balanceTransfer.json` | ✅ |
| `top-up-only` | `HomeTopUp.svelte` | `homeTopUp.json` | ✅ |
| `home-loan-support` | `HomeLoanSupport.svelte` | `homeLoanSupport.json` | ✅ |
| `buying-first-home` | `BuyingFirstHomeHL.svelte` | `buyingFirstHomeHL.json` | ✅ |
| `saving-for-deposit` | `SavingForDepositArticle.svelte` | `savingForDepositArticle.json` | ✅ |
| `conditional-pre-approval` | `ConditionalPreApprovalArticle.svelte` | `conditionalPreApprovalArticle.json` | ✅ |
| `understand-cost-of-buying-home` | `UnderstandCostOfBuyingHomeArticle.svelte` | `understandCostOfBuyingHomeArticle.json` | ✅ |
| `buy-or-rent` | `BuyOrRentArticle.svelte` | `buyOrRentArticle.json` | ✅ |
| `buy-property-resale` | `BuyPropertyResaleOrDirectArticle.svelte` | `buyPropertyResaleOrDirectArticle.json` | ✅ |
| `choose-perfect-neighbourhood` | `ChoosePerfectNeighbourhoodArticle.svelte` | `choosePerfectNeighbourhoodArticle.json` | ✅ |
| `close-your-loan-early` | `CloseYourLoanEarlyArticle.svelte` | `closeYourLoanEarlyArticle.json` | ✅ |
| `home-renovation` | `HomeRenovationArticle.svelte` | `homeRenovationArticle.json` | ✅ |
| `investing-in-property` | `InvestingInPropertyArticle.svelte` | `investingInPropertyArticle.json` | ✅ |
| `selling-your-property` | `SellingYourPropertyArticle.svelte` | `sellingYourPropertyArticle.json` | ✅ |
| `buying-next-home` | `BuyingNextHomeHL.svelte` | `buyingNextHomeHL.json` | ✅ |
| `renovate-or-move` | `RenovateOrMove.svelte` | `renovateOrMove.json` | ✅ |
| `home-loan-tools-calculator` | `HomeLoanToolsandCalculator.svelte` | `homeLoanToolsandCalculator.json` | ✅ |
| `turning-your-home-into-investment` | `TurningYourHomeIntoInvestment.svelte` | `turningYourHomeIntoInvestment.json` | ✅ |
| `understanding-home-loan-process` | `HomeLoanProcess.svelte` | `homeLoanProcess.json` | ✅ |

---

## ✅ Plot Loan Pages — All Using JSON

| Route Slug | Component | JSON File | Status |
|---|---|---|---|
| `plot-only-loan` | `PlotLoanOnly.svelte` | `plotLoanOnly.json` | ✅ |
| `construction-loan` | `ConstructionLoan.svelte` | `constructionLoan.json` | ✅ |
| `plot-and-construction-loan` | `Plot&ConstructionLoan.svelte` | `plotConstructionLoan.json` | ✅ |
| `plot-and-equity-loan` | `Plot&EquityLoan.svelte` | `plotEquityLoan.json` | ✅ |
| `plot-only-loan-challenges` | `PlotLoanOnlyChallenges.svelte` | `plotLoanOnlyChallenges.json` | ✅ |
| `plot-loan-support` | `PlotLoanSupport.svelte` | `plotLoanSupport.json` | ✅ |
| `agricultural-to-residential` | `AgriculturalToResidential.svelte` | `agriculturalToResidential.json` | ✅ |

---

## ✅ LAP (Loan Against Property) Pages — All Using JSON

| Route Slug | Component | JSON File | Status |
|---|---|---|---|
| `new-loan` | `LapNewLoan.svelte` | `lapNewLoan.json` | ✅ |
| `balance-transfer` | `LapBT.svelte` | `lapBT.json` | ✅ |
| `top-up` | `TopUpPlot.svelte` | `topUpPlot.json` | ✅ |
| `balance-transfer-with-top-up` | `LapBTWithTopUp.svelte` | `lapBTWithTopUp.json` | ✅ |
| `business-financial-health` | `BusinessFinancialHealth.svelte` | `businessFinancialHealth.json` | ✅ |
| `unlocking-power-of-collateral` | `UnlockingPowerCollateralArticle.svelte` | `unlockingPowerCollateral.json` | ✅ |
| `LAPvsDOD` | `LapvsDOD.svelte` | `lapVsDod.json` | ✅ |
| `dropline-overdraft` | `DodArticle.svelte` | `dodArticle.json` | ✅ |
| `what-is-debt-consolidation` | `DataConsolidation.svelte` | `dataConsolidation.json` | ✅ |

---

## ✅ Other Page Components — All Using JSON

These are page components found in the components folder with their JSON files:

| Component | JSON File | Status |
|---|---|---|
| `HomeBTwithTopup.svelte` | `homeBTwithTopup.json` | ✅ |
| `HomeLoanOffset.svelte` | `homeLoanOffset.json` | ✅ |
| `HomeLoanRedraw.svelte` | `homeLoanRedraw.json` | ✅ |
| `HomeGuaranteeScheme.svelte` | `homeGuaranteeScheme.json` | ✅ |
| `GreenLoanHL.svelte` | `greenLoanHL.json` | ✅ |
| `InvestInProperty.svelte` | `investInProperty.json` | ✅ |
| `ManageHomeLoan.svelte` | `manageHomeLoan.json` | ✅ |
| `PropertyInsight.svelte` | `propertyInsight.json` | ✅ |
| `PartnershipOffers.svelte` | `partnershipOffers.json` | ✅ |
| `MakeBudget.svelte` | `makeBudget.json` | ✅ |

---

## What Was Done

For each component, the process was:

1. **Created a JSON file** in `src/lib/data/website/` matching the structure used by the component
2. **Added `import content from '...'`** at the top of the component's `<script>` and refactored using Svelte 5 runes (`let { ... } = $props();` and `$derived`)
3. **Replaced hardcoded strings** in the template with `content.xxx` references
4. **Preserved responsive view details, CSS/visual layouts, and button click store bindings** (e.g. updating `applicationData` with derived values where appropriate)
