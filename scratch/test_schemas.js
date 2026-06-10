async function testPage(url) {
	try {
		console.log(`\n=============================================`);
		console.log(`Testing URL: ${url}`);
		console.log(`=============================================`);
		const res = await fetch(url);
		const html = await res.text();
		
		const ldJsonMatches = html.match(/<script type="application\/ld\+json">.*?<\/script>/gs);
		if (ldJsonMatches) {
			console.log(`Found ${ldJsonMatches.length} application/ld+json script tags:`);
			ldJsonMatches.forEach((tag, idx) => {
				console.log(`\nTag ${idx + 1}:`);
				console.log(tag);
			});
		} else {
			console.log('No application/ld+json script tags found.');
		}
	} catch (err) {
		console.error(`Error fetching page ${url}:`, err);
	}
}

async function testAll() {
	await testPage('http://localhost:5173/home-loan/buying-first-home');
	await testPage('http://localhost:5173/home-loan/buying-next-home');
	await testPage('http://localhost:5173/home-loan/renovate-or-move');
	await testPage('http://localhost:5173/home-loan/home-loan-for-business');
}

testAll();
