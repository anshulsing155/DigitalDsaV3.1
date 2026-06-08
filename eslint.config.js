import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			// Bare console.* is BLOCKED — use $lib/utils/clientLogger (client) or
			// $lib/server/logger (server) instead. The Pino-style API matches across
			// both modules so isomorphic code can swap imports without changing call
			// sites. console.warn / console.error are allowed for genuine
			// edge cases where a logger isn't available (e.g. early bootstrap).
			// See Phase 5 of docs/specs/AUDIT-CLEANUP-PLAN-2026-04-28.md.
			'no-console': ['error', { allow: ['warn', 'error'] }],
			// Allow _ and __ prefixed variables as intentional "unused" markers.
			// ignoreRestSiblings allows { key: _, ...rest } destructure patterns.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					varsIgnorePattern: '^_',
					argsIgnorePattern: '^_',
					ignoreRestSiblings: true,
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	// ── no-console exemptions ────────────────────────────────────────────────
	// Files where bare console.* is intentional and required:
	//   - logger modules themselves (they ARE the wrapper around console)
	//   - seed scripts and test runners (Node CLI output)
	//   - archived code (preserved per project policy, not maintained)
	{
		files: [
			'src/lib/server/logger.ts',
			'src/lib/utils/clientLogger.ts',
			'src/lib/database/**',
			'src/lib/testing/**',
			'src/_archived/**',
			'src/lib/**/_archive/**'
		],
		rules: {
			'no-console': 'off'
		}
	}
);
