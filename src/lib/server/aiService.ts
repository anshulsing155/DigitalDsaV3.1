/**
 * AI Service Module
 * ══════════════════════════════════════════════════════════════════
 * Server-side utility for all AI operations in the rule authoring
 * pipeline. Handles parsing, reverse-writing, comparison, and
 * auto-correction of bank policy documents.
 *
 * Uses the strict parsing prompt from RULE-ENGINE-SPECIFICATION.md.
 * Environment variable: AI_API_KEY (OpenAI or Anthropic)
 * ══════════════════════════════════════════════════════════════════
 */

import { env } from '$env/dynamic/private';
import type { DiffReport } from '$lib/types/ruleArtifact.js';
import { externalFetch } from '$lib/server/externalFetch.js';

// ── Types ──────────────────────────────────────────────────────────

export interface ParseResult {
	json_logic: Record<string, unknown>;
	human_readable: string;
	confidence: Record<string, number>;
}

export interface CorrectionResult {
	corrected_json_logic: Record<string, unknown>;
	corrections_made: string[];
}

// ── AI Client ──────────────────────────────────────────────────────

const provider = env.AI_PROVIDER || 'anthropic';

/**
 * Call AI model with a prompt and get a text response.
 * Supports Google Gemini (free), OpenAI, and Anthropic APIs.
 */
async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
	if (!env.AI_API_KEY) {
		throw new Error('AI_API_KEY environment variable is not set');
	}

	if (provider === 'google') {
		const model = env.AI_MODEL || 'gemini-2.5-flash';
		const res = await externalFetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					systemInstruction: { parts: [{ text: systemPrompt }] },
					contents: [{ role: 'user', parts: [{ text: userMessage }] }],
					generationConfig: {
						temperature: 0.1,
						maxOutputTokens: 16000
					}
				})
			},
			{ service: 'google-gemini', timeoutMs: 30_000 }
		);

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Google Gemini API error (${res.status}): ${err}`);
		}

		const data = await res.json();
		return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
	}

	if (provider === 'openai') {
		const res = await externalFetch(
			'https://api.openai.com/v1/chat/completions',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.AI_API_KEY}`
				},
				body: JSON.stringify({
					model: env.AI_MODEL || 'gpt-4o',
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: userMessage }
					],
					temperature: 0.1,
					max_tokens: 16000
				})
			},
			{ service: 'openai', timeoutMs: 30_000 }
		);

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`OpenAI API error (${res.status}): ${err}`);
		}

		const data = await res.json();
		return data.choices?.[0]?.message?.content || '';
	}

	// Default: Anthropic
	const res = await externalFetch(
		'https://api.anthropic.com/v1/messages',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': env.AI_API_KEY!,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: env.AI_MODEL || 'claude-sonnet-4-20250514',
				max_tokens: 16000,
				system: systemPrompt,
				messages: [{ role: 'user', content: userMessage }]
			})
		},
		{ service: 'anthropic', timeoutMs: 30_000 }
	);

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Anthropic API error (${res.status}): ${err}`);
	}

	const data = await res.json();
	return data.content?.[0]?.text || '';
}

// ── Parsing Prompt (from RULE-ENGINE-SPECIFICATION.md Section 3) ───

const PARSING_SYSTEM_PROMPT = `You are a lending policy parser for Indian banks/NBFCs. Your job is to convert bank policy documents into structured JSON-Logic rules.

CRITICAL RULES:
1. Output MUST be valid JSON. No markdown fences, no comments.
2. Every { "var": "..." } path MUST use keys from the LoanApplicationPayload schema.
3. If a section is missing from the source document, set it to null. NEVER assume or infer values.
4. Confidence score per section: 0.0 (not found) to 1.0 (explicitly stated).
5. Include source_excerpt for every rule — the exact text from the policy document.

OUTPUT SCHEMA (respond with exactly this JSON structure):
{
  "rules": {
    "hard_gate": [...],
    "computed": [...],
    "parameter": [...]
  },
  "policy_display": { ... },
  "income_haircuts": { ... },
  "obligation_treatment": { ... },
  "sections_parsed": {
    "ltv": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "foir": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "cibil": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "age": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "tenure": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "income": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "property": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "fees": { "confidence": 0.0-1.0, "source_excerpt": "..." },
    "insurance": { "confidence": 0.0-1.0, "source_excerpt": "..." }
  }
}

PAYLOAD KEY REFERENCE (use these exact paths in var references):
- loanTransaction.LoanName, loanTransaction.LoanType
- loanTransaction.propertyStateName, loanTransaction.propertyCityName
- loanTransaction.propertyType, loanTransaction.purchaseType
- loanTransaction.mortgageYear, loanTransaction.propCost
- loanTransaction.deposit, loanTransaction.RequiredLoanAmount
- loanTransaction.sanctionAmount, loanTransaction.PropertyStage
- loanTransaction.ApplicantIsNRI, loanTransaction.constructionType
- allApplicantDetails[*].age
- allApplicantDetails[*].employmentType
- allApplicantDetails[*].creditScore
- allApplicantDetails[*].monthlyIncome, allApplicantDetails[*].netIncome
- allApplicantDetails[*].grossIncome, allApplicantDetails[*].monthlyOtherIncome
- allApplicantDetails[*].totalEMIs, allApplicantDetails[*].totalLimit
- allApplicantDetails[*].PFdeducted
`;

const REVERSE_WRITE_PROMPT = `You are a policy document writer. Given JSON-Logic rules for a bank lending policy, write a clear human-readable policy document in markdown format.

RULES:
1. Write ONLY what the JSON-Logic rules express. Do not add information.
2. Organize by sections: LTV, FOIR, CIBIL, Age, Tenure, Income, Property, Fees, Insurance.
3. Use tables where appropriate.
4. Mark any null/missing sections as "Not specified in rules".
5. Use Indian financial terminology.`;

const COMPARE_PROMPT = `You are a policy verification specialist. Compare the ORIGINAL bank policy document with the GENERATED policy document (written from JSON-Logic rules).

OUTPUT MUST be valid JSON with this structure:
{
  "overall_match": true/false,
  "sections": [
    {
      "section": "ltv",
      "severity": "match" | "minor" | "major" | "missing",
      "source_excerpt": "exact text from original",
      "generated_excerpt": "text from generated doc",
      "discrepancy": "description of mismatch (if any)"
    }
  ],
  "summary": "one-line summary of comparison result"
}

SEVERITY GUIDE:
- match: Sections align exactly
- minor: Numbers/thresholds slightly different (rounding, format)
- major: Fundamentally different rules or conditions
- missing: Section exists in one document but not the other`;

const CORRECT_PROMPT = `You are a JSON-Logic rule corrector. Given a set of JSON-Logic rules and a diff report showing discrepancies, produce corrected JSON-Logic rules.

RULES:
1. Only fix what the diff report identifies as wrong
2. Keep all correct rules unchanged
3. Use the same payload key paths
4. Output ONLY the corrected rules as valid JSON
5. Include a list of corrections made`;

// ── Public API ─────────────────────────────────────────────────────

/**
 * Parse raw policy documents into JSON-Logic rules.
 * Sends source document content + strict parsing prompt to AI.
 */
export async function parseRawPolicy(
	documentUrls: string[],
	lenderName: string
): Promise<ParseResult> {
	const userMessage = `Parse the following bank policy for "${lenderName}".

Source document URLs (fetch and parse the content):
${documentUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

Extract ALL lending rules and convert to the JSON-Logic format specified in the system prompt.
If you cannot access the URLs, parse based on any text content provided.`;

	const response = await callAI(PARSING_SYSTEM_PROMPT, userMessage);

	// Extract JSON from response (handle potential markdown fences)
	const jsonStr = response
		.replace(/```json\n?/g, '')
		.replace(/```\n?/g, '')
		.trim();

	let parsed: any;
	try {
		parsed = JSON.parse(jsonStr);
	} catch {
		throw new Error('AI returned invalid JSON. Raw response: ' + response.substring(0, 500));
	}

	// Build confidence map from sections_parsed
	const confidence: Record<string, number> = {};
	if (parsed.sections_parsed) {
		for (const [section, data] of Object.entries(parsed.sections_parsed)) {
			confidence[section] = (data as any)?.confidence ?? 0;
		}
	}

	return {
		json_logic: parsed.rules || parsed,
		human_readable: '', // Will be filled by reverseWriteRules
		confidence
	};
}

/**
 * Convert JSON-Logic rules back to a human-readable policy document.
 */
export async function reverseWriteRules(
	jsonLogic: Record<string, unknown>,
	lenderName: string
): Promise<string> {
	const userMessage = `Convert the following JSON-Logic rules for "${lenderName}" into a human-readable policy document:

\`\`\`json
${JSON.stringify(jsonLogic, null, 2)}
\`\`\``;

	return callAI(REVERSE_WRITE_PROMPT, userMessage);
}

/**
 * Compare original source document against reverse-written generated document.
 * Returns a structured diff report.
 */
export async function comparePolicies(
	sourceDocContent: string,
	generatedDoc: string
): Promise<DiffReport> {
	const userMessage = `ORIGINAL DOCUMENT:
---
${sourceDocContent}
---

GENERATED DOCUMENT:
---
${generatedDoc}
---

Compare these two documents section by section.`;

	const response = await callAI(COMPARE_PROMPT, userMessage);

	const jsonStr = response
		.replace(/```json\n?/g, '')
		.replace(/```\n?/g, '')
		.trim();

	let parsed: any;
	try {
		parsed = JSON.parse(jsonStr);
	} catch {
		// Fallback: create a generic diff report
		return {
			overall_match: false,
			sections: [
				{
					section: 'parse_error',
					severity: 'major',
					source_excerpt: 'AI comparison failed to return valid JSON',
					generated_excerpt: response.substring(0, 200),
					discrepancy: 'Could not parse AI comparison response'
				}
			],
			summary: 'AI comparison response could not be parsed'
		};
	}

	return {
		overall_match: Boolean(parsed.overall_match),
		sections: (parsed.sections || []).map((s: any) => ({
			section: s.section || '',
			severity: s.severity || 'missing',
			source_excerpt: s.source_excerpt || '',
			generated_excerpt: s.generated_excerpt || '',
			discrepancy: s.discrepancy
		})),
		summary: parsed.summary || ''
	};
}

/**
 * Auto-correct JSON-Logic rules based on a diff report.
 */
export async function autoCorrectRules(
	jsonLogic: Record<string, unknown>,
	diffReport: DiffReport,
	additionalCorrections?: string
): Promise<CorrectionResult> {
	const userMessage = `CURRENT RULES:
\`\`\`json
${JSON.stringify(jsonLogic, null, 2)}
\`\`\`

DIFF REPORT:
\`\`\`json
${JSON.stringify(diffReport, null, 2)}
\`\`\`

${additionalCorrections ? `ADDITIONAL CORRECTIONS REQUESTED:\n${additionalCorrections}\n\n` : ''}

Fix only what the diff report identifies as wrong. Return a JSON object with:
{
  "corrected_rules": { ... },
  "corrections_made": ["description of each fix"]
}`;

	const response = await callAI(CORRECT_PROMPT, userMessage);

	const jsonStr = response
		.replace(/```json\n?/g, '')
		.replace(/```\n?/g, '')
		.trim();

	let parsed: any;
	try {
		parsed = JSON.parse(jsonStr);
	} catch {
		throw new Error('AI returned invalid correction JSON. Raw: ' + response.substring(0, 500));
	}

	return {
		corrected_json_logic: parsed.corrected_rules || parsed,
		corrections_made: parsed.corrections_made || []
	};
}

/**
 * Run the full parse pipeline: parse -> reverse-write -> compare -> auto-correct loop.
 * Returns all iterations for storage.
 */
export async function runFullParsePipeline(
	documentUrls: string[],
	lenderName: string,
	sourceDocContent: string,
	maxIterations: number = 4
): Promise<{
	json_logic: Record<string, unknown>;
	human_readable: string;
	confidence: Record<string, number>;
	iterations: Array<{
		iteration: number;
		diff_report: DiffReport;
		corrections_made: string[];
		resolved: boolean;
		human_intervention_needed: boolean;
		completed_at: Date;
	}>;
	converged: boolean;
}> {
	// Stage 1: Parse
	const parseResult = await parseRawPolicy(documentUrls, lenderName);
	let currentRules = parseResult.json_logic;

	const iterations: Array<{
		iteration: number;
		diff_report: DiffReport;
		corrections_made: string[];
		resolved: boolean;
		human_intervention_needed: boolean;
		completed_at: Date;
	}> = [];

	let converged = false;

	for (let i = 1; i <= maxIterations; i++) {
		// Stage 2: Reverse-write
		const humanReadable = await reverseWriteRules(currentRules, lenderName);

		// Stage 3: Compare
		const diff = await comparePolicies(sourceDocContent, humanReadable);

		if (diff.overall_match) {
			iterations.push({
				iteration: i,
				diff_report: diff,
				corrections_made: [],
				resolved: true,
				human_intervention_needed: false,
				completed_at: new Date()
			});
			converged = true;

			// Return with the converged human-readable
			return {
				json_logic: currentRules,
				human_readable: humanReadable,
				confidence: parseResult.confidence,
				iterations,
				converged: true
			};
		}

		// Has issues — attempt auto-correction
		if (i < maxIterations) {
			const correction = await autoCorrectRules(currentRules, diff);
			iterations.push({
				iteration: i,
				diff_report: diff,
				corrections_made: correction.corrections_made,
				resolved: false,
				human_intervention_needed: false,
				completed_at: new Date()
			});
			currentRules = correction.corrected_json_logic;
		} else {
			// Final iteration — flag for human intervention
			iterations.push({
				iteration: i,
				diff_report: diff,
				corrections_made: [],
				resolved: false,
				human_intervention_needed: true,
				completed_at: new Date()
			});
		}
	}

	// Generate final human-readable
	const finalHumanReadable = await reverseWriteRules(currentRules, lenderName);

	return {
		json_logic: currentRules,
		human_readable: finalHumanReadable,
		confidence: parseResult.confidence,
		iterations,
		converged
	};
}
