<script>
  import { page } from "$app/stores";
  import PageNotFound from '$lib/components/layout/PageNotFound.svelte';
  import Budget101 from '$lib/components/sections/Budget101.svelte';
  import BuildingHome from '$lib/components/sections/BuildingHome.svelte';
  import BusinessCantAffordCyberSecurityArticle from '$lib/components/sections/BusinessCantAffordCyberSecurityArticle.svelte';
  import CompanyCultureCyberSecurityArticle from '$lib/components/sections/CompanyCultureCyberSecurityArticle.svelte';
  import DodArticle from '$lib/components/sections/DodArticle.svelte';
  import EquityInHome from '$lib/components/sections/EquityInHome.svelte';
  import GreenLoanHl from '$lib/components/sections/GreenLoanHL.svelte';
  import HomeBTwithTopup from '$lib/components/sections/HomeBTwithTopup.svelte';
  import HomeGuaranteeScheme from '$lib/components/sections/HomeGuaranteeScheme.svelte';
  import HomeLoanOffset from '$lib/components/sections/HomeLoanOffset.svelte';
  import HomeLoanRedraw from '$lib/components/sections/HomeLoanRedraw.svelte';
  import HowCyberSecurityIntegralBusinessCyberSecurityArticle from '$lib/components/sections/HowCyberSecurityIntegralBusinessCyberSecurityArticle.svelte';
  import IncomeTaxNewSlabIncomeTaxArticle from '$lib/components/sections/IncomeTaxNewSlabIncomeTaxArticle.svelte';
  import InvestInProperty from '$lib/components/sections/InvestInProperty.svelte';
  import LowItr from '$lib/components/sections/LowITR.svelte';
  import ManageHomeLoan from '$lib/components/sections/ManageHomeLoan.svelte';
  import MyProperty from '$lib/components/sections/MyProperty.svelte';
  import NewLoan from '$lib/components/sections/NewLoan.svelte';
  import ParentalLeave from '$lib/components/sections/ParentalLeave.svelte';
  import PartnershipOffers from '$lib/components/sections/PartnershipOffers.svelte';
  import PetInsurance from '$lib/components/sections/PetInsurance.svelte';
  import PocketEtf from '$lib/components/sections/PocketETF.svelte';
  import PropertyInsight from '$lib/components/sections/PropertyInsight.svelte';
  import ProtectYourBusinessCyberSecurityArticle from '$lib/components/sections/ProtectYourBusinessCyberSecurityArticle.svelte';
  import RenovatingProperty from '$lib/components/sections/RenovatingProperty.svelte';
  import WhyHaveBudgetArticle from '$lib/components/sections/WhyHaveBudgetArticle.svelte';

  const ComponentMapping = {
    "budgeting-101": Budget101,
    "business-cant-afford-cyber-security-article":
      BusinessCantAffordCyberSecurityArticle,
    "company-culture-cyber-security-article":
      CompanyCultureCyberSecurityArticle,
    "dropline-overdraft": DodArticle,
    "integral-business-cyber-security-article":
      HowCyberSecurityIntegralBusinessCyberSecurityArticle,
    "income-tax": IncomeTaxNewSlabIncomeTaxArticle,
    "protect-your-business": ProtectYourBusinessCyberSecurityArticle,
    "why-have-budget": WhyHaveBudgetArticle,
  };

  let slug = $derived($page.params.slug);
  let Component = $derived(ComponentMapping[slug] || PageNotFound);
</script>

<Component {slug} />
