/**
 * Updates commonPage.json (both copies) to:
 * 1. Split DOD into OD + DOD in q2_unSecureLoanType
 * 2. Add facility-specific labels to q4_loanType
 */
const fs = require('fs');

const files = [
	'src/lib/config/commonPage.json',
	'src/lib/server/formEngine/schemas/commonPage.json'
];

for (const file of files) {
	const data = JSON.parse(fs.readFileSync(file, 'utf8'));
	const questions = data.pages[0].questions;

	// ── 1. Update q2_unSecureLoanType: Term Loan + OD + DOD ──
	const q2 = questions.find((q) => q.id === 'q2_unSecureLoanType');
	if (q2) {
		q2.description =
			"<div class='info-title'><span class='info-icon blue'>\u{1F4A1}</span> Loan Structure</div><div class='info-box highlight'>Choose the <span class='bold'>facility type</span> that fits your cash flow needs.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'>\u{1F4CA} Term Loan</span><span class='diagram-value'>Fixed EMIs, lump sum</span></div><div class='diagram-row'><span class='diagram-label'>\u{1F504} OD</span><span class='diagram-value'>Revolving credit line</span></div><div class='diagram-row'><span class='diagram-label'>\u{1F4C9} DOD</span><span class='diagram-value'>OD with reducing limit</span></div></div><div class='info-box tip'><span class='bold'>Term Loan:</span> Full amount disbursed, fixed monthly EMIs.</div><div class='info-box note'><span class='bold'>OD/DOD:</span> Draw as needed, interest only on utilized amount.</div>";
		q2.options = [
			{
				label: 'Term Loan',
				value: 'Term Loan',
				icon: 'Banknote',
				labelDescription: 'Full amount disbursed upfront \u2014 repaid in fixed monthly EMIs'
			},
			{
				label: 'Overdraft (OD)',
				value: 'Overdraft (OD)',
				icon: 'RefreshCw',
				labelDescription:
					'Revolving credit line \u2014 draw as needed, interest on utilized amount only'
			},
			{
				label: 'Drop-line Overdraft (DOD)',
				value: 'Drop-line OverDraft (DOD)',
				icon: 'CreditCard',
				labelDescription:
					'OD with auto-reducing limit \u2014 combines flexibility with forced repayment'
			}
		];
		console.log(file + ': Updated q2 with Term Loan + OD + DOD');
	}

	// ── 2. Update q4_loanType: facility-specific labels ──
	const q4 = questions.find((q) => q.id === 'q4_loanType');
	if (q4) {
		const newOptions = [];

		for (const opt of q4.options) {
			// Keep all secured-only options as-is
			if (
				[
					'Balance Transfer With Top-up',
					'Balance Transfer Only',
					'Top-up Only',
					'Plot Loan Only',
					'Plot & Construction Loan',
					'Plot & Equity Loan',
					'Construction Loan Only'
				].includes(opt.value)
			) {
				newOptions.push(opt);
				continue;
			}

			// For 'New Loan' — keep secured clauses, add facility-specific unsecured
			if (opt.value === 'New Loan') {
				// Extract only the secured showWhen clauses (Home + LAP)
				const securedClauses = opt.showWhen.or.filter((clause) => {
					if (clause.in && clause.in[0] && clause.in[0].var === 'unSecureLoanType') return false;
					return true;
				});

				// Secured 'New Loan' (Home + LAP)
				newOptions.push({
					label: opt.label,
					value: opt.value,
					showWhen: { or: securedClauses },
					icon: opt.icon,
					labelDescription: opt.labelDescription
				});

				// Term Loan — New Loan
				newOptions.push({
					label: 'New Loan',
					value: 'New Loan',
					showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Term Loan'] },
					icon: 'CircleDollarSign',
					labelDescription: 'Fresh term loan \u2014 no existing loan being transferred'
				});
				// OD — New OD
				newOptions.push({
					label: 'New OD Facility',
					value: 'New Loan',
					showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Overdraft (OD)'] },
					icon: 'CircleDollarSign',
					labelDescription: 'Fresh overdraft facility \u2014 new credit line'
				});
				// DOD — New DOD
				newOptions.push({
					label: 'New DOD Facility',
					value: 'New Loan',
					showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Drop-line OverDraft (DOD)'] },
					icon: 'CircleDollarSign',
					labelDescription: 'Fresh drop-line OD \u2014 new facility with reducing limit'
				});
				continue;
			}

			// Skip old DC and DC+Extra — we add facility-specific ones below
			if (
				opt.value === 'Debt Consolidation' ||
				opt.value === 'Debt Consolidation with Extra Funds'
			) {
				continue;
			}
		}

		// ── Facility-specific DC/Takeover options ──

		// Term Loan DC
		newOptions.push({
			label: 'Debt Consolidation',
			value: 'Debt Consolidation',
			showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Term Loan'] },
			icon: 'ArrowLeftRight',
			labelDescription: 'Transfer existing loan(s) to a new lender for better rates'
		});
		newOptions.push({
			label: 'DC with Extra Funds',
			value: 'Debt Consolidation with Extra Funds',
			showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Term Loan'] },
			icon: 'HandCoins',
			labelDescription: 'Transfer existing loan(s) plus borrow additional funds'
		});

		// OD Takeover
		newOptions.push({
			label: 'OD Takeover',
			value: 'Debt Consolidation',
			showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Overdraft (OD)'] },
			icon: 'ArrowLeftRight',
			labelDescription: 'Transfer existing OD facility to a new lender'
		});
		newOptions.push({
			label: 'OD Takeover + Enhancement',
			value: 'Debt Consolidation with Extra Funds',
			showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Overdraft (OD)'] },
			icon: 'HandCoins',
			labelDescription: 'Transfer existing OD plus increase the credit limit'
		});

		// DOD Takeover
		newOptions.push({
			label: 'DOD Takeover',
			value: 'Debt Consolidation',
			showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Drop-line OverDraft (DOD)'] },
			icon: 'ArrowLeftRight',
			labelDescription: 'Transfer existing DOD facility to a new lender'
		});
		newOptions.push({
			label: 'DOD Takeover + Enhancement',
			value: 'Debt Consolidation with Extra Funds',
			showWhen: { '==': [{ var: 'unSecureLoanType' }, 'Drop-line OverDraft (DOD)'] },
			icon: 'HandCoins',
			labelDescription: 'Transfer existing DOD plus increase the facility limit'
		});

		q4.options = newOptions;

		// Update q4 question-level showWhen: replace old unsecured clause
		for (let i = 0; i < q4.showWhen.or.length; i++) {
			const clause = q4.showWhen.or[i];
			if (clause.in && clause.in[0] && clause.in[0].var === 'unSecureLoanType') {
				q4.showWhen.or[i] = { '!=': [{ var: 'unSecureLoanType' }, ''] };
				break;
			}
		}

		console.log(
			file + ': Updated q4 with facility-specific labels (' + newOptions.length + ' options)'
		);
	}

	fs.writeFileSync(file, JSON.stringify(data, null, '\t') + '\n');
	console.log(file + ': Written successfully\n');
}
