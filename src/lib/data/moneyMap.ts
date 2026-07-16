import FdWithSavingGoal from "$lib/components/website/FdWithSavingGoal.svelte";
import FindDeposit from "$lib/components/website/FindDeposit.svelte";
import MoneyLast from "$lib/components/website/MoneyLast.svelte";
import ReverseCalculationsOfMoneyLast from "$lib/components/website/ReverseCalculationsOfMoneyLast.svelte";
import SaveGoalWithTenure from "$lib/components/website/SaveGoalWithTenure.svelte";

export const moneyMap = [
  {
    name: "How Long Will Your Savings Support You?",
    slug: "how-long-will-your-savings-support-you",
    component: MoneyLast,
  },
  {
    name: "How Much to Save by Retirement?",
    slug: "how-much-to-save-by-retirement",
    component: ReverseCalculationsOfMoneyLast,
  },
  {
    name: "How Long Will it Take to Save?",
    slug: "how-long-will-it-take-to-save",
    component: FdWithSavingGoal,
  },
  {
    name: "How Much Can I Save With Regular Contributions?",
    slug: "how-much-can-i-save-with-regular-contributions",
    component: SaveGoalWithTenure,
  },
  {
    name: "Calculate Deposit Amount",
    slug: "find-deposit-amount",
    component: FindDeposit,
  },
];
