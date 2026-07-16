import { writable, type Writable } from 'svelte/store';

export const budgetData: Writable<any> = writable({
	incomeDataArray: [],
	lifeStyleDataArray: [],
	homeExpensesData: []
});
