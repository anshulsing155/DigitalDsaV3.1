<script>
  import { page } from "$app/stores";
  import PageNotFound from '$lib/components/layout/PageNotFound.svelte';
  import BalanceTransfer from '$lib/components/sections/BalanceTransfer.svelte';
  import HomeTopUp from '$lib/components/sections/HomeTopUp.svelte';
  import HomeLoanForBusiness from '$lib/components/sections/HomeLoanForBusiness.svelte';
  import BuyingFirstHomeHl from '$lib/components/sections/BuyingFirstHomeHL.svelte';
  import BuyingNextHomeHl from '$lib/components/sections/BuyingNextHomeHL.svelte';
  import HomeLoanToolsandCalculator from '$lib/components/sections/HomeLoanToolsandCalculator.svelte';
  import HomeLoanProcess from '$lib/components/sections/HomeLoanProcess.svelte';
  import SavingForDepositArticle from '$lib/components/sections/SavingForDepositArticle.svelte';
  import ConditionalPreApprovalArticle from '$lib/components/sections/ConditionalPreApprovalArticle.svelte';
  import UnderstandCostOfBuyingHomeArticle from '$lib/components/sections/UnderstandCostOfBuyingHomeArticle.svelte';
  import BuyOrRentArticle from '$lib/components/sections/BuyOrRentArticle.svelte';
  import BuyPropertyResaleOrDirectArticle from '$lib/components/sections/BuyPropertyResaleOrDirectArticle.svelte';
  import ChoosePerfectNeighbourhoodArticle from '$lib/components/sections/ChoosePerfectNeighbourhoodArticle.svelte';
  import CloseYourLoanEarlyArticle from '$lib/components/sections/CloseYourLoanEarlyArticle.svelte';
  import HomeRenovationArticle from '$lib/components/sections/HomeRenovationArticle.svelte';
  import InvestingInPropertyArticle from '$lib/components/sections/InvestingInPropertyArticle.svelte';
  import SellingYourPropertyArticle from '$lib/components/sections/SellingYourPropertyArticle.svelte';
  import HomeLoanSupport from '$lib/components/sections/HomeLoanSupport.svelte';
  import RenovateOrMove from '$lib/components/sections/RenovateOrMove.svelte';
  import TurningYourHomeIntoInvestment from '$lib/components/sections/TurningYourHomeIntoInvestment.svelte';

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
