/**
 * OpenTelemetry initialization — DigitalDSA V3
 * ═══════════════════════════════════════════════════════════════════════════
 * OBS-2 implementation. Wires SvelteKit request → MongoDB driver → outbound
 * fetch into a single trace tree per request so production debugging answers
 * "where is time being spent?" with span data instead of guesswork.
 *
 * ENABLE / DISABLE
 * ────────────────
 * Off by default. Set OTEL_ENABLED=1 to turn on. Required env vars when enabled:
 *
 *   OTEL_EXPORTER_OTLP_ENDPOINT  Full collector URL (e.g. https://...vercel.app/v1/traces)
 *   OTEL_SERVICE_NAME            Defaults to 'digitaldsa-v3'
 *   OTEL_RESOURCE_ATTRIBUTES     Optional comma-list: deployment.environment=production,etc
 *
 * Local development: set OTEL_ENABLED=1 + OTEL_LOG_TO_CONSOLE=1 to dump spans
 * to stdout instead of (or in addition to) the OTLP exporter.
 *
 * COLD-START COST
 * ───────────────
 * SDK init adds ~50-100ms to the first request after a Vercel function cold
 * start (single-shot, idempotent — the second `start()` call is a no-op via
 * the singleton guard below). Negligible after warm-up.
 *
 * PII SCRUBBING
 * ─────────────
 * Auto-instrumentation can capture URL query strings, MongoDB filters, and
 * fetch URLs that contain phone numbers / PAN / Aadhaar / case IDs. The
 * scrubSpanAttributes SpanProcessor walks every span before export and
 * redacts known PII-bearing keys. CLAUDE.md Pitfall #27 documents the
 * rule; the test in obsTelemetryScrubbing.test.ts pins the contract.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// LAZY IMPORTS — runtime SDK modules deferred until startTelemetry() actually
// fires (i.e. OTEL_ENABLED === '1'). The seven @opentelemetry/sdk-* packages
// add 100-300ms of cold-start module-load cost on Vercel functions; off-path
// callers (the default) now pay zero. Only TYPES are imported at top level.
// ─────────────────────────────────────────────────────────────────────────────
import type { NodeSDK } from '@opentelemetry/sdk-node';
import type { SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON GUARD
// ─────────────────────────────────────────────────────────────────────────────
// SvelteKit can call our init code multiple times during dev HMR / SSR module
// reloading. The OTel SDK errors out if start() runs twice; the flag here
// short-circuits the second call cleanly.
let sdkStarted = false;
let sdkInstance: NodeSDK | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// PII SCRUBBING
// ─────────────────────────────────────────────────────────────────────────────
// Known attribute keys that may carry PII or business-secret values. Span
// attributes are stripped to `[REDACTED]` before export so debugging keeps
// the span tree (timings, errors) without leaking sensitive data.
const PII_ATTR_KEYS = new Set([
	// Auth + identity
	'user.id',
	'user.email',
	'user.mobileNumber',
	'http.request.header.authorization',
	'http.request.header.cookie',
	'http.response.header.set-cookie',
	// MongoDB filters can include user IDs, mobile numbers, PAN, Aadhaar
	'db.statement',
	'db.mongodb.filter',
	// Application-domain identifiers that are user-traceable
	'app.case_id',
	'app.applicant_id',
	'app.dsa_id',
	'app.rm_id'
]);

/**
 * URL substrings that, when present in `http.url` or `url.full`, signal the
 * URL itself carries PII (e.g. /api/users/+919999999999/...). The full URL
 * gets redacted; the route template (in `http.route`) is preserved for
 * grouping in observability tools.
 */
const PII_URL_FRAGMENTS = ['/otp/', '/mobile/', '/admins/'];

function looksLikePiiUrl(url: unknown): boolean {
	if (typeof url !== 'string') return false;
	for (const frag of PII_URL_FRAGMENTS) {
		if (url.includes(frag)) return true;
	}
	// Phone numbers (Indian 10-digit, optionally 91-prefixed). Use a non-capturing
	// group for the optional country code so the prefix is genuinely optional
	// (the earlier `91?` matched "9 then optional 1" — wrong semantics).
	if (/\b(?:91)?[6-9]\d{9}\b/.test(url)) return true;
	return false;
}

/**
 * SpanProcessor that scrubs PII from span attributes before export.
 * Pure function over each span — runs once per span emission, no per-attribute
 * MongoDB lookup or anything expensive.
 *
 * Exported so the unit test can call it directly without booting the full SDK.
 */
export function buildScrubbingSpanProcessor(downstream: SpanProcessor): SpanProcessor {
	return {
		onStart: (span, ctx) => downstream.onStart(span, ctx),
		onEnd: (span: ReadableSpan) => {
			scrubSpanAttributes(span);
			downstream.onEnd(span);
		},
		shutdown: () => downstream.shutdown(),
		forceFlush: () => downstream.forceFlush()
	};
}

/** Mutates `span.attributes` in place to redact known PII keys. */
export function scrubSpanAttributes(span: ReadableSpan): void {
	const attrs = span.attributes as Record<string, unknown>;
	if (!attrs) return;
	for (const key of Object.keys(attrs)) {
		if (PII_ATTR_KEYS.has(key)) {
			attrs[key] = '[REDACTED]';
			continue;
		}
		// http.url / url.full sometimes carry phone numbers in the path
		if ((key === 'http.url' || key === 'url.full') && looksLikePiiUrl(attrs[key])) {
			attrs[key] = '[REDACTED-PII-URL]';
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SDK START
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize OpenTelemetry. Call once during server boot. Idempotent: subsequent
 * calls are no-ops. Reads env vars at call time so module-load order doesn't
 * matter.
 *
 * Returns true if the SDK was started this call, false if disabled or already
 * running.
 */
export async function startTelemetry(): Promise<boolean> {
	if (sdkStarted) return false;
	if (process.env.OTEL_ENABLED !== '1' && process.env.OTEL_ENABLED !== 'true') {
		return false;
	}

	// Lazy SDK module load. Seven Promise.all'd dynamic imports run concurrently
	// instead of seven static imports being walked one-by-one by Node's loader at
	// module init. Total cost only paid on the OTEL_ENABLED path; the no-op path
	// (default) skips this entirely.
	const [
		{ NodeSDK },
		{ OTLPTraceExporter },
		{ ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor },
		{ resourceFromAttributes },
		{ ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
		{ MongoDBInstrumentation },
		{ UndiciInstrumentation }
	] = await Promise.all([
		import('@opentelemetry/sdk-node'),
		import('@opentelemetry/exporter-trace-otlp-http'),
		import('@opentelemetry/sdk-trace-base'),
		import('@opentelemetry/resources'),
		import('@opentelemetry/semantic-conventions'),
		import('@opentelemetry/instrumentation-mongodb'),
		import('@opentelemetry/instrumentation-undici')
	]);

	const serviceName = process.env.OTEL_SERVICE_NAME ?? 'digitaldsa-v3';
	const serviceVersion = process.env.OTEL_SERVICE_VERSION ?? '0.0.1';
	const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
	const logToConsole =
		process.env.OTEL_LOG_TO_CONSOLE === '1' || process.env.OTEL_LOG_TO_CONSOLE === 'true';

	const resource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: serviceName,
		[ATTR_SERVICE_VERSION]: serviceVersion
	});

	const processors: SpanProcessor[] = [];

	// OTLP exporter when configured — production path
	if (otlpEndpoint) {
		const otlpExporter = new OTLPTraceExporter({ url: otlpEndpoint });
		processors.push(buildScrubbingSpanProcessor(new BatchSpanProcessor(otlpExporter)));
	}

	// Console exporter for local dev / debugging
	if (logToConsole) {
		processors.push(buildScrubbingSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter())));
	}

	if (processors.length === 0) {
		// OTEL_ENABLED was set but no exporter configured — log once and give up.
		// We don't want to silently swallow misconfiguration.
		// eslint-disable-next-line no-console
		console.warn(
			'[OTel] OTEL_ENABLED=1 but neither OTEL_EXPORTER_OTLP_ENDPOINT nor OTEL_LOG_TO_CONSOLE set. Telemetry disabled.'
		);
		return false;
	}

	sdkInstance = new NodeSDK({
		resource,
		spanProcessors: processors,
		instrumentations: [
			// MongoDB driver — captures collection + operation
			new MongoDBInstrumentation({
				enhancedDatabaseReporting: false, // OFF — would dump query filters into spans
				responseHook: undefined
			}),
			// Outbound fetch (Node 18+ uses Undici under the hood — instrument it
			// instead of the legacy http instrumentation).
			new UndiciInstrumentation()
		]
	});

	try {
		sdkInstance.start();
		sdkStarted = true;
		// eslint-disable-next-line no-console
		console.log(`[OTel] Telemetry started — service=${serviceName} exporters=${processors.length}`);
		return true;
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[OTel] Failed to start SDK', err);
		return false;
	}
}

/**
 * Graceful shutdown. Returns a promise that resolves once pending spans are
 * flushed. Vercel functions don't reliably call shutdown hooks, so this is
 * mostly for local development.
 */
export async function shutdownTelemetry(): Promise<void> {
	if (!sdkStarted || !sdkInstance) return;
	try {
		await sdkInstance.shutdown();
	} catch {
		// best-effort
	}
	sdkStarted = false;
	sdkInstance = null;
}
