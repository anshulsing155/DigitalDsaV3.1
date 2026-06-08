export function getCurrentFYStartYear(): number {
	const today = new Date();
	const month = today.getMonth() + 1;
	const currentFYStartYear = month >= 4 ? today.getFullYear() : today.getFullYear() - 1;
	return currentFYStartYear;
}

// const today = new Date();
// 	const month = today.getMonth() + 1;
// 	const currentFYStartYear = today.getFullYear();
