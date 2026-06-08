const data = JSON.parse(
	require('fs').readFileSync('src/lib/config/homeLoanSchemaV2.json', 'utf-8')
);

console.log('=== Home Loan Schema — showWhen Coverage ===\n');
for (const page of data.pages) {
	const qCount = page.questions.length;
	const withSW = page.questions.filter((q) => q.showWhen).length;
	const withoutSW = page.questions.filter((q) => !q.showWhen).length;
	const pageSW = page.showWhen ? ' [PAGE-LEVEL showWhen]' : '';
	console.log(
		`${page.id} | total:${qCount} | withShowWhen:${withSW} | alwaysVisible:${withoutSW}${pageSW}`
	);

	// List questions without showWhen on pages with 3+ total questions
	if (withoutSW > 2 && qCount > 3) {
		for (const q of page.questions) {
			if (!q.showWhen) {
				console.log(`    ALWAYS: ${q.id} → ${q.bindsTo_template}`);
			}
		}
	}
}
