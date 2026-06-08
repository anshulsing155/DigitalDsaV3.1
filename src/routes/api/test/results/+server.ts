import { json, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
	if (!dev) {
		throw error(404, 'Not available in production');
	}

	const resultsDir = join(process.cwd(), 'test-results');
	const vitestPath = join(resultsDir, 'vitest', 'results.json');

	let vitest: { total: number; passed: number; failed: number } | null = null;
	let lastRun: string | null = null;

	try {
		const vitestStat = await stat(vitestPath);
		lastRun = vitestStat.mtime.toISOString();

		const raw = await readFile(vitestPath, 'utf-8');
		const parsed = JSON.parse(raw);

		vitest = {
			total: parsed.numTotalTests ?? 0,
			passed: parsed.numPassedTests ?? 0,
			failed: parsed.numFailedTests ?? 0
		};
	} catch {
		// No results yet
	}

	return json({ vitest, lastRun });
}
