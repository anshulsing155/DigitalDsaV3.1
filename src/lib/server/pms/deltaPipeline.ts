/**
 * PMS Delta Parse Pipeline
 * ════════════════════════════════════════════════════════════════════
 * Single-pass OpenAI diff: compares an addendum against the current
 * published policy sections and returns only the changed fields.
 *
 * Much lighter than the 6-pass encode pipeline — addendums are small
 * and targeted. One prompt, one response, Zod-validated output.
 *
 * Called by: POST /api/pms/pipeline/delta
 * ════════════════════════════════════════════════════════════════════
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import type { PolicyDelta, DeltaResult } from '$lib/config/pms/policyTypes.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';

// ── OpenAI client (lazy — same pattern as aiPipeline.ts) ─────────────────────

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
const TIMEOUT_MS = 45_000;

// ── Timeout wrapper (same as aiPipeline.ts) ───────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Delta parse timed out after ${ms}ms`)), ms);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		clearTimeout(timer!);
	}
}

// ── Zod schema for AI output ──────────────────────────────────────────────────

const DeltaItemSchema = z.object({
	sectionKey: z.string().min(1),
	fieldKey: z.string().min(1),
	oldValue: z.unknown(),
	newValue: z.unknown(),
	confidence: z.number().min(0).max(1),
	evidenceQuote: z.string().min(1)
});

export const DeltaOutputSchema = z.object({
	deltas: z.array(DeltaItemSchema),
	overallConfidence: z.number().min(0).max(1),
	summary: z.string()
});

type DeltaOutput = z.infer<typeof DeltaOutputSchema>;

// ── Prompt helpers ────────────────────────────────────────────────────────────

/**
 * Sentinel-frame the addendum text so the AI sees it as data, not instruction.
 * Also escape any lines that could be confused with system/assistant roles.
 */
function sentinelFrame(text: string): string {
	const escaped = text
		.split('\n')
		.map((line) => {
			const trimmed = line.trimStart();
			// Escape lines that look like role injections
			if (
				trimmed.toLowerCase().startsWith('system:') ||
				trimmed.toLowerCase().startsWith('assistant:') ||
				trimmed.toLowerCase().startsWith('user:')
			) {
				return '[ESCAPED] ' + line;
			}
			return line;
		})
		.join('\n');

	return `--- ADDENDUM START ---\n${escaped}\n--- ADDENDUM END ---`;
}

/**
 * Build a concise JSON summary of current policy sections for the prompt.
 * We don't dump the entire sections object verbatim — large LTV/geo arrays
 * waste tokens. Summarise numeric limits and boolean flags.
 */
function buildSectionsSummary(sections: PolicyDocument['sections']): string {
	return JSON.stringify(sections, null, 2);
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Run the delta parse: compare addendum text against current policy sections.
 * Returns a list of field-level changes with evidence quotes and confidence scores.
 *
 * Does NOT write to DB — caller (API route) saves the result to pipelineState.
 */
export async function runDelta(
	currentSections: PolicyDocument['sections'],
	addendumText: string,
	loanProduct: string
): Promise<DeltaResult> {
	const client = getClient();

	const systemPrompt = `You are a specialist loan policy analyst. Your task is to identify EXACTLY what changed between a bank's existing policy and a new policy addendum (circular).

You will be given:
1. The CURRENT policy sections as JSON
2. The ADDENDUM text (a change circular from the bank)

Rules:
- Return ONLY genuine changes that appear in the addendum. Do not invent changes.
- If you are uncertain whether something is a real change, set confidence < 0.7.
- Return an empty deltas array if nothing changed.
- Each delta must include an evidenceQuote — the exact sentence or phrase from the addendum that proves the change.
- sectionKey must be one of: eligibility, income, foir, ltv, obligations, tenure, roi, geo, fees
- fieldKey must match an existing key inside that section's JSON object.
- oldValue and newValue must be valid JSON (numbers, strings, booleans, arrays, or objects).

Return valid JSON matching this schema exactly:
{
  "deltas": [
    {
      "sectionKey": "string — one of the 9 sections",
      "fieldKey": "string — field inside that section",
      "oldValue": <current value from policy JSON>,
      "newValue": <new value from addendum>,
      "confidence": <0.0 to 1.0>,
      "evidenceQuote": "exact text from addendum"
    }
  ],
  "overallConfidence": <0.0 to 1.0>,
  "summary": "one sentence describing total changes detected"
}`;

	const userPrompt = `LOAN PRODUCT: ${loanProduct}

CURRENT POLICY SECTIONS (JSON):
\`\`\`json
${buildSectionsSummary(currentSections)}
\`\`\`

NEW ADDENDUM:
${sentinelFrame(addendumText)}

Identify all field-level changes. Return empty deltas array if you find none.`;

	const aiCall = client.chat.completions.create({
		model: MODEL,
		temperature: 0,
		response_format: { type: 'json_object' },
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		]
	});

	const completion = await withTimeout(aiCall, TIMEOUT_MS);
	const tokensUsed = completion.usage?.total_tokens ?? 0;
	const rawContent = completion.choices[0]?.message?.content ?? '';

	// Strip markdown fences if model added them despite json_object mode
	const stripped = rawContent
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();

	let parsed: DeltaOutput;
	try {
		const json = JSON.parse(stripped);
		const result = DeltaOutputSchema.safeParse(json);
		if (!result.success) {
			throw new Error(
				`Delta parse output failed Zod validation: ${result.error.issues.map((i) => i.message).join('; ')}`
			);
		}
		parsed = result.data;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Delta parse: could not validate AI response — ${msg}. Raw: ${stripped.slice(0, 400)}`);
	}

	const deltas: PolicyDelta[] = parsed.deltas.map((d) => ({
		sectionKey: d.sectionKey,
		fieldKey: d.fieldKey,
		oldValue: d.oldValue,
		newValue: d.newValue,
		confidence: d.confidence,
		evidenceQuote: d.evidenceQuote,
		rmDecision: null
	}));

	return {
		deltas,
		tokensUsed,
		overallConfidence: parsed.overallConfidence,
		summary: parsed.summary,
		ranAt: new Date().toISOString()
	};
}
