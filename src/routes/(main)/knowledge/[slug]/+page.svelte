<script>
  import { page } from "$app/stores";
  import PageNotFound from "$lib/components/website/PageNotFound.svelte";
  import Budget101 from "$lib/components/website/Budget101.svelte";
  import BuildingHome from "$lib/components/website/BuildingHome.svelte";
  import BusinessCantAffordCyberSecurityArticle from "$lib/components/website/BusinessCantAffordCyberSecurityArticle.svelte";
  import CompanyCultureCyberSecurityArticle from "$lib/components/website/CompanyCultureCyberSecurityArticle.svelte";
  import DodArticle from "$lib/components/website/DodArticle.svelte";
  import EquityInHome from "$lib/components/website/EquityInHome.svelte";
  import GreenLoanHl from "$lib/components/website/GreenLoanHL.svelte";
  import HomeBTwithTopup from "$lib/components/website/HomeBTwithTopup.svelte";
  import HomeGuaranteeScheme from "$lib/components/website/HomeGuaranteeScheme.svelte";
  import HomeLoanOffset from "$lib/components/website/HomeLoanOffset.svelte";
  import HomeLoanRedraw from "$lib/components/website/HomeLoanRedraw.svelte";
  import HowCyberSecurityIntegralBusinessCyberSecurityArticle from "$lib/components/website/HowCyberSecurityIntegralBusinessCyberSecurityArticle.svelte";
  import IncomeTaxNewSlabIncomeTaxArticle from "$lib/components/website/IncomeTaxNewSlabIncomeTaxArticle.svelte";
  import InvestInProperty from "$lib/components/website/InvestInProperty.svelte";
  import LowItr from "$lib/components/website/LowITR.svelte";
  import ManageHomeLoan from "$lib/components/website/ManageHomeLoan.svelte";
  import MyProperty from "$lib/components/website/MyProperty.svelte";
  import NewLoan from "$lib/components/website/NewLoan.svelte";
  import ParentalLeave from "$lib/components/website/ParentalLeave.svelte";
  import PartnershipOffers from "$lib/components/website/PartnershipOffers.svelte";
  import PetInsurance from "$lib/components/website/PetInsurance.svelte";
  import PocketEtf from "$lib/components/website/PocketETF.svelte";
  import PropertyInsight from "$lib/components/website/PropertyInsight.svelte";
  import ProtectYourBusinessCyberSecurityArticle from "$lib/components/website/ProtectYourBusinessCyberSecurityArticle.svelte";
  import RenovatingProperty from "$lib/components/website/RenovatingProperty.svelte";
  import WhyHaveBudgetArticle from "$lib/components/website/WhyHaveBudgetArticle.svelte";

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
