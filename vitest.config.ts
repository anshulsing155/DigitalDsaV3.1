import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	test: {
		include: ['src/lib/testing/__tests__/**/*.test.ts'],
		environment: 'jsdom',
		globals: true,
		reporters: ['default', 'json'],
		outputFile: {
			json: 'test-results/vitest/results.json'
		},
		coverage: {
			provider: 'v8',
			reportsDirectory: 'test-results/vitest/coverage'
		}
	},

	server: {
		watch: {
			usePolling: true,
			interval: 300
		}
	},

	optimizeDeps: {
		exclude: ['pino-pretty']
	},

	ssr: {
		noExternal: ['pino']
	}
});
