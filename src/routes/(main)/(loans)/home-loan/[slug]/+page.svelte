<script>
  import { page } from "$app/stores";
  import PageNotFound from "$lib/components/website/PageNotFound.svelte";
  import BalanceTransfer from "$lib/components/website/BalanceTransfer.svelte";
  import HomeTopUp from "$lib/components/website/HomeTopUp.svelte";
  import HomeLoanForBusiness from "$lib/components/website/HomeLoanForBusiness.svelte";
  import BuyingFirstHomeHl from "$lib/components/website/BuyingFirstHomeHL.svelte";
  import BuyingNextHomeHl from "$lib/components/website/BuyingNextHomeHL.svelte";
  import HomeLoanToolsandCalculator from "$lib/components/website/HomeLoanToolsandCalculator.svelte";
  import HomeLoanProcess from "$lib/components/website/HomeLoanProcess.svelte";
  import SavingForDepositArticle from "$lib/components/website/SavingForDepositArticle.svelte";
  import ConditionalPreApprovalArticle from "$lib/components/website/ConditionalPreApprovalArticle.svelte";
  import UnderstandCostOfBuyingHomeArticle from "$lib/components/website/UnderstandCostOfBuyingHomeArticle.svelte";
  import BuyOrRentArticle from "$lib/components/website/BuyOrRentArticle.svelte";
  import BuyPropertyResaleOrDirectArticle from "$lib/components/website/BuyPropertyResaleOrDirectArticle.svelte";
  import ChoosePerfectNeighbourhoodArticle from "$lib/components/website/ChoosePerfectNeighbourhoodArticle.svelte";
  import CloseYourLoanEarlyArticle from "$lib/components/website/CloseYourLoanEarlyArticle.svelte";
  import HomeRenovationArticle from "$lib/components/website/HomeRenovationArticle.svelte";
  import InvestingInPropertyArticle from "$lib/components/website/InvestingInPropertyArticle.svelte";
  import SellingYourPropertyArticle from "$lib/components/website/SellingYourPropertyArticle.svelte";
  import HomeLoanSupport from "$lib/components/website/HomeLoanSupport.svelte";
  import RenovateOrMove from "$lib/components/website/RenovateOrMove.svelte";
  import TurningYourHomeIntoInvestment from "$lib/components/website/TurningYourHomeIntoInvestment.svelte";

  let slug = $derived($page.params.slug);

  // Mapping of slugs to components
  const componentMap = {
    "home-loan-for-business": HomeLoanForBusiness,
    "balance-transfer": BalanceTransfer,
    "top-up-only": HomeTopUp,
    "home-loan-support": HomeLoanSupport,
    "buying-first-home": BuyingFirstHomeHl,
    "saving-for-deposit": SavingForDepositArticle,
    "conditional-pre-approval": ConditionalPreApprovalArticle,
    "understand-cost-of-buying-home": UnderstandCostOfBuyingHomeArticle,
    "buy-or-rent": BuyOrRentArticle,
    "buy-property-resale": BuyPropertyResaleOrDirectArticle,
    "choose-perfect-neighbourhood": ChoosePerfectNeighbourhoodArticle,
    "close-your-loan-early": CloseYourLoanEarlyArticle,
    "home-renovation": HomeRenovationArticle,
    "investing-in-property": InvestingInPropertyArticle,
    "selling-your-property": SellingYourPropertyArticle,
    "buying-next-home": BuyingNextHomeHl,
    "renovate-or-move": RenovateOrMove,
    "home-loan-tools-calculator": HomeLoanToolsandCalculator,
    "turning-your-home-into-investment": TurningYourHomeIntoInvestment,
    "understanding-home-loan-process": HomeLoanProcess,
  };

  let Component = $derived(componentMap[slug] || PageNotFound);
</script>

<Component {slug} />
