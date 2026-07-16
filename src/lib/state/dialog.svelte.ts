class DialogState {
	selectionEpoch = $state(0);
	selectedDate = $state('');
	modalContext = $state<{ applicantIndex: number | null; questionId: string }>({
		applicantIndex: null,
		questionId: ''
	});

	openDatePicker(
		applicantIndex: number | null,
		questionId: string,
		value: string,
		minYear: number | null,
		introduceMonthIndia: number | null,
		maxYear: number | null,
		futureOnly: boolean
	) {
		// Stub implementation for website
	}
}

export const dialogState = new DialogState();
