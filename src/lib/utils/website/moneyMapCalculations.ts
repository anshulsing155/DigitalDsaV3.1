/**
 * Pure calculation engines for Money Map calculators.
 * Isolated from the Svelte UI to maintain modularity.
 */

// 1. How Long Will Your Savings Support You
export function calculateMoneyLast(params: {
  initialBalance: number;
  monthlyWithdrawal: number;
  annualInterestRate: number | undefined;
  useAER: boolean;
  tenureMonths: number;
  compoundFrequency: string;
  frequencyValue: string;
  percentageValue: number;
  percentageFrequency: string;
  startDate: string;
}) {
  const {
    initialBalance,
    monthlyWithdrawal,
    annualInterestRate,
    useAER,
    tenureMonths,
    compoundFrequency,
    frequencyValue,
    percentageValue,
    percentageFrequency,
    startDate
  } = params;

  let totalWithdrawalAmount = 0;
  let totalInterestAmount = 0;
  let balance = initialBalance;
  let rate = 0;

  if (annualInterestRate !== undefined) {
    if (useAER) {
      rate = (Math.pow(1 + annualInterestRate / 100 / 12, 12) - 1) / 12;
    } else {
      rate = annualInterestRate / 100;
    }
  }

  let start = new Date(startDate);
  const breakdown: any[] = [];
  let intervalDuration = 0;
  let percentageInterval = 0;
  let tempBalance = monthlyWithdrawal;
  let driveWithdrawal = 0;
  let effectiveRate = 0;

  switch (compoundFrequency) {
    case "Monthly":
      effectiveRate = rate / 12;
      break;
    case "Quarterly":
      effectiveRate = Math.pow(1 + rate / 4, 1 / 3) - 1;
      break;
    case "Half-Yearly":
      effectiveRate = Math.pow(1 + rate / 2, 1 / 6) - 1;
      break;
    case "Yearly":
      effectiveRate = Math.pow(1 + rate, 1 / 12) - 1;
      break;
    default:
      effectiveRate = rate / 12;
  }

  for (let i = 0; i < tenureMonths; i++) {
    let openingBalance = balance;
    let interest = openingBalance * effectiveRate;
    totalInterestAmount += interest;
    balance += interest;

    if (intervalDuration === i) {
      intervalDuration += 1;
    } else if (
      (frequencyValue === "% of closing balance, each year" ||
        frequencyValue === "% of interest earned, yearly") &&
      intervalDuration === i
    ) {
      intervalDuration += 12;
    }

    if (percentageFrequency === "% every year" && percentageInterval === i) {
      percentageInterval = i + 12;
    } else if (
      percentageFrequency === "% every two years" &&
      percentageInterval === i
    ) {
      percentageInterval = i + 24;
    }
    totalWithdrawalAmount += tempBalance;

    breakdown.push({
      month: new Date(start),
      openingBalance,
      interestEarned: interest,
      withdrawal: driveWithdrawal,
      closingBalance: balance,
    });

    start.setMonth(start.getMonth() + 1);

    if (balance <= 1) {
      balance = 0;
      break;
    }
  }

  return {
    totalWithdrawalAmount,
    totalInterestAmount,
    finalBalance: Math.round(balance),
    breakdown
  };
}

// 2. How Much to Save by Retirement
export function calculateReverseMoneyLast(params: {
  retirementAge: number;
  ageValue: number;
  monthlyWithdrawal: number;
  annualInterestRate: number;
  tenureMonths: number;
  compoundFrequency: string;
  frequencyValue: string;
  percentageValue: number;
  percentageFrequency: string;
  closingBalance: number;
}) {
  const {
    retirementAge,
    ageValue,
    monthlyWithdrawal,
    annualInterestRate,
    tenureMonths,
    compoundFrequency,
    frequencyValue,
    percentageValue,
    percentageFrequency,
    closingBalance
  } = params;

  let totalWithdrawalAmount = 0;
  let totalInterestAmount = 0;
  let rate = annualInterestRate / 100;
  let effectiveRate = 0;

  switch (compoundFrequency) {
    case "Monthly":
      effectiveRate = 12;
      break;
    case "Quarterly":
      effectiveRate = 4;
      break;
    case "Half-Yearly":
      effectiveRate = 2;
      break;
    case "Yearly":
      effectiveRate = 1;
      break;
    default:
      effectiveRate = 0;
  }

  let withdrawalFrequencyValue = 0;
  switch (frequencyValue) {
    case "Monthly":
      withdrawalFrequencyValue = 1;
      break;
    case "Quarterly":
      withdrawalFrequencyValue = 3;
      break;
    case "Half-yearly":
      withdrawalFrequencyValue = 6;
      break;
    case "Yearly":
      withdrawalFrequencyValue = 12;
      break;
    default:
      withdrawalFrequencyValue = 0;
  }

  const table: any[] = [];
  let requiredAmount = closingBalance;
  let withdraw = monthlyWithdrawal;
  let actualWithdraw = 0;

  for (let i = tenureMonths - 1; i >= 0; i--) {
    let monthlyRate = Math.pow(1 + rate / effectiveRate, effectiveRate / 12) - 1;
    let yearsPassed = 0;

    if (percentageFrequency === "Every year") {
      yearsPassed = Math.floor(i / 12);
      if (i % withdrawalFrequencyValue === 0 || i === tenureMonths - 1) {
        withdraw = monthlyWithdrawal * Math.pow(1 + percentageValue / 100, yearsPassed);
        actualWithdraw = withdraw;
      } else {
        withdraw = 0;
        actualWithdraw = 0;
      }
    } else if (percentageFrequency === "Every two years") {
      yearsPassed = Math.floor(i / 24);
      withdraw = monthlyWithdrawal * Math.pow(1 + percentageValue / 100, yearsPassed);
      actualWithdraw = withdraw;
    }

    let interestEarned = requiredAmount * monthlyRate;
    totalInterestAmount += interestEarned;
    totalWithdrawalAmount += actualWithdraw;
    requiredAmount = (requiredAmount + actualWithdraw) / (1 + monthlyRate);

    table.unshift({
      month: i + 1,
      withdrawal: actualWithdraw.toFixed(2),
      requiredSavings: requiredAmount.toFixed(2),
    });
  }

  const requiredSavings = Number(requiredAmount.toFixed(2));
  const remainingAge = retirementAge - ageValue;

  let r = annualInterestRate / 100;
  let n = 12;
  let numerator = Math.round(requiredSavings * (r / n));
  let denominator = Math.pow(1 + r / n, n * remainingAge) - 1;
  denominator = parseFloat(denominator.toFixed(2));

  let monthlyDeposit = 0;
  let totalDeposit = 0;
  let totalInterestEarned = 0;

  if (denominator > 0) {
    monthlyDeposit = numerator / denominator;
    totalDeposit = monthlyDeposit * n * remainingAge;
    totalInterestEarned = requiredSavings - totalDeposit;
  }

  return {
    requiredSavings,
    monthlyData: table,
    remainingAge,
    monthlyDeposit,
    totalDeposit,
    totalInterestEarned
  };
}

// 3. How Long Will It Take to Save (FD Savings Goal)
export function calculateSavingsGoalFd(params: {
  savingGoal: number;
  rate: number;
  years: number;
  frequency: string;
  specifySelection: string;
  totalInvestmentAmount: number;
}) {
  const {
    savingGoal,
    rate,
    years,
    frequency,
    specifySelection,
    totalInvestmentAmount
  } = params;

  let requiredInvestment = 0;
  let totalInterest = 0;
  let tenureMonths = 0;

  const getCompoundingPeriods = () => {
    return frequency === "Monthly"
      ? 12
      : frequency === "Quarterly"
        ? 4
        : frequency === "Half-Yearly"
          ? 2
          : 1;
  };

  if (specifySelection === "Tenure") {
    const compoundingPeriods = getCompoundingPeriods();
    const factor = Math.pow(
      1 + rate / 100 / compoundingPeriods,
      compoundingPeriods * years
    );
    requiredInvestment = savingGoal / factor;
    totalInterest = savingGoal - requiredInvestment;
  } else {
    const n = getCompoundingPeriods();
    const ratePerPeriod = rate / 100 / n;
    const tenureYears =
      Math.log(savingGoal / totalInvestmentAmount) /
      (n * Math.log(1 + ratePerPeriod));
    tenureMonths = Math.round(tenureYears * 12);
    totalInterest = Math.round(savingGoal - totalInvestmentAmount);
    if (totalInterest < 0) {
      totalInterest = 0;
    }
  }

  return {
    requiredInvestment,
    totalInterest,
    tenureMonths
  };
}

// 4. How Much Can I Save (SIP Calculator)
export function calculateSavingsGoalTenure(params: {
  savingsGoal: number;
  annualInterestRate: number;
  monthlyContribution: number;
  initialSavings: number;
  tenure: number;
  investmentFrequency: string;
  compoundFrequency: string;
}) {
  const {
    annualInterestRate,
    monthlyContribution,
    tenure,
    investmentFrequency,
    compoundFrequency
  } = params;

  const freqMap: Record<string, number> = {
    Monthly: 12,
    Quarterly: 4,
    "Half-Yearly": 2,
    Yearly: 1,
  };

  const depositsPerYear = freqMap[investmentFrequency] || 12;
  const compoundPeriodsPerYear = freqMap[compoundFrequency] || 4;
  const totalDeposits = depositsPerYear * tenure;
  const r = (annualInterestRate || 0) / 100;

  let sum = 0;
  for (let i = 0; i < totalDeposits; i++) {
    const depositTime = i / depositsPerYear;
    const periodsToGrow = compoundPeriodsPerYear * (tenure - depositTime);
    sum += monthlyContribution * Math.pow(1 + r / compoundPeriodsPerYear, periodsToGrow);
  }

  const maturityAmount = sum;
  const totalInvestment = monthlyContribution * totalDeposits;
  const totalReturns = maturityAmount - totalInvestment;

  return {
    maturityAmount,
    totalInvestment,
    totalReturns
  };
}

// 5. How to Reach Desired Corpus
export function calculateMonthlyDepositGoal(params: {
  goalAmount: number;
  annualRate: number;
  compoundingFrequency: string;
  tenure: number;
}) {
  const { goalAmount, annualRate, compoundingFrequency, tenure } = params;

  let monthlyInterest = annualRate / 100;
  let frequency = Number(compoundingFrequency);
  let t = tenure;

  let numerator = Math.round(goalAmount * (monthlyInterest / frequency));
  let denominator = Math.pow(1 + monthlyInterest / frequency, frequency * t) - 1;
  denominator = parseFloat(denominator.toFixed(2));

  let monthlyDeposit = 0;
  let totalDeposit = 0;
  let totalInterestEarned = 0;

  if (denominator > 0) {
    monthlyDeposit = numerator / denominator;
    monthlyDeposit = (monthlyDeposit * frequency) / 12;
    totalDeposit = monthlyDeposit * (tenure * 12);
    totalInterestEarned = goalAmount - totalDeposit;
  }

  return {
    monthlyDeposit,
    totalDeposit,
    totalInterestEarned
  };
}
