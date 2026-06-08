/**
 * Rounds a number to the nearest multiple of `round`.
 * @param num - The number to round
 * @param round - The multiple to round to (e.g., 10, 50, 100)
 * @returns Rounded number
 */
export function roundNum(num: number, round: number): number {
	return Math.round(num / round) * round;
}
