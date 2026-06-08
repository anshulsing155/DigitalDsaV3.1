// export function formatNumber(num: number): string {
// 	return new Intl.NumberFormat('en-IN').format(num);
// }

export function formatNumber(num: number | string | null | undefined): string {
	if (num === null || num === undefined || num === '') return '';
	return new Intl.NumberFormat('en-IN').format(Number(num));
}
