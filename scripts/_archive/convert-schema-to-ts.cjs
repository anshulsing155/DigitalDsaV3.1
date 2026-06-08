/**
 * Schema JSON → TypeScript Converter
 *
 * Converts a monolithic loan schema JSON file into the TypeScript
 * composition pattern (question banks + pages + composer).
 *
 * Usage:
 *   node scripts/convert-schema-to-ts.cjs <json-path> <loan-dir-name> <loan-display-name> <formId>
 *
 * Example:
 *   node scripts/convert-schema-to-ts.cjs src/lib/server/formEngine/schemas/LAP-schema.json lapLoan "Loan Against Property" lapSchemaV2
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a JSON value to TypeScript source code (indented) */
function jsonToTs(value, indent = '\t', depth = 0) {
	const prefix = indent.repeat(depth);
	const nextPrefix = indent.repeat(depth + 1);

	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		// Short arrays of primitives on one line
		if (value.length <= 3 && value.every((v) => typeof v === 'string' || typeof v === 'number')) {
			return '[' + value.map((v) => JSON.stringify(v)).join(', ') + ']';
		}
		const items = value.map((v) => nextPrefix + jsonToTs(v, indent, depth + 1));
		return '[\n' + items.join(',\n') + '\n' + prefix + ']';
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) return '{}';

		const lines = entries.map(([k, v]) => {
			// Keys that need quoting (contain special chars like !, -, ==, etc.)
			const needsQuote = /[^a-zA-Z0-9_$]/.test(k);
			const key = needsQuote ? JSON.stringify(k) : k;
			return nextPrefix + key + ': ' + jsonToTs(v, indent, depth + 1);
		});
		return '{\n' + lines.join(',\n') + '\n' + prefix + '}';
	}

	return String(value);
}

/** Convert page ID to a camelCase getter name: propertyLocation_LAP → getPropertyLocationLapQuestions */
function pageIdToGetterName(pageId) {
	// Remove trailing _loanType suffix and convert to camelCase
	const parts = pageId.split('_');
	const camel = parts
		.map((p, i) => {
			if (i === 0) return p;
			return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
		})
		.join('');
	return 'get' + camel.charAt(0).toUpperCase() + camel.slice(1) + 'Questions';
}

/** Convert page ID to a filename: propertyLocation_LAP → propertyLocation.ts */
function pageIdToFilename(pageId, loanSuffix) {
	// Remove loan suffix from page ID for filename
	let name = pageId;
	if (loanSuffix && name.endsWith('_' + loanSuffix)) {
		name = name.slice(0, -(loanSuffix.length + 1));
	}
	// Remove trailing 'Page' if present
	name = name.replace(/Page$/, '');
	return name + '.ts';
}

/** Group pages that should share a question bank file */
function getQuestionBankGrouping(pages, loanSuffix) {
	// Default: one file per page that has questions
	const groups = [];
	const pagesWithQuestions = pages.filter((p) => p.questions && p.questions.length > 0);

	for (const page of pagesWithQuestions) {
		groups.push({
			filename: pageIdToFilename(page.id, loanSuffix),
			getterName: pageIdToGetterName(page.id),
			pageId: page.id,
			pageTitle: page.title,
			questions: page.questions
		});
	}

	return groups;
}

// ---------------------------------------------------------------------------
// File Generators
// ---------------------------------------------------------------------------

function generateQuestionBankFile(group) {
	let out = '';
	out += '/**\n';
	out += ` * ${group.pageTitle} Questions\n`;
	out += ` * Page: ${group.pageId}\n`;
	out += ' */\n\n';
	out += "import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';\n\n";

	// Export each question as a named constant
	for (const q of group.questions) {
		const constName = q.id;
		// Ensure required 'question' field exists (some derivedSelects omit it)
		if (!q.question && q.question !== '') {
			q.question = '';
		}
		out += `export const ${constName}: RawSchemaQuestion = ${jsonToTs(q, '\t', 0)};\n\n`;
	}

	// Export getter function
	const qNames = group.questions.map((q) => q.id);
	out += `/** Returns all questions for the ${group.pageTitle} page */\n`;
	out += `export function ${group.getterName}(): RawSchemaQuestion[] {\n`;
	out += `\treturn [\n`;
	out += qNames.map((n) => `\t\t${n}`).join(',\n') + '\n';
	out += `\t];\n`;
	out += `}\n`;

	return out;
}

function generatePagesFile(pages, groups, loanSuffix, loanDirName) {
	let out = '';
	out += '/**\n';
	out += ` * ${loanDirName} — Page Assembly\n`;
	out += ' *\n';
	out += ' * Imports questions from question bank modules and assembles them into\n';
	out += ' * RawSchemaPage objects. getAllPages() returns all pages in schema order.\n';
	out += ' */\n\n';
	out += "import type { RawSchemaPage } from '../schema/schemaTypes.js';\n";

	// Import shared custom component pages (aliased to avoid conflicts with local wrappers)
	out += 'import {\n';
	out += '\tbuildApplicantPage,\n';
	out += '\tbuildApplicantProfilePage as sharedApplicantProfilePage,\n';
	out += '\tbuildIncomeProfilesPage as sharedIncomeProfilesPage,\n';
	out += '\tbuildIncomeDetailsPage as sharedIncomeDetailsPage,\n';
	out += '\tbuildCreditScorePage as sharedCreditScorePage,\n';
	out += '\tbuildObligationsPage as sharedObligationsPage\n';
	out += "} from '../schema/customComponentPages.js';\n";

	// Import question getters
	for (const g of groups) {
		out += `import { ${g.getterName} } from './questionBank/${g.filename.replace('.ts', '.js')}';\n`;
	}

	out += '\n';
	out += '// ---------------------------------------------------------------------------\n';
	out += '// Page builder functions\n';
	out += '// ---------------------------------------------------------------------------\n\n';

	// Generate builder for each page
	for (const page of pages) {
		const isCustomComponent = !page.questions || page.questions.length === 0;
		const builderName =
			'build' +
			page.id
				.split('_')
				.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
				.join('') +
			(page.id.endsWith('Page') ? '' : 'Page');

		if (isCustomComponent) {
			// Check which shared builder to use
			const sharedPageIds = {
				applicantProfilePage: 'sharedApplicantProfilePage',
				incomeProfilesPage: 'sharedIncomeProfilesPage',
				incomeDetailsPage: 'sharedIncomeDetailsPage',
				creditScorePage: 'sharedCreditScorePage',
				obligationsPage: 'sharedObligationsPage'
			};

			if (sharedPageIds[page.id]) {
				const sharedFn = sharedPageIds[page.id];
				const showWhenArg = page.showWhen ? jsonToTs(page.showWhen, '\t', 1) : undefined;
				out += `/** ${page.title} — custom component */\n`;
				out += `export function ${builderName}(): RawSchemaPage {\n`;
				if (showWhenArg) {
					out += `\treturn ${sharedFn}(${showWhenArg});\n`;
				} else {
					out += `\treturn ${sharedFn}();\n`;
				}
				out += '}\n\n';
			} else {
				// Generic applicant page (tellUsApplyingPage, applicantPage, etc.)
				const showWhenArg = page.showWhen ? ', ' + jsonToTs(page.showWhen, '\t', 1) : '';
				out += `/** ${page.title} — custom component */\n`;
				out += `export function ${builderName}(): RawSchemaPage {\n`;
				out += `\treturn buildApplicantPage('${page.id}', '${page.title}'${showWhenArg});\n`;
				out += '}\n\n';
			}
		} else {
			// Find the matching question bank group
			const group = groups.find((g) => g.pageId === page.id);
			out += `/** ${page.title} */\n`;
			out += `export function ${builderName}(): RawSchemaPage {\n`;
			out += '\treturn {\n';
			out += `\t\tid: '${page.id}',\n`;
			out += `\t\ttitle: '${page.title.replace(/'/g, "\\'")}',\n`;
			if (page.description) {
				out += `\t\tdescription: ${JSON.stringify(page.description)},\n`;
			}
			out += `\t\tnextButtonVisibility: { mode: ['allRequiredAnswered'] },\n`;
			if (page.showWhen) {
				out += `\t\tshowWhen: ${jsonToTs(page.showWhen, '\t', 2)},\n`;
			}
			if (group) {
				out += `\t\tquestions: ${group.getterName}()\n`;
			} else {
				out += '\t\tquestions: []\n';
			}
			out += '\t};\n';
			out += '}\n\n';
		}
	}

	// getAllPages()
	out += '// ---------------------------------------------------------------------------\n';
	out += '// Full page list\n';
	out += '// ---------------------------------------------------------------------------\n\n';
	out += `/** Returns all ${pages.length} pages in schema order */\n`;
	out += 'export function getAllPages(): RawSchemaPage[] {\n';
	out += '\treturn [\n';
	for (const page of pages) {
		const builderName =
			'build' +
			page.id
				.split('_')
				.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
				.join('') +
			(page.id.endsWith('Page') ? '' : 'Page');
		out += `\t\t${builderName}(),\n`;
	}
	out += '\t];\n';
	out += '}\n';

	return out;
}

function generateComposerFile(loanDirName, loanDisplayName, formId) {
	return `/**
 * ${loanDisplayName} Schema Composer
 *
 * Replaces the monolithic JSON schema with a TypeScript composition layer.
 * Produces the exact same RawSchema output.
 */
import type { RawSchema } from '../schema/schemaTypes.js';
import { getAllPages } from './pages.js';

/** Compose the complete ${loanDisplayName} schema. */
export function compose${loanDirName.charAt(0).toUpperCase() + loanDirName.slice(1)}Schema(): RawSchema {
\treturn {
\t\tformId: '${formId}',
\t\ttitle: '${loanDisplayName} Application',
\t\tpages: getAllPages()
\t};
}
`;
}

function generateTypesFile(loanDirName) {
	return `/**
 * ${loanDirName} — Domain Types & Helpers
 *
 * Re-exports shared schema infrastructure for question bank files.
 */

export type {
\tRulesLogic,
\tRawSchema,
\tRawSchemaQuestion,
\tRawSchemaPage,
\tRawSchemaOption,
\tSwitchArray
} from '../schema/schemaTypes.js';

export { jl } from '../schema/jsonLogicHelpers.js';
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const args = process.argv.slice(2);
	if (args.length < 4) {
		console.error(
			'Usage: node convert-schema-to-ts.cjs <json-path> <loan-dir-name> <loan-display-name> <formId>'
		);
		process.exit(1);
	}

	const [jsonPath, loanDirName, loanDisplayName, formId] = args;
	const projectRoot = path.resolve(__dirname, '..');
	const fullJsonPath = path.resolve(projectRoot, jsonPath);

	// Read and parse JSON
	const jsonContent = fs.readFileSync(fullJsonPath, 'utf8');
	const schema = JSON.parse(jsonContent);

	console.log(`\nConverting: ${loanDisplayName}`);
	console.log(`Pages: ${schema.pages.length}`);
	console.log(`Questions: ${schema.pages.reduce((sum, p) => sum + (p.questions?.length || 0), 0)}`);

	// Detect loan suffix from page IDs (e.g., "LAP" from "propertyLocation_LAP")
	let loanSuffix = '';
	for (const page of schema.pages) {
		const match = page.id.match(/_([A-Z]+)$/);
		if (match) {
			loanSuffix = match[1];
			break;
		}
	}
	console.log(`Detected loan suffix: ${loanSuffix || '(none)'}`);

	// Create output directory
	const outDir = path.join(projectRoot, 'src', 'lib', 'config', loanDirName);
	const qbDir = path.join(outDir, 'questionBank');
	fs.mkdirSync(qbDir, { recursive: true });

	// Group questions into question bank files
	const groups = getQuestionBankGrouping(schema.pages, loanSuffix);

	// Generate question bank files
	for (const group of groups) {
		const content = generateQuestionBankFile(group);
		const filePath = path.join(qbDir, group.filename);
		fs.writeFileSync(filePath, content, 'utf8');
		console.log(`  Created: questionBank/${group.filename} (${group.questions.length} questions)`);
	}

	// Generate pages.ts
	const pagesContent = generatePagesFile(schema.pages, groups, loanSuffix, loanDirName);
	fs.writeFileSync(path.join(outDir, 'pages.ts'), pagesContent, 'utf8');
	console.log(`  Created: pages.ts (${schema.pages.length} pages)`);

	// Generate composer.ts
	const composerContent = generateComposerFile(loanDirName, loanDisplayName, formId);
	fs.writeFileSync(path.join(outDir, 'composer.ts'), composerContent, 'utf8');
	console.log(`  Created: composer.ts`);

	// Generate types.ts
	const typesContent = generateTypesFile(loanDirName);
	fs.writeFileSync(path.join(outDir, 'types.ts'), typesContent, 'utf8');
	console.log(`  Created: types.ts`);

	console.log(`\nDone! Output: src/lib/config/${loanDirName}/`);
	console.log(`\nNext steps:`);
	console.log(`  1. Update schemaLoader.ts to import from the new composer`);
	console.log(`  2. Run 'pnpm run check' to verify types`);
	console.log(`  3. Archive the old JSON schema`);
}

main();
