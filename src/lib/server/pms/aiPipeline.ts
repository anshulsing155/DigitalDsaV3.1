/**
 * PMS AI Pipeline — 6-pass OpenAI gpt-4o-mini implementation
 * ══════════════════════════════════════════════════════════════════
 * Converts raw bank policy text into structured JSON-Logic rules.
 *
 * Trigger sequence (per plan §2.5):
 *   RM uploads document → Pass 1 + Pass 2 (sequential, one request)
 *   RM clicks "Proceed to Encoding" → Pass 3
 *   RM completes Step 2 (all clauses reviewed) → Pass 4 → Pass 5 (if needed) → Pass 4 re-verify
 *   RM reaches Step 4 (Reconciliation) → Pass 6 (A: instant; B: OpenAI)
 *
 * Rate limiting applied at the API route level (not here).
 * Each pass has a 30-second timeout — on timeout the caller saves errorState and returns to client.
 * ══════════════════════════════════════════════════════════════════
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { TERM_DICTIONARY } from '$lib/config/pms/termDictionary.js';
import type {
	Pass1Result,
	Pass2Clause,
	Pass3Encoding,
	Pass4Result,
	Pass6Result,
	ClauseTag,
	ConditionScope,
	ConditionalOverride
} from '$lib/config/pms/policyTypes.js';

// ── OpenAI client (lazy init so dev builds without key don't crash) ──────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
	if (!_client) {
		const apiKey = env.OPENAI_API_KEY;
		if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
		_client = new OpenAI({ apiKey });
	}
	return _client;
}

const MODEL = 'gpt-4o-mini';
const PASS_TIMEOUT_MS = 30_000;

// ── Shared prompt helpers ─────────────────────────────────────────────────────

function buildTermDictionaryContext(): string {
	const entries = Object.values(TERM_DICTIONARY)
		.filter((e) => e.section !== 'foirRules' && e.section !== 'ltvRules' && e.section !== 'roiRules' && e.section !== 'eligibilityGates' && e.section !== 'multipleAppIncomeRules')
		.map((e) => `  "${e.aliases[0]}" → "${e.canonicalVar}" (also: ${e.aliases.slice(1, 4).join(', ')})${e.notes ? '\n    Note: ' + e.notes : ''}`)
		.join('\n');

	const sections = Object.values(TERM_DICTIONARY)
		.filter((e) => ['foirRules', 'ltvRules', 'roiRules', 'eligibilityGates', 'multipleAppIncomeRules'].includes(e.section))
		.map((e) => `  Section "${e.canonicalVar}": ${e.aliases.slice(0, 5).join(', ')}`)
		.join('\n');

	return `## Term Dictionary (bank policy → JSON-Logic variables)\n\n### Variable mappings:\n${entries}\n\n### Section identifiers (NOT {"var":} targets — encode rules INSIDE these sections):\n${sections}`;
}

const SCHEMA_IRON_LAW = `## IRON LAW — STRICT SCHEMA ENFORCEMENT
Only use these JSON-Logic variable names. Never invent new ones.
Variables: propCost, dealValue, propertyValueAsPerATS, purchaseType, constructionType,
  creditScore, minCibil, isDefaulter, netIncome, grossIncome, age, maxAge,
  EmploymentType, ApplicantIsNRI, relationshipType, onProperty, onEMI, loanAmount, loanTenure.
Sections (encode rules INSIDE, never use as {"var":}): eligibilityGates, foirRules, ltvRules,
  roiRules, multipleAppIncomeRules.
Generic "property value" → {"or": [{"var": "propCost"}, {"var": "dealValue"}]}
String values for Yes/No fields, not booleans.
EmploymentType exact values: "Employed(Government)", "Employed(PSU)", "Employed(Private)",
  "Self Employed Professional", "Self Employed Non Professional".`;

// ── Timeout wrapper ───────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number, passName: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${passName} timed out after ${ms}ms`)), ms);
	});
	try {
		const result = await Promise.race([promise, timeout]);
		return result;
	} finally {
		clearTimeout(timer!);
	}
}

// ── JSON parse + Zod validate helper ─────────────────────────────────────────

/**
 * Strips code fences, parses JSON, then validates against the given Zod schema.
 * Throws a descriptive error on parse failure or schema mismatch — prevents
 * hallucinated AI output from being cast silently into MongoDB.
 */
function parseJsonResponse<T>(content: string, passName: string, schema: z.ZodSchema): T {
	const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
	let raw: unknown;
	try {
		raw = JSON.parse(stripped);
	} catch {
		throw new Error(`${passName}: could not parse JSON response. Raw: ${stripped.slice(0, 300)}`);
	}
	const result = schema.safeParse(raw);
	if (!result.success) {
		const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
		throw new Error(`${passName}: response failed schema validation — ${issues}`);
	}
	return result.data as T;
}

// ── Per-pass Zod schemas ──────────────────────────────────────────────────────
// Deliberately loose on json-logic / unknown fields (z.unknown()) — we validate
// structural shape and required scalar types, not arbitrary nested objects.

const Pass1SegmentSchema = z.object({
	id: z.string(),
	originalText: z.string(),
	normalizedText: z.string(),
	relevance: z.enum(['in_scope', 'out_of_scope', 'ambiguous']),
	unknownTerms: z.array(z.string())
}).passthrough();

const Pass1Schema = z.object({
	normalizedText: z.string(),
	segments: z.array(Pass1SegmentSchema)
});

const Pass2AtomSchema = z.object({
	conditionText: z.string(),
	candidateKeyPath: z.string().nullable(),
	operator: z.string().nullable(),
	value: z.unknown(),
	scope: z.string().nullable()
}).passthrough();

const Pass2ClauseSchema = z.object({
	id: z.string(),
	originalText: z.string(),
	normalizedText: z.string(),
	atoms: z.array(Pass2AtomSchema),
	outcome: z.object({ fieldPath: z.string().nullable(), value: z.unknown() }).passthrough(),
	ambiguityFlags: z.array(z.object({ type: z.string(), description: z.string() }).passthrough()),
	tag: z.string()
}).passthrough();

const Pass2Schema = z.object({ clauses: z.array(Pass2ClauseSchema) });

const Pass3EffectSchema = z.object({
	fieldPath: z.string(),
	operation: z.string(),
	value: z.union([z.number(), z.string(), z.boolean()])
});

const Pass3EncodingSchema = z.object({
	clauseId: z.string(),
	mappable: z.boolean(),
	preferredMode: z.enum(['template', 'custom_json']).nullable(),
	templateId: z.string().nullable(),
	templateParams: z.record(z.string(), z.unknown()).nullable(),
	rawCondition: z.unknown().nullable(),
	effect: Pass3EffectSchema.nullable(),
	scope: z.string().nullable(),
	confidence: z.number().min(0).max(1),
	unmappableReason: z.string().nullable(),
	routingRecommendation: z.enum(['encode', 'bank_card', 'dev_queue'])
}).passthrough();

const Pass3Schema = z.object({ encodings: z.array(Pass3EncodingSchema) });
const Pass5Schema = z.object({ correctedEncodings: z.array(Pass3EncodingSchema) });

const Pass4ClauseScoreSchema = z.object({
	clauseId: z.string(),
	score: z.number(),
	issues: z.array(z.object({
		severity: z.string(),
		category: z.string(),
		description: z.string(),
		policyQuote: z.string(),
		correction: z.string()
	}).passthrough())
}).passthrough();

const Pass4Schema = z.object({
	overallScore: z.number().min(0).max(100),
	isValid: z.boolean(),
	clauseScores: z.array(Pass4ClauseScoreSchema),
	summary: z.string()
});

// ── Pass 1 — Normalize: Terminology Resolution + Relevance Classification ────

/**
 * Pass 1 takes raw policy text and returns normalized segments with relevance tags.
 * Human pause after: RM reviews in Wizard Step 1.
 */
export async function runPass1(
	sourceText: string,
	loanProduct: string
): Promise<{ result: Pass1Result; tokensUsed: number }> {
	const termContext = buildTermDictionaryContext();

	const systemPrompt = `You are a specialized bank loan policy parser for the Indian lending market.
Your task is to normalize raw policy text and classify each segment by relevance.

${termContext}

${SCHEMA_IRON_LAW}

## Out-of-scope categories (mark as out_of_scope):
- Internal bank operational procedures
- KYC / documentation checklists
- Branch contact details
- Legal disclaimers and boilerplate
- Non-${loanProduct} product references
- Marketing language

## Response format — output ONLY valid JSON, no explanation, no markdown:
{
  "normalizedText": "full normalized version of the input",
  "segments": [
    {
      "id": "seg_001",
      "originalText": "exact original segment",
      "normalizedText": "normalized using canonical terms",
      "relevance": "in_scope" | "out_of_scope" | "ambiguous",
      "unknownTerms": ["terms not in the dictionary"]
    }
  ]
}`;

	const userPrompt = `Parse this ${loanProduct} policy document:\n\n${sourceText}`;

	const response = await withTimeout(
		getClient().chat.completions.create({
			model: MODEL,
			temperature: 0,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]
		}),
		PASS_TIMEOUT_MS,
		'Pass 1'
	);

	const content = response.choices[0]?.message?.content ?? '';
	const result = parseJsonResponse<Pass1Result>(content, 'Pass 1', Pass1Schema);
	const tokensUsed = response.usage?.total_tokens ?? 0;

	return { result, tokensUsed };
}

// ── Pass 2 — Atomize: Clause Splitting + Ambiguity Flagging ──────────────────

/**
 * Pass 2 takes in-scope segments and splits them into atomic IF-THEN clauses
 * with ambiguity flags. RM reviews combined Pass1+Pass2 output in Step 1.
 */
export async function runPass2(
	inScopeSegments: Pass1Result['segments'],
	loanProduct: string
): Promise<{ clauses: Pass2Clause[]; tokensUsed: number }> {
	const VALID_TAGS: ClauseTag[] = ['eligibility', 'income', 'foir', 'ltv', 'tenure', 'roi', 'geo', 'fee', 'obligation', 'deviation', 'other'];

	const systemPrompt = `You are a bank policy atomizer for the Indian lending market.
Split policy segments into atomic IF-THEN clauses and flag ambiguities.

${SCHEMA_IRON_LAW}

## Clause tag values: ${VALID_TAGS.join(', ')}
## Scope values: primary_applicant, any_applicant, all_applicants, property, loan, global

## Ambiguity type values:
- multiple_interpretations: clause could be read in different ways
- internal_conflict: clause contradicts another clause
- external_reference: clause references external documents or approval processes
- unmapped_key: clause requires a JSON-Logic variable not in the schema

## Response format — output ONLY valid JSON:
{
  "clauses": [
    {
      "id": "clause_001",
      "originalText": "original text of this clause",
      "normalizedText": "normalized version",
      "atoms": [
        {
          "conditionText": "natural language condition",
          "candidateKeyPath": "creditScore" or null,
          "operator": ">=" or null,
          "value": 700 or null,
          "scope": "primary_applicant" or null
        }
      ],
      "outcome": { "fieldPath": "eligibility" or null, "value": true or null },
      "ambiguityFlags": [],
      "tag": "eligibility"
    }
  ]
}`;

	const userPrompt = `Atomize these ${loanProduct} in-scope policy segments:\n\n${JSON.stringify(inScopeSegments, null, 2)}`;

	const response = await withTimeout(
		getClient().chat.completions.create({
			model: MODEL,
			temperature: 0,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]
		}),
		PASS_TIMEOUT_MS,
		'Pass 2'
	);

	const content = response.choices[0]?.message?.content ?? '';
	const parsed = parseJsonResponse<{ clauses: Pass2Clause[] }>(content, 'Pass 2', Pass2Schema);
	const tokensUsed = response.usage?.total_tokens ?? 0;

	return { clauses: parsed.clauses, tokensUsed };
}

// ── Pass 3 — Encode: Template Matching + JSON-Logic ──────────────────────────

/**
 * Pass 3 converts RM-confirmed clauses into JSON-Logic ConditionalOverrides.
 * Called after RM reviews Step 1 and clicks "Proceed to Encoding".
 *
 * Server-side guard: any clause with relevance 'ambiguous' triggers HTTP 422
 * before this pass runs (enforced at the API route level).
 */
export async function runPass3(
	confirmedClauses: Pass2Clause[],
	loanProduct: string
): Promise<{ encodings: Pass3Encoding[]; tokensUsed: number }> {
	const VALID_SCOPES: ConditionScope[] = ['primary_applicant', 'any_applicant', 'all_applicants', 'property', 'loan', 'global'];

	const systemPrompt = `You are a JSON-Logic encoder for Indian bank loan policies.
Convert policy clauses into precise JSON-Logic ConditionalOverrides.

${SCHEMA_IRON_LAW}

## Scope values: ${VALID_SCOPES.join(', ')}
## Effect operations: set, add, multiply, max, min
## Routing recommendations:
- encode: clause maps cleanly to JSON-Logic + fits a known field
- bank_card: clause is informational, not evaluable (e.g., "documents required", "visit branch")
- dev_queue: clause requires a new schema variable that doesn't exist yet

## Response format — output ONLY valid JSON:
{
  "encodings": [
    {
      "clauseId": "clause_001",
      "mappable": true,
      "preferredMode": "template" | "custom_json" | null,
      "templateId": null,
      "templateParams": null,
      "rawCondition": { ">=": [{"var": "creditScore"}, 700] },
      "effect": { "fieldPath": "eligibility", "operation": "set", "value": true },
      "scope": "primary_applicant",
      "confidence": 0.92,
      "unmappableReason": null,
      "routingRecommendation": "encode"
    }
  ]
}`;

	const userPrompt = `Encode these confirmed ${loanProduct} policy clauses into JSON-Logic:\n\n${JSON.stringify(confirmedClauses, null, 2)}`;

	const response = await withTimeout(
		getClient().chat.completions.create({
			model: MODEL,
			temperature: 0,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]
		}),
		PASS_TIMEOUT_MS,
		'Pass 3'
	);

	const content = response.choices[0]?.message?.content ?? '';
	const parsed = parseJsonResponse<{ encodings: Pass3Encoding[] }>(content, 'Pass 3', Pass3Schema);
	const tokensUsed = response.usage?.total_tokens ?? 0;

	return { encodings: parsed.encodings, tokensUsed };
}

// ── Pass 4 — Verify: Encoding Quality Score ───────────────────────────────────

/**
 * Pass 4 scores each encoding 0-100 and flags issues by severity.
 * Score >= 85 → isValid. Below 85 or any critical issue → triggers Pass 5.
 */
export async function runPass4(
	clauses: Pass2Clause[],
	encodings: Pass3Encoding[],
	loanProduct: string
): Promise<{ result: Pass4Result; tokensUsed: number }> {
	const systemPrompt = `You are a JSON-Logic policy verifier for Indian bank loan policies.
Verify that each encoding correctly represents its source clause.

${SCHEMA_IRON_LAW}

## Severity levels: critical, high, medium, low
## Issue categories: wrong_field, hallucination, missing, wrong_value, wrong_logic

## Scoring criteria:
- Correct JSON-Logic variables (from schema): 30 points
- Logic matches IF-THEN structure of clause: 25 points
- Correct operator (≥/>/=/<): 20 points
- Correct value (exact numbers): 15 points
- Correct scope: 10 points

## Response format — output ONLY valid JSON:
{
  "overallScore": 87,
  "isValid": true,
  "clauseScores": [
    {
      "clauseId": "clause_001",
      "score": 90,
      "issues": [
        {
          "severity": "medium",
          "category": "wrong_value",
          "description": "Clause says CIBIL >= 720 but encoding uses 700",
          "policyQuote": "minimum CIBIL score of 720",
          "correction": "Change creditScore threshold from 700 to 720"
        }
      ]
    }
  ],
  "summary": "Overall encoding quality is good. 1 medium issue found."
}`;

	const userPrompt = `Verify these ${loanProduct} encodings against their source clauses:

## Source clauses:
${JSON.stringify(clauses, null, 2)}

## Encodings to verify:
${JSON.stringify(encodings, null, 2)}`;

	const response = await withTimeout(
		getClient().chat.completions.create({
			model: MODEL,
			temperature: 0,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]
		}),
		PASS_TIMEOUT_MS,
		'Pass 4'
	);

	const content = response.choices[0]?.message?.content ?? '';
	const result = parseJsonResponse<Pass4Result>(content, 'Pass 4', Pass4Schema);
	const tokensUsed = response.usage?.total_tokens ?? 0;

	return { result, tokensUsed };
}

// ── Pass 5 — Correct: Targeted Re-encode ─────────────────────────────────────

/**
 * Pass 5 only runs when Pass 4 score < 85 OR any critical issue found.
 * Fixes ONLY the listed issues — doesn't re-encode clean clauses.
 * Output merged with Pass 3: corrected entries replace originals.
 * Pass 4 runs once more after Pass 5 — maximum one correction cycle.
 */
export async function runPass5(
	failingClauses: Pass2Clause[],
	failingEncodings: Pass3Encoding[],
	pass4Issues: Pass4Result['clauseScores'],
	loanProduct: string
): Promise<{ correctedEncodings: Pass3Encoding[]; tokensUsed: number }> {
	const systemPrompt = `You are a JSON-Logic corrector for Indian bank loan policies.
Fix ONLY the specific issues listed — do not change clauses that are not listed.

${SCHEMA_IRON_LAW}

## Response format — output ONLY the corrected encodings in valid JSON:
{
  "correctedEncodings": [
    {
      "clauseId": "clause_001",
      "mappable": true,
      "preferredMode": "custom_json",
      "templateId": null,
      "templateParams": null,
      "rawCondition": { ... corrected condition ... },
      "effect": { ... },
      "scope": "primary_applicant",
      "confidence": 0.95,
      "unmappableReason": null,
      "routingRecommendation": "encode"
    }
  ]
}`;

	const failingIssues = pass4Issues.filter((cs) =>
		cs.issues.some((i) => i.severity === 'critical' || i.severity === 'high')
	);

	const userPrompt = `Correct these ${loanProduct} encodings based on the Pass 4 issues:

## Issues to fix:
${JSON.stringify(failingIssues, null, 2)}

## Original clauses:
${JSON.stringify(failingClauses, null, 2)}

## Current (incorrect) encodings:
${JSON.stringify(failingEncodings, null, 2)}`;

	const response = await withTimeout(
		getClient().chat.completions.create({
			model: MODEL,
			temperature: 0,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]
		}),
		PASS_TIMEOUT_MS,
		'Pass 5'
	);

	const content = response.choices[0]?.message?.content ?? '';
	const parsed = parseJsonResponse<{ correctedEncodings: Pass3Encoding[] }>(content, 'Pass 5', Pass5Schema);
	const tokensUsed = response.usage?.total_tokens ?? 0;

	return { correctedEncodings: parsed.correctedEncodings, tokensUsed };
}

// ── Pass 6 — Reconstruct: NL from JSON-Logic ─────────────────────────────────

/**
 * Pass 6A: Deterministic, zero-token reconstruction from templates.
 * Pass 6B: OpenAI prose reconstruction of the full policy.
 */
export async function runPass6(
	finalOverrides: ConditionalOverride[],
	lenderId: string,
	loanProduct: string
): Promise<{ result: Pass6Result; tokensUsed: number }> {
	// Method A — deterministic: reconstruct from override labels + effects
	const methodA = finalOverrides.map((override) => ({
		clauseId: override.id,
		reconstructedText: buildMethodAText(override)
	}));

	// Method B — AI prose: full readable policy document
	const systemPrompt = `You are a bank policy writer. Convert these JSON-Logic policy rules back into
clear, professional, plain-English policy language suitable for a bank policy document.
Write in the style of an official bank circular. Use Indian financial terminology.
Output a single cohesive policy document, not a list.`;

	const overrideSummary = finalOverrides
		.map((o) => `- ${o.label}: IF ${JSON.stringify(o.condition)} THEN ${JSON.stringify(o.effect)}`)
		.join('\n');

	const userPrompt = `Write a ${loanProduct} policy document for ${lenderId} based on these rules:\n\n${overrideSummary}`;

	const response = await withTimeout(
		getClient().chat.completions.create({
			model: MODEL,
			temperature: 0.3,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]
		}),
		PASS_TIMEOUT_MS,
		'Pass 6B'
	);

	const methodB = response.choices[0]?.message?.content ?? '';
	const tokensUsed = response.usage?.total_tokens ?? 0;

	return { result: { methodA, methodB }, tokensUsed };
}

/**
 * Method A: deterministic English reconstruction from an override's label + effect.
 * Zero tokens — pure TypeScript.
 */
function buildMethodAText(override: ConditionalOverride): string {
	const { label, effect, scope, source, confidence } = override;

	const scopeText: Record<typeof scope, string> = {
		primary_applicant: 'primary applicant',
		any_applicant: 'any applicant',
		all_applicants: 'all applicants',
		property: 'the property',
		loan: 'the loan',
		global: 'globally'
	};

	const operationText: Record<typeof effect.operation, string> = {
		set: 'is set to',
		add: 'is increased by',
		multiply: 'is multiplied by',
		max: 'is capped at',
		min: 'has a floor of'
	};

	return `[${label}] For ${scopeText[scope]}: ${effect.fieldPath} ${operationText[effect.operation]} ${effect.value}. (Source: ${source}, Confidence: ${Math.round(confidence * 100)}%)`;
}

// ── Combined Pass 1+2 entry point ─────────────────────────────────────────────

/**
 * Runs Pass 1 then Pass 2 sequentially — the standard "Start Parsing" action.
 * Returns combined output and total tokens used across both passes.
 */
export async function runPass1And2(
	sourceText: string,
	loanProduct: string
): Promise<{
	pass1Result: Pass1Result;
	pass2Clauses: Pass2Clause[];
	totalTokensUsed: number;
}> {
	const { result: pass1Result, tokensUsed: tokens1 } = await runPass1(sourceText, loanProduct);

	const inScopeSegments = pass1Result.segments.filter(
		(s) => s.relevance === 'in_scope' || s.relevance === 'ambiguous'
	);

	const { clauses: pass2Clauses, tokensUsed: tokens2 } = await runPass2(inScopeSegments, loanProduct);

	return {
		pass1Result,
		pass2Clauses,
		totalTokensUsed: tokens1 + tokens2
	};
}

// ── Pass 4+5 combined entry point ─────────────────────────────────────────────

/**
 * Runs Pass 4. If score < 85 or critical issues found, runs Pass 5 then Pass 4 again.
 * Maximum one correction cycle.
 * Returns final verified result and all encodings (corrected where needed).
 */
export async function runPass4And5(
	clauses: Pass2Clause[],
	encodings: Pass3Encoding[],
	loanProduct: string
): Promise<{
	finalEncodings: Pass3Encoding[];
	pass4Result: Pass4Result;
	pass5Triggered: boolean;
	pass4ScoreBeforeCorrection: number | null;
	totalTokensUsed: number;
}> {
	let totalTokens = 0;

	// First Pass 4
	const { result: firstPass4, tokensUsed: t4a } = await runPass4(clauses, encodings, loanProduct);
	totalTokens += t4a;

	const hasCritical = firstPass4.clauseScores.some((cs) =>
		cs.issues.some((i) => i.severity === 'critical')
	);
	const needsCorrection = firstPass4.overallScore < 85 || hasCritical;

	if (!needsCorrection) {
		return {
			finalEncodings: encodings,
			pass4Result: firstPass4,
			pass5Triggered: false,
			pass4ScoreBeforeCorrection: null,
			totalTokensUsed: totalTokens
		};
	}

	// Pass 5 — fix only failing clauses
	const failingClauseIds = new Set(
		firstPass4.clauseScores
			.filter((cs) => cs.issues.some((i) => i.severity === 'critical' || i.severity === 'high'))
			.map((cs) => cs.clauseId)
	);

	const failingClauses = clauses.filter((c) => failingClauseIds.has(c.id));
	const failingEncodings = encodings.filter((e) => failingClauseIds.has(e.clauseId));

	const { correctedEncodings, tokensUsed: t5 } = await runPass5(
		failingClauses,
		failingEncodings,
		firstPass4.clauseScores,
		loanProduct
	);
	totalTokens += t5;

	// Merge corrected encodings back
	const correctedMap = new Map(correctedEncodings.map((e) => [e.clauseId, e]));
	const mergedEncodings = encodings.map((e) => correctedMap.get(e.clauseId) ?? e);

	// Pass 4 re-verify after correction
	const { result: finalPass4, tokensUsed: t4b } = await runPass4(clauses, mergedEncodings, loanProduct);
	totalTokens += t4b;

	return {
		finalEncodings: mergedEncodings,
		pass4Result: finalPass4,
		pass5Triggered: true,
		pass4ScoreBeforeCorrection: firstPass4.overallScore,
		totalTokensUsed: totalTokens
	};
}
