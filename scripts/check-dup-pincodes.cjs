const all = require('../src/lib/config/pincode_IN_all.json');
const sel = require('../src/lib/config/pincode_IN_Selected.json');

function checkDups(data, label) {
	const results = [];
	for (const [state, cities] of Object.entries(data)) {
		for (const [city, areas] of Object.entries(cities)) {
			const seen = new Map();
			for (const [area, pin] of Object.entries(areas)) {
				const key = area.toLowerCase().trim();
				if (seen.has(key)) {
					const prev = seen.get(key);
					results.push({
						state,
						city,
						area1: prev.area,
						pin1: prev.pin,
						area2: area,
						pin2: pin,
						samePincode: prev.pin === pin
					});
				}
				seen.set(key, { area, pin });
			}
		}
	}
	console.log(label + ': ' + results.length + ' case-duplicate areas');
	const same = results.filter((r) => r.samePincode).length;
	const diff = results.filter((r) => r.samePincode === false).length;
	console.log('  Same pincode: ' + same + ', Different pincode: ' + diff);
	if (diff > 0) {
		console.log('  DIFFERENT pincode pairs:');
		results
			.filter((r) => r.samePincode === false)
			.slice(0, 30)
			.forEach((r) => {
				console.log(
					'    ' +
						r.state +
						' > ' +
						r.city +
						': "' +
						r.area1 +
						'"=' +
						r.pin1 +
						' vs "' +
						r.area2 +
						'"=' +
						r.pin2
				);
			});
	}
	if (same > 0) {
		console.log('  SAME pincode pairs (first 10):');
		results
			.filter((r) => r.samePincode)
			.slice(0, 10)
			.forEach((r) => {
				console.log(
					'    ' + r.state + ' > ' + r.city + ': "' + r.area1 + '" vs "' + r.area2 + '" = ' + r.pin1
				);
			});
	}
}

checkDups(sel, 'Selected');
console.log('');
checkDups(all, 'All');
