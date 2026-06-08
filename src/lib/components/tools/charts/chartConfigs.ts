/**
 * Reusable Chart.js configuration builders for calculator and planner tools.
 *
 * THEME-AWARE: Every chart builder calls getChartColors() to read live
 * CSS variables at render time. This means all charts automatically
 * adapt to light/dark mode and any future theme changes.
 *
 * The CSS variables are defined in app.css under the "Tool & Chart Tokens" block.
 */

import { getChartColors } from './chartColors.js';
import type { YearlyPaymentSummary } from '$lib/tools/types.js';

// ============================================================================
// EMI CALCULATOR CHARTS
// ============================================================================

/**
 * Builds a pie chart showing the principal vs interest split.
 *
 * Inspired by the reference design:
 * - Full pie (not doughnut) with percentage labels
 * - Green (principal) + Bronze (interest) color scheme
 * - Theme-aware: adapts to dark mode
 */
export function buildPrincipalInterestDoughnut(principalAmount: number, totalInterestPaid: number) {
	const total = principalAmount + totalInterestPaid;
	const principalPct = ((principalAmount / total) * 100).toFixed(1);
	const interestPct = ((totalInterestPaid / total) * 100).toFixed(1);

	// Read live CSS variable colors — adapts to current theme
	const colors = getChartColors();

	return {
		data: {
			labels: ['Principal Loan Amount', 'Total Interest'],
			datasets: [
				{
					data: [Math.round(principalAmount), Math.round(totalInterestPaid)],
					backgroundColor: [colors.principal, colors.interest],
					borderColor: [colors.cardBg, colors.cardBg],
					borderWidth: 3,
					hoverOffset: 10,
					percentages: [principalPct, interestPct]
				}
			]
		},
		options: {
			cutout: '0%',
			plugins: {
				legend: {
					position: 'bottom' as const,
					labels: {
						color: colors.labelColor,
						padding: 20,
						usePointStyle: true,
						pointStyleWidth: 12,
						font: { size: 12, weight: '500' }
					}
				},
				tooltip: {
					backgroundColor: colors.tooltipBg,
					titleFont: { size: 13, weight: '600' },
					bodyFont: { size: 12 },
					padding: 12,
					cornerRadius: 8,
					callbacks: {
						label: (context: any) => {
							const value = context.raw as number;
							const formattedValue = value.toLocaleString('en-IN');
							const percentage = ((value / total) * 100).toFixed(1);
							return ` ${context.label}: ₹${formattedValue} (${percentage}%)`;
						}
					}
				}
			}
		},
		_percentages: { principal: principalPct, interest: interestPct }
	};
}

/**
 * Builds a stacked bar chart showing yearly principal and interest breakdown.
 * Simple version without the balance line overlay.
 */
export function buildYearlyAmortizationBar(yearlySummary: YearlyPaymentSummary[]) {
	const labels = yearlySummary.map((year) => year.yearLabel);
	const principalData = yearlySummary.map((year) => Math.round(year.totalPrincipalPaid));
	const interestData = yearlySummary.map((year) => Math.round(year.totalInterestPaid));

	const colors = getChartColors();

	return {
		data: {
			labels,
			datasets: [
				{
					label: 'Principal',
					data: principalData,
					backgroundColor: colors.principal,
					borderRadius: 3
				},
				{
					label: 'Interest',
					data: interestData,
					backgroundColor: colors.interest,
					borderRadius: 3
				}
			]
		},
		options: {
			scales: {
				x: {
					stacked: true,
					grid: { display: false },
					ticks: { color: colors.labelColor, font: { size: 11 }, maxRotation: 45 }
				},
				y: {
					stacked: true,
					grid: { color: colors.gridColor },
					ticks: { color: colors.labelColor, font: { size: 11 }, callback: formatLakhsTick }
				}
			},
			plugins: {
				legend: {
					position: 'bottom' as const,
					labels: { color: colors.labelColor, padding: 16, usePointStyle: true, font: { size: 13 } }
				},
				tooltip: {
					backgroundColor: colors.tooltipBg,
					callbacks: {
						label: (ctx: any) =>
							` ${ctx.dataset.label}: ₹${(ctx.raw as number).toLocaleString('en-IN')}`
					}
				}
			}
		}
	};
}

/**
 * Builds a COMBINED bar + line chart (dual Y-axes) — the signature EMI visualization.
 *
 * - Stacked bars: Principal (green) + Interest (bronze) on left Y-axis
 * - Line overlay: Outstanding Balance (coral red) on right Y-axis
 * - Dual Y-axes with ₹ Lakhs formatting
 * - Fully theme-aware via CSS variables
 */
export function buildCombinedAmortizationChart(yearlySummary: YearlyPaymentSummary[]) {
	const labels = yearlySummary.map((year) => year.yearLabel);
	const principalData = yearlySummary.map((year) => Math.round(year.totalPrincipalPaid));
	const interestData = yearlySummary.map((year) => Math.round(year.totalInterestPaid));
	const balanceData = yearlySummary.map((year) => Math.round(year.closingBalance));

	const colors = getChartColors();

	return {
		data: {
			labels,
			datasets: [
				{
					type: 'bar' as const,
					label: 'Principal',
					data: principalData,
					backgroundColor: colors.principal,
					borderRadius: 2,
					order: 2,
					yAxisID: 'yPayment'
				},
				{
					type: 'bar' as const,
					label: 'Interest',
					data: interestData,
					backgroundColor: colors.interest,
					borderRadius: 2,
					order: 2,
					yAxisID: 'yPayment'
				},
				{
					type: 'line' as const,
					label: 'Balance',
					data: balanceData,
					borderColor: colors.balance,
					backgroundColor: colors.balanceFill,
					borderWidth: 2.5,
					pointRadius: 4,
					pointBackgroundColor: colors.balance,
					pointBorderColor: colors.cardBg,
					pointBorderWidth: 2,
					pointHoverRadius: 7,
					tension: 0.3,
					fill: false,
					order: 1,
					yAxisID: 'yBalance'
				}
			]
		},
		options: {
			scales: {
				x: {
					stacked: true,
					grid: { display: false },
					ticks: {
						color: colors.labelColor,
						font: { size: 10, weight: '500' },
						maxRotation: 55,
						autoSkip: true,
						maxTicksLimit: 15
					}
				},
				yPayment: {
					type: 'linear' as const,
					position: 'left' as const,
					stacked: true,
					grid: { color: colors.gridColor },
					title: {
						display: true,
						text: 'Payment / Year',
						color: colors.labelColor,
						font: { size: 11, weight: '600' }
					},
					ticks: { color: colors.labelColor, font: { size: 10 }, callback: formatLakhsTick }
				},
				yBalance: {
					type: 'linear' as const,
					position: 'right' as const,
					grid: { drawOnChartArea: false },
					title: {
						display: true,
						text: 'Balance',
						color: colors.interest,
						font: { size: 11, weight: '600' }
					},
					ticks: { color: colors.interest, font: { size: 10 }, callback: formatLakhsTick }
				}
			},
			plugins: {
				legend: {
					position: 'bottom' as const,
					labels: {
						color: colors.labelColor,
						padding: 20,
						usePointStyle: true,
						pointStyleWidth: 12,
						font: { size: 12, weight: '500' }
					}
				},
				tooltip: {
					mode: 'index' as const,
					intersect: false,
					backgroundColor: colors.tooltipBg,
					titleFont: { size: 13, weight: '600' },
					bodyFont: { size: 12 },
					padding: 12,
					cornerRadius: 8,
					callbacks: {
						label: (ctx: any) =>
							` ${ctx.dataset.label}: ₹${(ctx.raw as number).toLocaleString('en-IN')}`
					}
				}
			},
			interaction: { mode: 'index' as const, intersect: false }
		}
	};
}

/** Shared tick formatter: shows ₹ values in Lakhs/Crore shorthand */
function formatLakhsTick(value: number | string): string {
	const num = typeof value === 'string' ? parseFloat(value) : value;
	if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
	if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
	if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
	return `₹${num}`;
}

// ============================================================================
// PLANNER COMPARISON CHARTS
// ============================================================================

/**
 * Builds a line chart comparing loan balance — with vs without part-payments.
 * Two lines: original (muted) and modified (highlighted).
 */
export function buildBalanceComparisonLine(
	originalYearly: YearlyPaymentSummary[],
	modifiedYearly: YearlyPaymentSummary[]
) {
	const allLabels = originalYearly.map((y) => y.yearLabel);
	const originalBalances = originalYearly.map((y) => Math.round(y.closingBalance));
	const modifiedBalances = modifiedYearly.map((y) => Math.round(y.closingBalance));

	const colors = getChartColors();

	return {
		data: {
			labels: allLabels,
			datasets: [
				{
					label: 'Without Part-Payment',
					data: originalBalances,
					borderColor: colors.balance,
					backgroundColor: colors.balanceFill,
					fill: true,
					tension: 0.3,
					pointRadius: 3,
					pointHoverRadius: 6,
					borderWidth: 2,
					borderDash: [6, 3] // Dashed line for "original" = less prominent
				},
				{
					label: 'With Part-Payment',
					data: modifiedBalances,
					borderColor: colors.principal,
					backgroundColor: colors.principalFill,
					fill: true,
					tension: 0.3,
					pointRadius: 3,
					pointHoverRadius: 6,
					borderWidth: 2.5
				}
			]
		},
		options: {
			scales: {
				x: {
					grid: { display: false },
					ticks: { color: colors.labelColor, font: { size: 11 }, maxRotation: 45 }
				},
				y: {
					grid: { color: colors.gridColor },
					ticks: { color: colors.labelColor, font: { size: 11 }, callback: formatLakhsTick }
				}
			},
			plugins: {
				legend: {
					position: 'bottom' as const,
					labels: { color: colors.labelColor, padding: 16, usePointStyle: true, font: { size: 13 } }
				},
				tooltip: {
					mode: 'index' as const,
					intersect: false,
					backgroundColor: colors.tooltipBg,
					callbacks: {
						label: (ctx: any) =>
							` ${ctx.dataset.label}: ₹${(ctx.raw as number).toLocaleString('en-IN')}`
					}
				}
			},
			interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
		}
	};
}

/**
 * Builds a single line chart showing closing balance over time.
 * Used when there are no part-payments to compare against.
 */
export function buildSingleBalanceLine(yearlySummary: YearlyPaymentSummary[]) {
	const labels = yearlySummary.map((y) => y.yearLabel);
	const balances = yearlySummary.map((y) => Math.round(y.closingBalance));

	const colors = getChartColors();

	return {
		data: {
			labels,
			datasets: [
				{
					label: 'Outstanding Balance',
					data: balances,
					borderColor: colors.balance,
					backgroundColor: colors.balanceFill,
					fill: true,
					tension: 0.3,
					pointRadius: 3,
					pointHoverRadius: 6,
					borderWidth: 2
				}
			]
		},
		options: {
			scales: {
				x: {
					grid: { display: false },
					ticks: { color: colors.labelColor, font: { size: 11 }, maxRotation: 45 }
				},
				y: {
					grid: { color: colors.gridColor },
					ticks: { color: colors.labelColor, font: { size: 11 }, callback: formatLakhsTick }
				}
			},
			plugins: {
				legend: {
					position: 'bottom' as const,
					labels: { color: colors.labelColor, padding: 16, usePointStyle: true }
				},
				tooltip: {
					backgroundColor: colors.tooltipBg,
					callbacks: {
						label: (ctx: any) => ` Balance: ₹${(ctx.raw as number).toLocaleString('en-IN')}`
					}
				}
			}
		}
	};
}

// ============================================================================
// BUDGET PLANNER CHARTS
// ============================================================================

/**
 * Builds a doughnut chart showing income allocation across categories.
 * Household (warning), Lifestyle (info), Surplus (success).
 */
export function buildBudgetAllocationDoughnut(
	householdExpenses: number,
	lifestyleExpenses: number,
	surplus: number
) {
	const colors = getChartColors();

	return {
		data: {
			labels: ['Household', 'Lifestyle', 'Surplus'],
			datasets: [
				{
					data: [
						Math.round(householdExpenses),
						Math.round(lifestyleExpenses),
						Math.max(0, Math.round(surplus))
					],
					backgroundColor: [colors.warning, colors.info, colors.principal],
					borderColor: [colors.cardBg, colors.cardBg, colors.cardBg],
					borderWidth: 2,
					hoverOffset: 8
				}
			]
		},
		options: {
			cutout: '60%',
			plugins: {
				legend: {
					position: 'bottom' as const,
					labels: { color: colors.labelColor, padding: 16, usePointStyle: true, font: { size: 13 } }
				},
				tooltip: {
					backgroundColor: colors.tooltipBg,
					callbacks: {
						label: (ctx: any) => ` ${ctx.label}: ₹${(ctx.raw as number).toLocaleString('en-IN')}`
					}
				}
			}
		}
	};
}
