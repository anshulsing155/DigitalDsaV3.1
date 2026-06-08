import { buildLoanTransaction, buildApplicantDetails } from '$lib/utils/loanPayload';

// export  function limitChecker(question, answers, currentAnswers) {

// 	if (question.limit === 'emiLimit') {
// 		const principal = answers['principalOutstanding'];
// 		const interest = answers['existingInterestRate'];
// 		const tenure = answers['remainingTenure'];

// 		if (principal && interest && tenure) {
// 			const P = Number(principal);
// 			const r = Number(interest) / 12 / 100;
// 			const n = Number(tenure);

// 			if (P > 0 && r > 0 && n > 0) {
// 				const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
// 				return emi;
// 			}
// 		}
// 	} else if (question.limit === 'sanctionLimit') {

// 		return (async () => {
// 			const result = await eligibilityCalculator(currentAnswers);
// 			if (!result) return null;
// 			return result;
// 		})();
// 	}

// 	return null;
// }

export async function limitChecker(
	question: Record<string, unknown>,
	answers: Record<string, unknown>,
	currentAnswers: Record<string, unknown>
): Promise<number | null> {
	if (question.limit === 'emiLimit') {
		const principal = answers['principalOutstanding'];
		const interest = answers['existingInterestRate'];
		const tenure = answers['remainingTenure'];

		if (principal && interest && tenure) {
			const P = Number(principal);
			const r = Number(interest) / 12 / 100;
			const n = Number(tenure);

			if (P > 0 && r > 0 && n > 0) {
				return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
			}
		}
		return null;
	}

	if (question.limit === 'sanctionLimit') {
		return await eligibilityCalculator(currentAnswers);
	}

	return null;
}

async function eligibilityCalculator(
	currentAnswers: Record<string, unknown>
): Promise<number | null> {
	let submitError: string | null = null;

	try {
		submitError = null;

		let formattedPayload = {
			loanTransaction: buildLoanTransaction(currentAnswers),
			allApplicantDetails: buildApplicantDetails(currentAnswers?.allApplicantDetails)
		};

		const res = await fetch('https://bank-loan-management.vercel.app/api/loan-offers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(formattedPayload)
		});

		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`API Error (${res.status}): ${errorText}`);
		}

		const data = await res.json();

		let minimum = data.map((item: Record<string, unknown>) => {
			const eligibilityData = item.checkEligibilityData as Record<string, number>;
			return Math.min(eligibilityData.loanAmount_ltv, eligibilityData.maxEligibleLoanAmount);
		});

		return Math.max(...minimum) - (currentAnswers.principalOutstanding as number);
	} catch (error) {
		submitError =
			error instanceof Error ? error.message : 'Failed to submit application. Please try again.';
		return null;
	}
}
