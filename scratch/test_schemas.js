async function test() {
	try {
		const res = await fetch('http://localhost:5173/home-loan/buying-first-home');
		const html = await res.text();
		
		console.log('--- HTML Fetch Successful ---');
		const ldJsonMatches = html.match(/<script type="application\/ld\+json">.*?<\/script>/gs);
		if (ldJsonMatches) {
			console.log(`Found ${ldJsonMatches.length} application/ld+json script tags:`);
			ldJsonMatches.forEach((tag, idx) => {
				console.log(`\nTag ${idx + 1}:`);
				console.log(tag);
			});
		} else {
			console.log('No application/ld+json script tags found in raw html. (If it is client-rendered only, it will be injected on mount/hydration)');
		}
	} catch (err) {
		console.error('Error fetching page:', err);
	}
}

test();
