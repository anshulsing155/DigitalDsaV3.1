import { MongoClient, type Db, type Collection, type ObjectId } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';
import logger from '$lib/server/logger.js';
import type { Dsa, User, Rm, PropertyConsultant } from '$lib/types/index.js';
import type { Case } from '$lib/types/case.js';
import type { MonthlyAssessmentUsageDoc } from '$lib/types/monthlyAssessmentUsage.js';
import type { RMContact } from '$lib/types/rmContact.js';
import type { TimelineEvent } from '$lib/types/timeline.js';
import type { FormSnapshot } from '$lib/types/formSnapshot.js';
import type { CommunicationThread } from '$lib/types/communicationThread.js';
import type { DisclaimerAcceptance } from '$lib/types/disclaimer.js';
import type { SyntheticProfile } from '$lib/types/syntheticProfile.js';
import type { DeviceRecord } from '$lib/types/deviceRegistry.js';
import type { FormSession, TrustScore } from '$lib/types/formSession.js';
import type { AccuracyRating, RMBroadcast, PolicyDocument } from '$lib/types/rmPortal.js';
import type { LenderResultsSnapshot } from '$lib/types/lenderResultsSnapshot.js';
import type { Team } from '$lib/types/team.js';
import type { Lead } from '$lib/types/lead.js';
import type { Source } from '$lib/types/source.js';
import type { CRMLender } from '$lib/types/crmLender.js';
import type { AdminUser } from '$lib/types/adminUser.js';
import type { RuleArtifactPair, LenderRuleFixture } from '$lib/types/ruleArtifact.js';
import type {
	Lender,
	LenderProduct,
	ProductVariation,
	GeoScope,
	PolicyRule,
	PolicyVersion,
	PolicyEvidenceDocument,
	RMSubmission,
	ReviewComment,
	PolicyAuditLog,
	ApiKey,
	SystemConfig
} from '$lib/types/policyEngine.js';
import type { E2eTestRun } from '$lib/types/e2eTestRun.js';
import type { PolicyCapture } from '$lib/types/policyCapture.js';
import type { QaScenario } from '$lib/types/qaScenario.js';
import type { NotificationDoc } from '$lib/types/notification.js';
import type { PushSubscriptionDoc } from '$lib/types/pushSubscription.js';
import type {
	RmLenderAssignment,
	PolicyDocument as PmsPolicyDocument,
	PolicySuggestion,
	FutureEnhancementItem
} from '$lib/config/pms/policyTypes.js';

// ── Connection constants ─────────────────────────────────────────
const MAX_CONNECT_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1s, 2s, 4s exponential backoff

export async function connectToCluster(): Promise<MongoClient> {
	// Connection timeouts tuned for Vercel Hobby's 10s function ceiling:
	// fail fast on a stuck connect so the retry loop below can try again
	// rather than holding the whole function budget on one attempt.
	const mongoClient = new MongoClient(MONGODB_URI, {
		maxPoolSize: 10,
		// Lazy-create connections on demand. Pre-warming idle sockets is a
		// phantom optimization on serverless — every cold start re-creates
		// the pool, every cold death tears it down.
		minPoolSize: 0,
		maxIdleTimeMS: 30000,
		// How long to wait for a healthy server before throwing. 3s leaves
		// ~7s of the Hobby 10s budget for actual work after a worst-case
		// first-attempt failure.
		serverSelectionTimeoutMS: 3000,
		// TCP socket-level connect timeout. Must be << function budget so a
		// stuck handshake doesn't guarantee a 504.
		connectTimeoutMS: 3000,
		retryWrites: true,
		retryReads: true
	});

	// Retry loop with exponential backoff: 1s → 2s → 4s
	for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
		try {
			logger.info({ attempt, maxRetries: MAX_CONNECT_RETRIES }, 'Connecting to MongoDB Atlas...');
			await mongoClient.connect();
			logger.info('MongoDB Atlas connected successfully');

			// Listen for unexpected connection close events.
			// The MongoDB driver auto-reconnects internally (retryWrites/retryReads),
			// but we log the event so ops can monitor connection health.
			mongoClient.on('close', () => {
				logger.warn('MongoDB connection closed unexpectedly — driver will auto-reconnect');
			});

			return mongoClient;
		} catch (error) {
			const isLastAttempt = attempt === MAX_CONNECT_RETRIES;
			const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);

			if (isLastAttempt) {
				logger.error(
					{ err: error, attempt, maxRetries: MAX_CONNECT_RETRIES },
					'All MongoDB connection attempts exhausted — giving up'
				);
				throw new Error('MongoDB connection failed after all retries');
			}

			logger.warn(
				{ err: error, attempt, maxRetries: MAX_CONNECT_RETRIES, nextRetryMs: delayMs },
				'MongoDB connection attempt failed — retrying...'
			);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	// TypeScript exhaustiveness: should never reach here, but satisfies the return type
	throw new Error('MongoDB connection failed');
}

let mongoClient: MongoClient = await connectToCluster();

/**
 * The underlying MongoClient — exported so server-side code (e.g. CSFLE
 * `ClientEncryption`) can bind to the same connection. Avoid using this
 * for collection access — use the typed `Collection<T>` exports below.
 */
export const MongoClientInstance: MongoClient = mongoClient;
export const UserApplication: Db = mongoClient.db('digitaldsa');

// ── RERA Broker Data (from brokerData database on same cluster) ──
// Contains scraped RERA projects, companies (builders/promoters), agents
export const BrokerData: Db = mongoClient.db('brokerData');
export const ReraProjects: Collection = BrokerData.collection('projects');
export const ReraCompanies: Collection = BrokerData.collection('companies');
export const ReraProjectCompanies: Collection = BrokerData.collection('project_companies');

export const Applicant: Collection<User> = UserApplication.collection<User>('userApplications');
export const DsaApplications: Collection<Dsa> = UserApplication.collection<Dsa>('DsaApplications');
export const rmApplications: Collection<Rm> = UserApplication.collection<Rm>('rmApplications');
export const pcApplications: Collection<PropertyConsultant> =
	UserApplication.collection<PropertyConsultant>('pcApplications');

// Case management collections
export const Cases: Collection<Case> = UserApplication.collection<Case>('cases');
export const CaseIdCounters: Collection<{ _id: string; seq: number }> = UserApplication.collection<{
	_id: string;
	seq: number;
}>('caseIdCounters');
export const LeadIdCounters: Collection<{ _id: string; seq: number }> = UserApplication.collection<{
	_id: string;
	seq: number;
}>('leadIdCounters');
export const RMContacts: Collection<RMContact> =
	UserApplication.collection<RMContact>('rmContacts');
export const TimelineEvents: Collection<TimelineEvent> =
	UserApplication.collection<TimelineEvent>('timelineEvents');
export const FormSnapshots: Collection<FormSnapshot> =
	UserApplication.collection<FormSnapshot>('formSnapshots');
export const CommunicationThreads: Collection<CommunicationThread> =
	UserApplication.collection<CommunicationThread>('communicationThreads');

/**
 * SEC-2 Phase C — CSFLE backfill audit trail.
 *
 * One row per converted document. Append-only by design — let the TTL
 * index handle expiry. Operators can query this collection during or
 * after a backfill run to confirm idempotency, debug partial-completion
 * scenarios, or satisfy a compliance audit.
 *
 * Retention: TTL index on `ran_at`, expireAfterSeconds = 90 days. The
 * Mongo daemon's TTL monitor sweeps expired entries on a ~60s cycle.
 * Index creation: see `src/lib/server/csfle/backfill.ts` ensureAuditIndex().
 */
export interface CsfleBackfillAuditEntry {
	_id?: ObjectId;
	/** Source collection name — string form because the value is for human reading, not joins. */
	collection: string;
	/** The row that was converted, by _id. */
	row_id: ObjectId;
	/** Which PII fields the run actually encrypted on this row. */
	encrypted_fields: string[];
	/** When the conversion landed. Also drives the TTL expiry. */
	ran_at: Date;
	/** Free-form identifier of the operator / hostname that ran the backfill. */
	ran_by: string;
	/** Optional batch identifier so a single backfill run is one logical group. */
	run_id?: string;
}
export const CsfleBackfillAudit: Collection<CsfleBackfillAuditEntry> =
	UserApplication.collection<CsfleBackfillAuditEntry>('csfleBackfillAudit');

/** Communication logs — tracks sent emails/SMS for audit trail */
export interface CommunicationLogEntry {
	dsa_id: string;
	case_id?: string;
	channel: 'email' | 'sms' | 'whatsapp';
	template_id: string;
	to: string;
	cc?: string;
	subject?: string;
	status: 'sent' | 'failed';
	message_id?: string;
	error?: string;
	sent_at: Date;
}
export const CommunicationLogs: Collection<CommunicationLogEntry> =
	UserApplication.collection<CommunicationLogEntry>('communicationLogs');

// In-app notifications (90-day TTL, auto-expire)
export const Notifications: Collection<NotificationDoc> =
	UserApplication.collection<NotificationDoc>('notifications');

// Web Push subscriptions (browser notification endpoints)
export const PushSubscriptions: Collection<PushSubscriptionDoc> =
	UserApplication.collection<PushSubscriptionDoc>('pushSubscriptions');

// Disclaimer acceptance tracking (AD-11)
export const DisclaimerAcceptances: Collection<DisclaimerAcceptance> =
	UserApplication.collection<DisclaimerAcceptance>('disclaimerAcceptances');

// Deleted account archives — docs moved here on account deletion for recovery
export const deletedUsers = UserApplication.collection('deletedUsers');
export const deletedDsa = UserApplication.collection('deletedDsa');
export const deletedRm = UserApplication.collection('deletedRm');
export const deletedPc = UserApplication.collection('deletedPc');

// Synthetic profiles — anonymized FormSnapshot payloads for test/demo data
export const SyntheticProfiles: Collection<SyntheticProfile> =
	UserApplication.collection<SyntheticProfile>('syntheticProfiles');

// Share links collection (used dynamically via getCollection in shareLinks.ts)
export const ShareLinks = UserApplication.collection('shareLinks');

// Device registry — silent fingerprint tracking for abuse detection
export const DeviceRegistry: Collection<DeviceRecord> =
	UserApplication.collection<DeviceRecord>('deviceRegistry');

// Form security — anti-scraping session tracking and trust scoring
export const FormSessions: Collection<FormSession> =
	UserApplication.collection<FormSession>('formSessions');
export const TrustScores: Collection<TrustScore> =
	UserApplication.collection<TrustScore>('trustScores');

// Lender results — versioned evaluation snapshots
export const LenderResultsSnapshots: Collection<LenderResultsSnapshot> =
	UserApplication.collection<LenderResultsSnapshot>('lenderResultsSnapshots');

// RM Portal — Phase 6 expansion
export const AccuracyRatings: Collection<AccuracyRating> =
	UserApplication.collection<AccuracyRating>('accuracyRatings');
export const RMBroadcasts: Collection<RMBroadcast> =
	UserApplication.collection<RMBroadcast>('rmBroadcasts');
export const PolicyDocuments: Collection<PolicyDocument> =
	UserApplication.collection<PolicyDocument>('policyDocuments');

// Billing & Subscriptions
// Typed against the union BillingTransactionDoc (legacy one-time + D.1 recurring).
// Existing pre-D.1 inserts at src/routes/api/billing/{subscribe,cancel}/+server.ts
// match the LegacyBillingTransactionDoc variant (no `kind` field). The S3 cron +
// webhook handler write the Recurring variant with `kind: 'recurring_charge'` or
// 'webhook_confirmation' (per BillingTransactionDoc in billingSubscription.ts).
import type {
	BillingSubscriptionDoc,
	BillingTransactionDoc,
	ChargeAttemptDoc,
	BillingAuditLogDoc,
	CronLockDoc,
	TrialIdentifierBlocklistDoc
} from '$lib/types/billingSubscription.js';
import type { ReconciliationRunDoc } from '$lib/types/reconciliation.js';
import type { InvoiceDoc, InvoiceCounterDoc } from '$lib/types/invoice.js';
import type { DataExportRequestDoc } from '$lib/types/dataExport.js';
import type { SessionDoc } from '$lib/types/session.js';
import type { SurveyResponseDoc } from '$lib/types/survey.js';
import type { ReferralDoc } from '$lib/types/referral.js';

export const BillingTransactions: Collection<BillingTransactionDoc> =
	UserApplication.collection<BillingTransactionDoc>('billingTransactions');

// D.1 — Recurring Billing
export const BillingSubscriptions: Collection<BillingSubscriptionDoc> =
	UserApplication.collection<BillingSubscriptionDoc>('billingSubscriptions');

/**
 * D.1 S3 — per-cycle charge attempts written BEFORE the provider call
 * (two-phase persist, spec R1/R2). The `(subscription_id, cycle_anchor)`
 * compound index is the per-cycle idempotency probe — the engine MUST query
 * for an existing succeeded row before calling provider.chargeMandate() to
 * prevent double-charge on cron-fires-twice (see chargeEngine.ts and the
 * lock-in test chargeEngineIdempotency.test.ts).
 */
export const ChargeAttempts: Collection<ChargeAttemptDoc> =
	UserApplication.collection<ChargeAttemptDoc>('chargeAttempts');

/**
 * D.1 S3 — append-only billing audit log (separate collection from
 * policyAuditLog and the generic auditLog to allow per-class retention:
 * billing keeps 6 years for regulatory compliance vs operational logs at 1y).
 */
export const BillingAuditLogs: Collection<BillingAuditLogDoc> =
	UserApplication.collection<BillingAuditLogDoc>('billingAuditLogs');

/**
 * D.1 S3 — global cron lock collection. Per spec R14, the charge cron MUST
 * NOT run concurrently across regions or retries. cronLock.ts acquires with
 * a SHORT TTL (~5 min) and extends via heartbeat (~60s cadence) for the
 * lifetime of the batch.
 */
export const CronLocks: Collection<CronLockDoc> =
	UserApplication.collection<CronLockDoc>('cronLocks');

/**
 * D.1 S7 — one row per daily reconcile cron run. Records the per-day
 * counts + every discrepancy detail so the admin view at
 * `/dashboard/admin/billing/reconciliation` can render a paginated
 * history with drill-down. See src/lib/types/reconciliation.ts for
 * the document shape + discriminated-union Discrepancy.
 */
export const ReconciliationRuns: Collection<ReconciliationRunDoc> =
	UserApplication.collection<ReconciliationRunDoc>('reconciliationRuns');

/**
 * Free-trial abuse defense — append-only ledger of identifiers (hashed)
 * that have ever consumed a free trial. Three indexes are created in the
 * setup block below; uniqueness on (identifier_kind, identifier_hash)
 * means a single phone/PAN/GST can claim only one trial across all DSAs.
 *
 * See trialEligibility.ts for the read/write helpers and TrialIdentifierBlocklistDoc
 * (src/lib/types/billingSubscription.ts) for the document shape.
 */
export const TrialIdentifierBlocklist: Collection<TrialIdentifierBlocklistDoc> =
	UserApplication.collection<TrialIdentifierBlocklistDoc>('trialIdentifierBlocklist');

/**
 * D.2 — GST invoices. One row per successful subscription charge. Refunds
 * (D.3 — slotted) will issue credit notes against these via a separate
 * collection. See src/lib/types/invoice.ts for the InvoiceDoc shape.
 */
export const Invoices: Collection<InvoiceDoc> =
	UserApplication.collection<InvoiceDoc>('invoices');

/**
 * D.2 — Per-financial-year gapless invoice counter. One doc per FY:
 *   { _id: 'fy_2026-27', value: 42 }
 * The atomic findOneAndUpdate + $inc + upsert pattern guarantees that
 * concurrent invoice generations get unique sequential values — required
 * by GST law (gapless numbering).
 */
export const InvoiceCounters: Collection<InvoiceCounterDoc> =
	UserApplication.collection<InvoiceCounterDoc>('invoiceCounters');

/**
 * processedWebhookEvents — idempotency cache per spec §6.
 * 18-month TTL per critique P3-3 (long enough for DR replay scenarios).
 * Just an `_id` set; we look up by provider_event_id to short-circuit
 * duplicate deliveries with a 200 no-op.
 */
export const ProcessedWebhookEvents: Collection<{
	_id: string; // provider_event_id (e.g. "evt_xxx" or "subscription.charged:pay_xxx")
	processed_at: Date;
}> = UserApplication.collection('processedWebhookEvents');

/**
 * E.1 — DPDP §11 self-export audit ledger. One row per user-initiated
 * "Download my data" request. Powers the 30-day rate-limit lookup +
 * compliance audit trail. See src/lib/types/dataExport.ts for the
 * document shape; the export ZIP itself is NEVER persisted.
 */
export const DataExportRequests: Collection<DataExportRequestDoc> =
	UserApplication.collection<DataExportRequestDoc>('dataExportRequests');

/**
 * E.3 — Active-session registry. One row per refresh-token issuance.
 * Powers the "Active devices" UI (list + revoke + revoke-others). The
 * refresh-token endpoint rejects refresh when the matching row's
 * revoked_at is set — natural-expiry revoke semantics per owner
 * decision 2026-05-30.
 */
export const Sessions: Collection<SessionDoc> =
	UserApplication.collection<SessionDoc>('sessions');

/**
 * F.5 — NPS + exit survey responses. Two survey types share one
 * collection; type='nps' carries a 0-10 score + nps_window; type='exit'
 * carries a reason enum + free text. Powers the admin satisfaction
 * dashboard (aggregates by score / reason) and prevents the NPS banner
 * from re-appearing within a window the user already answered.
 */
export const SurveyResponses: Collection<SurveyResponseDoc> =
	UserApplication.collection<SurveyResponseDoc>('surveyResponses');

/**
 * F.1 — Referral relationship ledger. One row per (referrer, referee)
 * pair created at signup. Powers the Refer & Earn stats endpoint and
 * the D.1 reward-credit hook (first paid sub → credit both DSAs).
 */
export const Referrals: Collection<ReferralDoc> =
	UserApplication.collection<ReferralDoc>('referrals');

// DA (Document Assessment) quota usage — one doc per DSA per month
export const MonthlyAssessmentUsage: Collection<MonthlyAssessmentUsageDoc> =
	UserApplication.collection<MonthlyAssessmentUsageDoc>('monthlyAssessmentUsage');

// Team Management + CRM Expansion
export const Teams: Collection<Team> = UserApplication.collection<Team>('teams');
export const Leads: Collection<Lead> = UserApplication.collection<Lead>('leads');
export const Sources: Collection<Source> = UserApplication.collection<Source>('sources');
export const CRMLenders: Collection<CRMLender> =
	UserApplication.collection<CRMLender>('crmLenders');

// Admin Dashboard — dedicated admin accounts + rule authoring
export const AdminUsers: Collection<AdminUser> =
	UserApplication.collection<AdminUser>('adminUsers');
export const LenderRuleArtifacts: Collection<RuleArtifactPair> =
	UserApplication.collection<RuleArtifactPair>('lenderRuleArtifacts');
export const LenderRuleFixtures: Collection<LenderRuleFixture> =
	UserApplication.collection<LenderRuleFixture>('lenderRuleFixtures');

// Policy Engine — Two-axis policy management system
export const Lenders: Collection<Lender> = UserApplication.collection<Lender>('lenders');
export const LenderProducts: Collection<LenderProduct> =
	UserApplication.collection<LenderProduct>('lenderProducts');
export const ProductVariations: Collection<ProductVariation> =
	UserApplication.collection<ProductVariation>('productVariations');
export const GeoScopes: Collection<GeoScope> = UserApplication.collection<GeoScope>('geoScopes');
export const PolicyRules: Collection<PolicyRule> =
	UserApplication.collection<PolicyRule>('policyRules');
export const PolicyVersions: Collection<PolicyVersion> =
	UserApplication.collection<PolicyVersion>('policyVersions');
export const PolicyEvidenceDocuments: Collection<PolicyEvidenceDocument> =
	UserApplication.collection<PolicyEvidenceDocument>('policyEvidenceDocuments');
export const RMSubmissions: Collection<RMSubmission> =
	UserApplication.collection<RMSubmission>('rmSubmissions');
export const ReviewComments: Collection<ReviewComment> =
	UserApplication.collection<ReviewComment>('reviewComments');
export const PolicyAuditLogs: Collection<PolicyAuditLog> =
	UserApplication.collection<PolicyAuditLog>('policyAuditLog');

// ── Settings ─────────────────────────────────────────────────────
export const ApiKeys: Collection<ApiKey> = UserApplication.collection<ApiKey>('apiKeys');
export const SystemConfigs: Collection<SystemConfig> =
	UserApplication.collection<SystemConfig>('systemConfigs');

// ── E2E Testing ─────────────────────────────────────────────────
export const E2eTestRuns: Collection<E2eTestRun> =
	UserApplication.collection<E2eTestRun>('e2eTestRuns');

// ── NBFC Deal Capabilities (crowdsourced) ───────────────────────
export const NbfcDealCapabilities = UserApplication.collection('nbfcDealCapabilities');

// ── NBFC Negative Areas (geographic exclusion zones) ────────────
export interface NbfcNegativeAreaDoc {
	lender_id: string;
	lender_name: string;
	/** Areas where this lender will NOT lend */
	negative_areas: Array<{
		state: string;
		cities?: string[]; // Empty = entire state excluded
		localities?: string[]; // Granular locality exclusions within cities
	}>;
	updated_at: Date;
	updated_by?: string;
}
export const NbfcNegativeAreas: Collection<NbfcNegativeAreaDoc> =
	UserApplication.collection<NbfcNegativeAreaDoc>('nbfcNegativeAreas');

// ── Policy Captures (RM structured policy forms) ────────────────
export const PolicyCaptures: Collection<PolicyCapture> =
	UserApplication.collection<PolicyCapture>('policyCaptures');

// ── Case Tasks (DSA task management per case) ──────────────────
import type { CaseTask } from '$lib/types/caseTask';
export const CaseTasks: Collection<CaseTask> = UserApplication.collection<CaseTask>('caseTasks');

// ── QA Scenarios (admin testing system) ────────────────────────
export const QaScenarios: Collection<QaScenario> =
	UserApplication.collection<QaScenario>('qaScenarios');

// ══════════════════════════════════════════════════════════════════
// PMS — Policy Management System collections
// ══════════════════════════════════════════════════════════════════

// RM ↔ Lender assignment records (OTP-verified, monthly renewal)
export const RmLenderAssignments: Collection<RmLenderAssignment> =
	UserApplication.collection<RmLenderAssignment>('rm_lender_assignments');

// PMS policy documents (lender_policies) — distinct from old policyDocuments collection
export const PmsLenderPolicies: Collection<PmsPolicyDocument> =
	UserApplication.collection<PmsPolicyDocument>('lender_policies');

// DSA-submitted policy change suggestions (TTL 30 days)
export const PolicySuggestions: Collection<PolicySuggestion> =
	UserApplication.collection<PolicySuggestion>('policy_suggestions');

// Unmappable clauses queued for future form key additions
export const PolicyFutureQueue: Collection<FutureEnhancementItem> =
	UserApplication.collection<FutureEnhancementItem>('policy_future_queue');

// ── DATA-3 — file-deletion-after-extraction audit + retention ──
// See docs/specs/DATA-3-FILE-DELETION-SPEC.md for the design.
// ArtifactDeletionLog: one row per deletion attempt (audit-log-first ordering;
// unique compound index on case_id + document_checklist_id + attempt_n).
// DocumentRetentionOverride: explicit DSA "do not auto-delete" tags
// (auto-expire after 365 days unless renewed).
import type {
	ArtifactDeletionLog,
	DocumentRetentionOverride
} from '$lib/server/data3/types';
export const ArtifactDeletionLogs: Collection<ArtifactDeletionLog> =
	UserApplication.collection<ArtifactDeletionLog>('artifactDeletionLogs');
export const DocumentRetentionOverrides: Collection<DocumentRetentionOverride> =
	UserApplication.collection<DocumentRetentionOverride>('documentRetentionOverrides');

// ── DATA-1 — lead-attribution vault + consent withdrawal log ────
// See docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md for the design.
// LeadAttributionVault: one row per closed case where customer consented
// to lead-routing. All fields are bucketed non-PII (see spec §2 / §11).
// ConsentWithdrawalLog: audit trail when a vault entry is deleted in
// response to a DPDP §13 erasure request (analogous to ArtifactDeletionLog).
import type {
	LeadAttributionVaultEntry,
	ConsentWithdrawalLogEntry
} from '$lib/server/data1/types';
export const LeadAttributionVault: Collection<LeadAttributionVaultEntry> =
	UserApplication.collection<LeadAttributionVaultEntry>('leadAttributionVault');
export const ConsentWithdrawalLogs: Collection<ConsentWithdrawalLogEntry> =
	UserApplication.collection<ConsentWithdrawalLogEntry>('consentWithdrawalLogs');

// ── DATA-2 — consented BT/DC outreach vault + revocation audit log ──
// See docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md for the design.
// OutreachVault: DSA-private record of past customers who consented to be
// contacted for BT / DC / top-up offers. `mobile` is encrypted via CSFLE
// deterministic (so the duplicate-check `findOne({dsa_id, mobile})` works),
// loan_profile stays plaintext (non-PII, used by the eligibility query).
// ConsentRevocationLog: append-only audit row written when a vault entry
// is hard-deleted after its 90-day grace period. Carries no PII.
import type {
	OutreachVaultEntry,
	ConsentRevocationLogEntry
} from '$lib/server/data2/types';
export const OutreachVault: Collection<OutreachVaultEntry> =
	UserApplication.collection<OutreachVaultEntry>('outreachVault');
export const ConsentRevocationLogs: Collection<ConsentRevocationLogEntry> =
	UserApplication.collection<ConsentRevocationLogEntry>('consentRevocationLogs');

// ── DATA-4 — de-identified analytics warehouse (SEPARATE database) ──
// See docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md for the design.
// `digitaldsa_analytics` is a second database on the SAME Atlas cluster,
// holding ONLY de-identified case data (no PII ever — spec §5). It is
// written exclusively by the nightly ETL job (Slice 5) and read by future
// analytics dashboards. The separation (different DB, different write path)
// is the structural privacy boundary — same precedent as BrokerData /
// SubmittedApplicationsDb above.
import type { AnalyticsCaseDoc, AnalyticsEtlRunDoc } from '$lib/server/analytics/types';
export const AnalyticsDb: Db = mongoClient.db('digitaldsa_analytics');
export const AnalyticsCases: Collection<AnalyticsCaseDoc> =
	AnalyticsDb.collection<AnalyticsCaseDoc>('analytics_cases');
// ETL run audit trail (spec §6 step 3 / §8) — also the incremental cursor source.
export const AnalyticsEtlRuns: Collection<AnalyticsEtlRunDoc> =
	AnalyticsDb.collection<AnalyticsEtlRunDoc>('analytics_etl_runs');

// ── Public Forms ────────────────────────────────────────────────
export const ContactSubmissions = UserApplication.collection('contactSubmissions');
export const NewsletterSubscriptions = UserApplication.collection('newsletterSubscriptions');

// ── Legacy DB (submittedApplications) ───────────────────────────
// Used by /api/appliedApplication (6 loan application pages)
export const SubmittedApplicationsDb: Db = mongoClient.db('submittedApplications');
export const AppliedApplications: Collection =
	SubmittedApplicationsDb.collection('appliedApplications');

// ── Dynamic collection helper ───────────────────────────────────
// Reuses existing connection — no new MongoClient created
export function getCollection(name: string): Collection {
	return UserApplication.collection(name);
}

// ══════════════════════════════════════════════════════════════════
// DATABASE INDEXES
// ══════════════════════════════════════════════════════════════════
// Ensures all required indexes exist for query performance.
// createIndex() is idempotent — safe to call on every startup.
// Runs once on module load (fire-and-forget).
// ══════════════════════════════════════════════════════════════════

async function ensureIndexes(): Promise<void> {
	try {
		// ── Drop old indexes that need to be replaced ──────────────
		// Drop old single-field case_id index to allow compound index
		await Cases.dropIndex('case_id_1').catch(() => {});

		// ── Applicant (userApplications) ──────────────────────────
		// Auth lookups by mobileNumber (primary login identifier)
		await Applicant.createIndex({ mobileNumber: 1 }, { unique: true });
		// Email lookups for verification, duplicate checks
		await Applicant.createIndex(
			{ email: 1 },
			{ sparse: true } // many users may not have email yet
		);
		// Activity tracking queries, admin inactive-user reports
		await Applicant.createIndex({ lastActiveAt: -1 }, { sparse: true });

		// ── DsaApplications ──────────────────────────────────────
		// Primary login: find DSA by mobile number
		await DsaApplications.createIndex({ mobileNumber: 1 }, { unique: true });
		// Activity tracking, admin reports
		await DsaApplications.createIndex({ lastActiveAt: -1 }, { sparse: true });
		// L-N2 (CODE-REVIEW-2026-05-31): RM home "suggested DSAs" matcher
		// queries by workingCity + onboardingCompleted + is_suspended. Without
		// this compound index the matcher does a 100-doc collection scan.
		// Today sub-50ms; with thousands of DSAs it would slow non-linearly.
		// Provision-from-start so the query plan is correct at any scale.
		await DsaApplications.createIndex(
			{ workingCity: 1, onboardingCompleted: 1, is_suspended: 1 },
			{ sparse: true }
		);

		// ── rmApplications ───────────────────────────────────────
		// Primary login: find RM by mobile number
		await rmApplications.createIndex({ mobileNumber: 1 }, { unique: true });
		// Activity tracking
		await rmApplications.createIndex({ lastActiveAt: -1 }, { sparse: true });

		// ── CaseIdCounters ──────────────────────────────────────
		// Atomic counter for sequential case ID generation (no race conditions)
		// Key format: "{dsaId}-{year}" e.g., "507f1f77bcf86cd799439011-2026"
		await CaseIdCounters.createIndex({ _id: 1 });

		// ── LeadIdCounters ──────────────────────────────────────
		// Atomic counter for sequential lead ID generation (no race conditions)
		// Key format: "{dsaId}-{year}" e.g., "507f1f77bcf86cd799439011-2026"
		await LeadIdCounters.createIndex({ _id: 1 });

		// ── Cases ────────────────────────────────────────────────
		// Unique case ID per DSA (allows same case_id across different DSAs)
		// Compound index: case_id is unique per dsa_id (not globally unique)
		await Cases.createIndex({ case_id: 1, dsa_id: 1 }, { unique: true });
		// DSA's case listing — the most common query pattern
		// Covers: all cases, active cases, stage filter, updated_at sort
		await Cases.createIndex({ dsa_id: 1, is_archived: 1, updated_at: -1 });
		// DSA + stage filter (pipeline view)
		await Cases.createIndex({ dsa_id: 1, stage: 1 });
		// DSA + loan type filter
		await Cases.createIndex({ dsa_id: 1, 'loan.type': 1 });
		// Sample data cleanup: { dsa_id, is_sample: true }
		await Cases.createIndex({ dsa_id: 1, is_sample: 1 }, { sparse: true });
		// Idempotency dedupe (2026-06-03) — supports the phase-1
		// dedupe lookup on (dsa_id, idempotency_key, created_at) inside
		// the silent-auto-retry window. Partial filter keeps the index
		// small (only stamped on new submissions from clients that
		// supply a key). Unique enforces a second line of defense if
		// two concurrent retries race past the application-level
		// `Cases.findOne(...)` check inside the endpoint — the second
		// insertOne hits E11000, which we already gracefully handle
		// in /api/evaluate-and-persist via the existing duplicate-key
		// guard. See /api/evaluate-and-persist/+server.ts step 5a.
		await Cases.createIndex(
			{ dsa_id: 1, idempotency_key: 1, created_at: -1 },
			{ unique: true, partialFilterExpression: { idempotency_key: { $exists: true } } }
		);

		// ── TimelineEvents ───────────────────────────────────────
		// Per-case timeline (most common: latest events for a case)
		await TimelineEvents.createIndex({ case_id: 1, created_at: -1 });
		// Multi-case timeline (batch loading for dashboard)
		// case_id + event_type covers CRM communication filtering
		await TimelineEvents.createIndex({ case_id: 1, event_type: 1 });

		// ── FormSnapshots ────────────────────────────────────────
		// Fetch latest snapshot for a case (case_id + version DESC)
		// Unique compound: one version per case
		await FormSnapshots.createIndex({ case_id: 1, version: -1 }, { unique: true });
		// Date index for efficient range queries (audit reports, cleanup scripts)
		// NOTE: Not a TTL index — "snapshots never deleted" invariant (AD-05).
		// Future archival should use a separate batch job, not auto-expiry.
		await FormSnapshots.createIndex({ created_at: 1 });

		// ── LenderResultsSnapshots ─────────────────────────────
		// Unique compound: one version per case (mirrors FormSnapshots pattern)
		await LenderResultsSnapshots.createIndex({ case_id: 1, version: -1 }, { unique: true });

		// ── RMContacts ───────────────────────────────────────────
		// Active contacts filtered by lender (most common search)
		await RMContacts.createIndex({ is_active: 1, lender_name: 1 });
		// Active contacts filtered by city
		await RMContacts.createIndex({ is_active: 1, city: 1 });
		// DSA's contributed contacts
		await RMContacts.createIndex({ contributed_by: 1, is_active: 1 });
		// Sorting by popularity (confirmation count)
		await RMContacts.createIndex({
			is_active: 1,
			confirmation_count: -1,
			last_confirmed_at: -1
		});

		// ── CommunicationThreads ─────────────────────────────────
		// Thread lookup: unique per case + DSA + RM combination
		await CommunicationThreads.createIndex({ case_id: 1, dsa_id: 1, rm_id: 1 }, { unique: true });
		// RM dashboard: all threads for an RM, sorted by recency
		await CommunicationThreads.createIndex({ rm_id: 1, status: 1, updated_at: -1 });

		// ── DisclaimerAcceptances ─────────────────────────────────
		// Lookup by user + disclaimer type
		await DisclaimerAcceptances.createIndex({ userId: 1, disclaimerType: 1 });

		// ── ShareLinks ───────────────────────────────────────────
		// Token validation (the primary lookup path)
		await ShareLinks.createIndex({ token: 1 }, { unique: true });
		// DSA's link listing for a specific application
		await ShareLinks.createIndex({
			applicationId: 1,
			createdBy: 1,
			createdAt: -1
		});

		// ── SyntheticProfiles ───────────────────────────────────
		// Unique profile ID
		await SyntheticProfiles.createIndex({ profile_id: 1 }, { unique: true });
		// Filtered listing by loan type + employment type
		await SyntheticProfiles.createIndex({ loan_type: 1, 'metadata.employment_type': 1 });
		// Recent profiles listing
		await SyntheticProfiles.createIndex({ created_at: -1 });

		// ── DeviceRegistry ───────────────────────────────────────
		// Unique per user + fingerprint
		await DeviceRegistry.createIndex({ userId: 1, fingerprint: 1 }, { unique: true });
		// Cross-user fingerprint lookup (abuse detection)
		await DeviceRegistry.createIndex({ fingerprint: 1 });
		// TTL: auto-delete records after 90 days of inactivity
		await DeviceRegistry.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

		// ── FormSessions (anti-scraping) ─────────────────────────
		// One active session per user+loanType (unique partial index)
		await FormSessions.createIndex(
			{ userId: 1, loanType: 1 },
			{ unique: true, partialFilterExpression: { isActive: true } }
		);
		// Session lookup by sessionId
		await FormSessions.createIndex({ sessionId: 1 }, { unique: true });
		// TTL: auto-delete inactive sessions after 24 hours
		await FormSessions.createIndex({ lastActivityAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
		// Count active sessions per user (for 5-session limit)
		await FormSessions.createIndex({ userId: 1, isActive: 1 });

		// ── TrustScores (anti-scraping) ────────────────────────
		// One score per user
		await TrustScores.createIndex({ userId: 1 }, { unique: true });
		// Watchlist queries (admin monitoring)
		await TrustScores.createIndex({ isWatchlisted: 1, score: 1 });

		// ── Deleted account archives — 30-day TTL auto-purge ─────
		// Drop old non-TTL indexes (direction -1, no TTL) if they exist
		await deletedUsers.dropIndex('deletedAt_-1').catch(() => {});
		await deletedDsa.dropIndex('deletedAt_-1').catch(() => {});
		await deletedRm.dropIndex('deletedAt_-1').catch(() => {});
		await deletedPc.dropIndex('deletedAt_-1').catch(() => {});
		// TTL indexes — MongoDB auto-purges documents 30 days after deletedAt
		await deletedUsers.createIndex({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
		await deletedDsa.createIndex({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
		await deletedRm.createIndex({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
		await deletedPc.createIndex({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

		// ── AccuracyRatings (RM Portal) ───────────────────────────
		// One rating per RM per case + lender app (prevent duplicates)
		await AccuracyRatings.createIndex({ rm_id: 1, case_id: 1, lender_app_id: 1 }, { unique: true });
		// Aggregation by category + lender (policy feedback dashboard)
		await AccuracyRatings.createIndex({ category: 1, lender_name: 1 });
		// RM's ratings listing
		await AccuracyRatings.createIndex({ rm_id: 1, created_at: -1 });

		// ── RMBroadcasts ──────────────────────────────────────────
		// RM's broadcast listing
		await RMBroadcasts.createIndex({ rm_id: 1, created_at: -1 });
		// DSA inbox: find broadcasts targeting a specific DSA
		await RMBroadcasts.createIndex({ target_dsa_ids: 1, created_at: -1 });

		// ── PolicyDocuments ───────────────────────────────────────
		// RM's policies by lender (latest version first)
		await PolicyDocuments.createIndex({ rm_id: 1, lender_name: 1, version: -1 });
		// DSA notification: find policies they haven't seen
		await PolicyDocuments.createIndex({ notified_dsa_ids: 1, created_at: -1 });

		// ── Teams ───────────────────────────────────────────────────
		// One team per DSA owner (unique)
		await Teams.createIndex({ owner_dsa_id: 1 }, { unique: true });
		// Find teams a user belongs to
		await Teams.createIndex({ 'members.user_id': 1 });
		// Invite code lookup (sparse — only invited members have codes)
		await Teams.createIndex({ 'members.invite_code': 1 }, { sparse: true });

		// ── DsaApplications — team_owner_id (sparse) ───────────────
		await DsaApplications.createIndex({ team_owner_id: 1 }, { sparse: true });

		// ── Leads ──────────────────────────────────────────────────
		// Unique lead ID
		await Leads.createIndex({ lead_id: 1 }, { unique: true });
		// DSA's lead listing (most common: active leads sorted by recency)
		await Leads.createIndex({ dsa_id: 1, is_archived: 1, updated_at: -1 });
		// DSA + status filter
		await Leads.createIndex({ dsa_id: 1, status: 1 });

		// ── Sources ────────────────────────────────────────────────
		// DSA's active sources
		await Sources.createIndex({ dsa_id: 1, is_active: 1 });
		// DSA + category filter
		await Sources.createIndex({ dsa_id: 1, category: 1 });

		// ── CRMLenders ─────────────────────────────────────────────
		// DSA's active lender relationships
		await CRMLenders.createIndex({ dsa_id: 1, is_active: 1 });
		// Unique per DSA + lender_name
		await CRMLenders.createIndex({ dsa_id: 1, lender_name: 1 }, { unique: true });

		// ── AdminUsers ──────────────────────────────────────────────
		// Unique phone number (primary login identifier, same as DSA/RM)
		await AdminUsers.createIndex({ mobileNumber: 1 }, { unique: true });

		// ── LenderRuleArtifacts ──────────────────────────────────────
		// Per-lender artifact listing (latest version first)
		await LenderRuleArtifacts.createIndex({ lender_id: 1, status: 1, version: -1 });
		// Pipeline status dashboard (count by status)
		await LenderRuleArtifacts.createIndex({ status: 1, created_at: -1 });
		// Unique artifact_id
		await LenderRuleArtifacts.createIndex({ artifact_id: 1 }, { unique: true });

		// ── LenderRuleFixtures ───────────────────────────────────────
		// Unique fixture_id
		await LenderRuleFixtures.createIndex({ fixture_id: 1 }, { unique: true });

		// ══════════════════════════════════════════════════════════════
		// POLICY ENGINE INDEXES
		// ══════════════════════════════════════════════════════════════

		// ── Lenders ─────────────────────────────────────────────────
		// Unique lender slug
		await Lenders.createIndex({ lender_id: 1 }, { unique: true });
		// Listing by status
		await Lenders.createIndex({ status: 1, lender_name: 1 });

		// ── LenderProducts ──────────────────────────────────────────
		// Unique composite product ID
		await LenderProducts.createIndex({ product_id: 1 }, { unique: true });
		// List products by lender
		await LenderProducts.createIndex({ lender_id: 1, is_active: 1 });

		// ── ProductVariations ────────────────────────────────────────
		// Unique composite variation ID
		await ProductVariations.createIndex({ variation_id: 1 }, { unique: true });
		// List variations by product
		await ProductVariations.createIndex({ product_id: 1, is_active: 1 });
		// List variations by lender (for cross-product queries)
		await ProductVariations.createIndex({ lender_id: 1 });

		// ── GeoScopes ────────────────────────────────────────────────
		// Unique geo scope ID
		await GeoScopes.createIndex({ geo_scope_id: 1 }, { unique: true });
		// Hierarchy traversal: find children of a parent
		await GeoScopes.createIndex({ parent_geo_scope_id: 1 });
		// Filter by level
		await GeoScopes.createIndex({ level: 1 });

		// ── PolicyRules ──────────────────────────────────────────────
		// Unique policy rule ID
		await PolicyRules.createIndex({ policy_rule_id: 1 }, { unique: true });
		// Resolution query: find all rules for a variation (+ cross-variation) at given geo scopes
		await PolicyRules.createIndex({ variation_id: 1, geo_scope_id: 1, is_active: 1 });
		// List rules by product (admin tree view)
		await PolicyRules.createIndex({ product_id: 1, is_active: 1 });
		// List rules by lender
		await PolicyRules.createIndex({ lender_id: 1 });
		// Cross-variation rules lookup (resolution needs these separately)
		await PolicyRules.createIndex({
			product_id: 1,
			is_cross_variation: 1,
			geo_scope_id: 1,
			is_active: 1
		});

		// ── PolicyVersions ───────────────────────────────────────────
		// Unique version per policy rule
		await PolicyVersions.createIndex({ policy_rule_id: 1, version_number: -1 }, { unique: true });
		// Find active versions (resolution hot path)
		await PolicyVersions.createIndex({ policy_rule_id: 1, status: 1 });
		// Approval queue: pending versions across all rules
		await PolicyVersions.createIndex({ status: 1, created_at: -1 });
		// Audit fix (RM dashboard audit 2026-05-30, B1): the RM home now
		// scopes the active-versions query by provenance.source_rm_id —
		// without this index it would do a full collection scan to find
		// recently-approved versions for the dashboard 'Recently Approved'
		// strip. Sparse because legacy versions may lack the provenance
		// field; only the source-RM-tagged ones need to be indexed.
		await PolicyVersions.createIndex(
			{ 'provenance.source_rm_id': 1, status: 1, updated_at: -1 },
			{ sparse: true }
		);

		// ── PolicyEvidenceDocuments ───────────────────────────────────
		// Lender's documents (most recent first)
		await PolicyEvidenceDocuments.createIndex({ lender_id: 1, created_at: -1 });
		// Unique document_id
		await PolicyEvidenceDocuments.createIndex({ document_id: 1 }, { unique: true });

		// ── RMSubmissions ────────────────────────────────────────────
		// RM's submission listing
		await RMSubmissions.createIndex({ rm_id: 1, created_at: -1 });
		// Audit fix (RM dashboard audit 2026-05-30): the home + submissions
		// list queries filter by rm_id + status and sort by updated_at; the
		// created_at index above doesn't cover the updated_at sort, forcing
		// an in-memory sort on large submission histories.
		await RMSubmissions.createIndex({ rm_id: 1, status: 1, updated_at: -1 });
		// Admin queue: pending submissions
		await RMSubmissions.createIndex({ status: 1, urgency: 1, created_at: -1 });
		// Unique submission_id
		await RMSubmissions.createIndex({ submission_id: 1 }, { unique: true });

		// ── ReviewComments ───────────────────────────────────────────
		// Comments on a specific target (version or submission)
		await ReviewComments.createIndex({ target_type: 1, target_id: 1, created_at: 1 });

		// ── PolicyAuditLogs ──────────────────────────────────────────
		// Audit trail per target
		await PolicyAuditLogs.createIndex({ target_type: 1, target_id: 1, created_at: -1 });
		// Actor history
		await PolicyAuditLogs.createIndex({ actor_id: 1, created_at: -1 });
		// TTL: auto-delete after 2 years
		await PolicyAuditLogs.createIndex(
			{ created_at: 1 },
			{ expireAfterSeconds: 2 * 365 * 24 * 60 * 60 }
		);

		// ── ApiKeys ──────────────────────────────────────────────────
		await ApiKeys.createIndex({ key_id: 1 }, { unique: true });
		await ApiKeys.createIndex({ provider: 1, is_active: 1 });

		// ── SystemConfigs ───────────────────────────────────────────
		await SystemConfigs.createIndex({ config_key: 1 }, { unique: true });

		// ── E2eTestRuns ──────────────────────────────────────────────
		await E2eTestRuns.createIndex({ run_id: 1 }, { unique: true });
		await E2eTestRuns.createIndex({ created_at: -1 });
		// TTL: auto-delete runs after 7 days
		await E2eTestRuns.createIndex({ created_at: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

		// ── PolicyCaptures ──────────────────────────────────────────────
		// Unique capture ID
		await PolicyCaptures.createIndex({ capture_id: 1 }, { unique: true });
		// RM's captures listing (drafts + submitted)
		await PolicyCaptures.createIndex({ rm_id: 1, status: 1, updated_at: -1 });
		// Lookup by lender + product (avoid duplicate captures)
		await PolicyCaptures.createIndex({ lender_id: 1, product_type: 1 });

		// ── ContactSubmissions ──────────────────────────────────────────
		await ContactSubmissions.createIndex({ created_at: -1 });

		// ── NewsletterSubscriptions ─────────────────────────────────────
		await NewsletterSubscriptions.createIndex({ email: 1 }, { unique: true });

		// ── NbfcDealCapabilities ─────────────────────────────────────────
		// Lookup: which NBFCs handle a given risk type in a city?
		await NbfcDealCapabilities.createIndex({ city: 1, riskType: 1 });
		// Audit: who contributed what?
		await NbfcDealCapabilities.createIndex({ contributedBy: 1 });

		// ── CaseTasks ──────────────────────────────────────────────────
		// Dashboard: my tasks across all cases
		await CaseTasks.createIndex({ dsa_id: 1, status: 1, due_date: 1 });
		// Case detail: tasks for a specific case
		await CaseTasks.createIndex({ case_id: 1, dsa_id: 1, status: 1 });

		// ── Notifications ─────────────────────────────────────────────
		// Bell icon query: user's unread notifications, newest first
		await Notifications.createIndex({ user_id: 1, read: 1, created_at: -1 });
		// Auto-cleanup: notifications expire after 90 days
		await Notifications.createIndex({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

		// ── Push Subscriptions ────────────────────────────────────────
		// Unique per user + browser endpoint (no duplicate subscriptions)
		await PushSubscriptions.createIndex(
			{ user_id: 1, 'subscription.endpoint': 1 },
			{ unique: true }
		);
		// Send query: all active subscriptions for a user
		await PushSubscriptions.createIndex({ user_id: 1, is_active: 1 });

		// ── QaScenarios ──────────────────────────────────────────
		// Primary listing: non-archived, sorted by creation date
		await QaScenarios.createIndex({ isArchived: 1, createdAt: -1 });
		// Filter by loan type (most common filter in the library view)
		await QaScenarios.createIndex({ 'meta.loanType': 1, isArchived: 1 });
		// Filter by employment type
		await QaScenarios.createIndex({ 'meta.employment': 1, isArchived: 1 });
		// Filter by last run result (find failing scenarios)
		await QaScenarios.createIndex({ lastRunResult: 1, isArchived: 1 });
		// Filter by tags (multikey — NRI, Low CIBIL, etc.)
		await QaScenarios.createIndex({ 'meta.tags': 1 });
		// Coverage map query: loan type × employment type combinations
		await QaScenarios.createIndex({ 'meta.loanType': 1, 'meta.employment': 1 });

		// ═══════════════════════════════════════════════════════════
		// PMS — Policy Management System indexes
		// ═══════════════════════════════════════════════════════════

		// ── RmLenderAssignments ──────────────────────────────────
		// Unique: one active assignment per RM per lender
		await RmLenderAssignments.createIndex({ rmUserId: 1, lenderId: 1 }, { unique: true });
		// Cron query: find assignments due for renewal
		await RmLenderAssignments.createIndex({ status: 1, nextVerificationDueBy: 1 });
		// Audit fix (RM dashboard audit 2026-05-30): home + policy library
		// page query is (rmUserId, status='active'). The unique index above
		// prefix-covers rmUserId but doesn't help the status filter; this
		// explicit (rmUserId, status) makes the policy KPI lookup index-only.
		await RmLenderAssignments.createIndex({ rmUserId: 1, status: 1 });

		// ── PmsLenderPolicies (lender_policies) ──────────────────
		// Status filter + sort — the most common admin/RM dashboard query
		await PmsLenderPolicies.createIndex({ lenderId: 1, loanProduct: 1, status: 1 });
		// Latest version per lender+product
		await PmsLenderPolicies.createIndex({ lenderId: 1, loanProduct: 1, version: -1 });
		// Cron promotion: find approved_scheduled docs whose validFrom has passed
		await PmsLenderPolicies.createIndex({ status: 1, scheduledPublishAt: 1 });

		// ── PolicySuggestions ─────────────────────────────────────
		// Deduplication: one suggestion per DSA per field per lender per 30-day TTL window.
		// `unique: true` is required for the catch(code === 11000) handler in
		// /api/pms/suggestions POST to fire — without it, duplicate documents are
		// silently accepted and the dedup contract does not hold. Partial filter
		// limits the constraint to documents with a string fieldPath, so general
		// (null-fieldPath) suggestions remain allowed.
		//
		// Migration note: an earlier version created this index with { sparse: true }
		// (no unique). MongoDB cannot recreate an existing index with different
		// options, so we drop the old non-unique variant first. If a deployment has
		// existing duplicate documents, the create will throw 11000 — operators must
		// dedupe manually before this index can be applied.
		try {
			await PolicySuggestions.dropIndex('lenderId_1_loanProduct_1_fieldPath_1_submittedBy_1');
		} catch {
			// Index doesn't exist (fresh DB) or has already been recreated — both fine.
		}
		await PolicySuggestions.createIndex(
			{ lenderId: 1, loanProduct: 1, fieldPath: 1, submittedBy: 1 },
			{
				unique: true,
				partialFilterExpression: { fieldPath: { $type: 'string' } }
			}
		);
		// TTL: auto-delete suggestions after 30 days
		await PolicySuggestions.createIndex(
			{ submittedAt: 1 },
			{ expireAfterSeconds: 30 * 24 * 60 * 60 }
		);

		// ── PolicyFutureQueue ─────────────────────────────────────
		await PolicyFutureQueue.createIndex({ status: 1, lenderIds: 1 });

		// ── MonthlyAssessmentUsage ────────────────────────────────
		await MonthlyAssessmentUsage.createIndex({ dsa_id: 1, year_month: 1 }, { unique: true });

		// ── D.1 BillingSubscriptions ──────────────────────────────
		// One subscription per DSA in v1 (enforced by unique index — if
		// a DSA needs to re-subscribe after cancelled/downgraded, we
		// update the existing doc rather than insert a new one).
		await BillingSubscriptions.createIndex({ dsa_id: 1 }, { unique: true });
		// Cron picks up rows by state + next_charge_at; this index
		// matches the §4 S3 query `state='active' AND next_charge_at <= now`.
		await BillingSubscriptions.createIndex({ state: 1, next_charge_at: 1 });
		// Cron picks up pending_mandate rows older than 24h; this matches
		// the §4 S2 pending-cleanup cron.
		await BillingSubscriptions.createIndex({ state: 1, updated_at: 1 });
		// Webhook dispatch looks up by mandate_token or pending_registration_id
		// (sparse because both are absent in not_subscribed state).
		await BillingSubscriptions.createIndex({ mandate_token: 1 }, { sparse: true });
		await BillingSubscriptions.createIndex(
			{ pending_registration_id: 1 },
			{ sparse: true }
		);

		// ── D.1 ProcessedWebhookEvents ────────────────────────────
		// _id IS the dedup key (provider_event_id). 18mo TTL per
		// critique P3-3 — supports DR replay scenarios that 90d would miss.
		// expireAfterSeconds: 18 months ≈ 47_304_000s
		await ProcessedWebhookEvents.createIndex(
			{ processed_at: 1 },
			{ expireAfterSeconds: 60 * 60 * 24 * 30 * 18 }
		);

		// ── D.1 S3 ChargeAttempts ─────────────────────────────────
		// (subscription_id, cycle_anchor) compound — general lookup index used
		// by the per-cycle idempotency probe. NOT unique on its own because
		// over time a single cycle accrues a `failed` row + a later
		// `succeeded` row (retries within the same cycle_anchor are legal).
		await ChargeAttempts.createIndex({ subscription_id: 1, cycle_anchor: 1 });
		// Partial unique on (subscription_id, cycle_anchor) WHERE status='pending'.
		// This is the atomic in-flight backstop for Pitfall #62 (race surfaced by
		// S4 smoke 2026-05-27): two simultaneous chargeEngine calls (cron +
		// retry-now, or two cron instances) both probe → both see no pending
		// row → both insert. The application-layer probe alone can't catch the
		// true concurrent case because both reads complete before either write.
		// MongoDB rejects the SECOND insertOne with E11000, and the engine
		// treats that as in-flight (skipped_already_charged outcome). Together
		// with the probe (which catches "B starts after A's insert"), this
		// closes the race for any timing.
		await ChargeAttempts.createIndex(
			{ subscription_id: 1, cycle_anchor: 1 },
			{
				unique: true,
				partialFilterExpression: { status: 'pending' },
				// Explicit name so Mongo doesn't auto-collide with the
				// non-unique general index above (same keys, different options
				// = different indexes, but Mongo identifies by name).
				name: 'pending_unique_subscription_cycle'
			}
		);
		// Stale-pending resume query: status='pending' AND created_at < now-30min.
		// Driven on every cron tick before the normal eligible-subs query.
		await ChargeAttempts.createIndex({ status: 1, created_at: 1 });
		// Operator dashboards / debugging — by DSA, newest first.
		await ChargeAttempts.createIndex({ dsa_id: 1, created_at: -1 });
		// Cross-reference by attempt_id (we send this as the Razorpay receipt).
		await ChargeAttempts.createIndex({ attempt_id: 1 }, { unique: true });

		// ── D.1 S3 BillingAuditLogs ───────────────────────────────
		// Read patterns: by subscription_id for forensic timeline; by
		// event_class+created_at for operator dashboards. No TTL — 6-year
		// retention enforced operationally per spec §11 Q1.
		await BillingAuditLogs.createIndex({ subscription_id: 1, created_at: -1 });
		await BillingAuditLogs.createIndex({ event_class: 1, created_at: -1 });
		await BillingAuditLogs.createIndex({ event_id: 1 }, { sparse: true });

		// ── D.1 S3 CronLocks ──────────────────────────────────────
		// name MUST be unique — that's the lock semantic. The `released_at`
		// + `expires_at` precondition in cronLock.acquireCronLock() makes
		// the upsert safe to attempt on every cron tick.
		await CronLocks.createIndex({ name: 1 }, { unique: true });
		// Sweep: a watchdog can clear truly-orphan locks where expires_at
		// is far in the past (cron crashed without releasing).
		await CronLocks.createIndex({ expires_at: 1 });

		// ── D.1 S7 ReconciliationRuns ─────────────────────────────
		// Admin list reads newest-first by run_date.
		await ReconciliationRuns.createIndex({ run_date: -1 });
		// Idempotency: the cron skips if a row for today's run_date already
		// exists. Unique enforces "one run per IST settlement day per provider".
		await ReconciliationRuns.createIndex({ run_date: 1, provider: 1 }, { unique: true });
		// Status-first index for the admin "show only days with drift" filter.
		await ReconciliationRuns.createIndex({ status: 1, run_date: -1 });

		// ── Free-trial abuse-defense blocklist (2026-05-28) ────────
		// Unique compound on (kind, hash): a single phone/PAN/GST can only
		// claim ONE trial across all DSAs. Eligibility check is an O(1)
		// lookup by this key. Uniqueness also defends the insert path —
		// a race between two webhook handlers can't double-record the
		// same identifier (second insert hits E11000 cleanly).
		await TrialIdentifierBlocklist.createIndex(
			{ identifier_kind: 1, identifier_hash: 1 },
			{ unique: true }
		);
		// Admin-side: "show me every trial this DSA has ever claimed."
		await TrialIdentifierBlocklist.createIndex({ dsa_id: 1, granted_at: -1 });

		// ── D.2 — GST Invoices (2026-05-28) ────────────────────────
		// One invoice per BillingTransaction — unique index enforces this at
		// the DB level so concurrent webhook+cron paths can't double-issue.
		await Invoices.createIndex({ billing_transaction_id: 1 }, { unique: true });
		// DSA's invoice list (paginated, newest-first).
		await Invoices.createIndex({ dsa_id: 1, issue_date: -1 });
		// (fy, invoice_seq) compound unique — defense-in-depth on gapless
		// numbering. If somehow two concurrent generations grabbed the same
		// seq from the counter (shouldn't happen but...), the second insert
		// hits E11000 and the engine retries with a fresh seq.
		await Invoices.createIndex({ fy: 1, invoice_seq: 1 }, { unique: true });

		// ── DataExportRequests (E.1 — DPDP §11 self-export) ────────
		// Rate-limit lookup: most-recent request for this user. The unique
		// requested_at sort + user_id filter is sub-millisecond with this
		// compound index (selectivity carried by user_id; sort served by
		// the desc direction on requested_at).
		await DataExportRequests.createIndex({ user_id: 1, requested_at: -1 });

		// ── Sessions (E.3 — Active sessions UI) ────────────────────
		// Defensive: an earlier schema (long pre-SEC-10) left a unique
		// index on a bare `id` field that no current code path writes.
		// Every recordSession() insert picks up `id: null` implicitly,
		// hits the unique-on-null constraint, fails with E11000, and
		// falls through to the warn-and-proceed branch — silently
		// leaving Sessions empty. That bricks SEC-10 conflict detection
		// + the kicked-side poll (both need rows to exist). Discovered
		// 2026-06-04 during SEC-10 Commit C smoke. dropIndex is
		// idempotent here: if `id_1` was already dropped (manual fix
		// or a prior boot of this code path), dropIndex throws
		// IndexNotFound which we swallow. Same pattern for the five
		// other orphan indexes from old session schemas — none of
		// those are UNIQUE so they don't crash inserts, but they
		// burn write IO + disk + the visible index list.
		const STALE_SESSION_INDEXES = [
			'id_1',
			'userId_1',
			'deviceId_1',
			'expiresAt_1',
			'isActive_1',
			'lastAccessedAt_1'
		];
		for (const indexName of STALE_SESSION_INDEXES) {
			try {
				await Sessions.dropIndex(indexName);
				logger.info(
					{ collection: 'sessions', index: indexName },
					'[ensureIndexes] dropped orphan Sessions index'
				);
			} catch (err) {
				const e = err as { codeName?: string; code?: number };
				// IndexNotFound (code 27) is the expected steady-state after
				// the first boot that cleaned up — silently ignore.
				if (e.codeName !== 'IndexNotFound' && e.code !== 27) {
					logger.warn(
						{ err, collection: 'sessions', index: indexName },
						'[ensureIndexes] orphan-index drop failed (non-fatal)'
					);
				}
			}
		}
		// session_id unique — one row per refresh-token issuance, and
		// the refresh path looks rows up by this id.
		await Sessions.createIndex({ session_id: 1 }, { unique: true });
		// Listing query: most-recently-active sessions for a user.
		await Sessions.createIndex({ user_id: 1, last_seen_at: -1 });
		// Cleanup query (future): revoked sessions older than 90 days
		// can be hard-deleted. Index supports that scan without a sort.
		await Sessions.createIndex(
			{ revoked_at: 1, last_seen_at: 1 },
			{ partialFilterExpression: { revoked_at: { $exists: true } } }
		);

		// ── SurveyResponses (F.5 — NPS + exit surveys) ──────────────
		// "Did this user already answer NPS in this window" lookup +
		// admin aggregation queries.
		await SurveyResponses.createIndex({ user_id: 1, type: 1, created_at: -1 });
		// Admin "all NPS in last 30 days" / "exit reasons this month" queries.
		await SurveyResponses.createIndex({ type: 1, created_at: -1 });

		// ── Referrals (F.1 — DSA-acquires-DSA growth loop) ─────────
		// "What did this referrer bring in" stats query.
		await Referrals.createIndex({ referrer_dsa_id: 1, joined_at: -1 });
		// "Is this referee tracked" + reward-credit idempotency check.
		await Referrals.createIndex({ referred_dsa_id: 1 }, { unique: true });
		// Code lookup (rare — main lookup is via the unique index on
		// DsaApplications.referral_code, but useful for forensic queries).
		await Referrals.createIndex({ code: 1 });
		// Pending-reward sweep (future operational tooling).
		await Referrals.createIndex(
			{ reward_status: 1, joined_at: 1 },
			{ partialFilterExpression: { reward_status: 'pending' } }
		);

		// ── Dsa.referral_code (F.1) ────────────────────────────────
		// Unique partial index — only enforces uniqueness on DSAs that
		// have a code (excludes legacy rows pre-F.1).
		await DsaApplications.createIndex(
			{ referral_code: 1 },
			{ unique: true, partialFilterExpression: { referral_code: { $exists: true } } }
		);

		// InvoiceCounters has only the _id ('fy_YYYY-YY') as its key, which
		// is the default index. No additional indexes needed.

		// ── DATA-3 — ArtifactDeletionLogs ─────────────────────────
		// Compound unique enforces idempotency: same (case, doc, attempt)
		// can only be written once. The auditLog helper handles the
		// duplicate-key error as "already in flight, skip".
		await ArtifactDeletionLogs.createIndex(
			{ case_id: 1, document_checklist_id: 1, attempt_n: 1 },
			{ unique: true }
		);
		// Sweep job picks up in-flight rows older than a threshold for
		// resume-after-crash recovery.
		await ArtifactDeletionLogs.createIndex({ status: 1, started_at: 1 });
		// Forensic lookup by file_id.
		await ArtifactDeletionLogs.createIndex({ file_id: 1 });

		// ── DATA-3 — DocumentRetentionOverrides ───────────────────
		// One active override per (case, document). Re-tagging refreshes
		// last_renewed_at + expires_at via $set, not a new row.
		await DocumentRetentionOverrides.createIndex(
			{ case_id: 1, document_checklist_id: 1 },
			{ unique: true }
		);
		// Sweep clears expired overrides — query by (is_active, expires_at).
		await DocumentRetentionOverrides.createIndex({ is_active: 1, expires_at: 1 });

		// ── DATA-1 — LeadAttributionVault ──────────────────────────
		// Spec §3 — five indexes:
		//   - source_case_id unique: one vault entry per case maximum.
		//     The unique constraint is the dedup mechanism — POST is
		//     idempotent and relies on this index to no-op on duplicates.
		//   - (source_dsa_id, closed_quarter DESC): DSA transparency view
		//     (GET /api/dsa/lead-vault) — list a DSA's own entries newest first.
		//   - (loan_type, property_pincode, property_locality_bucket):
		//     core routing match for Pass 1 + Pass 2 of the three-pass query.
		//   - closed_quarter DESC: recency scan for Pass 3 (loan_type only).
		await LeadAttributionVault.createIndex({ source_case_id: 1 }, { unique: true });
		await LeadAttributionVault.createIndex({ source_dsa_id: 1, closed_quarter: -1 });
		await LeadAttributionVault.createIndex({
			loan_type: 1,
			property_pincode: 1,
			property_locality_bucket: 1
		});
		await LeadAttributionVault.createIndex({ closed_quarter: -1 });

		// ── DATA-1 — ConsentWithdrawalLogs ─────────────────────────
		// Lookup by source_case_id to confirm an erasure happened. The
		// audit trail is append-only — no compound unique because the
		// same case could in principle have multiple consent docs over
		// time (re-consent + re-withdraw); each withdrawal gets its own row.
		await ConsentWithdrawalLogs.createIndex({ source_case_id: 1 });
		await ConsentWithdrawalLogs.createIndex({ withdrawn_at: -1 });

		// ── DATA-2 — OutreachVault ─────────────────────────────────
		// Spec §4. Six indexes:
		//   - (dsa_id, _id): every DSA-scoped read filters on dsa_id. BOLA anchor.
		//   - (dsa_id, mobile) UNIQUE-ish: "have I already vaulted this mobile"
		//     duplicate check at save time. NOT unique because revoked entries
		//     can coexist with a new active entry (the dup-mobile guard at
		//     POST-time checks for consent_status='active' specifically).
		//   - (dsa_id, consent_status, sanctioned_roi): eligibility query —
		//     filter by status='active' + ROI threshold, sort by ROI gap.
		//   - revocation_token UNIQUE: public self-revoke endpoint looks up by token.
		//   - (consent_status, grace_period_ends_at): cron sweep finds entries
		//     past their grace period for hard-delete.
		//   - case_id: cross-reference (e.g. DPDP erasure cascade from a case).
		await OutreachVault.createIndex({ dsa_id: 1, _id: 1 });
		await OutreachVault.createIndex({ dsa_id: 1, mobile: 1 });
		await OutreachVault.createIndex({
			dsa_id: 1,
			consent_status: 1,
			'loan_profile.sanctioned_roi': -1
		});
		await OutreachVault.createIndex({ revocation_token: 1 }, { unique: true });
		await OutreachVault.createIndex(
			{ consent_status: 1, grace_period_ends_at: 1 },
			{ sparse: true }
		);
		await OutreachVault.createIndex({ case_id: 1 }, { sparse: true });

		// ── DATA-2 — ConsentRevocationLogs ─────────────────────────
		// Audit trail. Lookup by vault_entry_id to confirm a specific
		// entry was hard-deleted. Recency index for compliance reports.
		await ConsentRevocationLogs.createIndex({ vault_entry_id: 1 });
		await ConsentRevocationLogs.createIndex({ dsa_id: 1, revoked_at: -1 });
		await ConsentRevocationLogs.createIndex({ revoked_at: -1 });

		// ── DATA-4 — AnalyticsCases ────────────────────────────────
		// Spec §4 — seven indexes beyond the default `_id`. Note this
		// collection lives in the separate `digitaldsa_analytics` database;
		// createIndex on a collection in another DB on the same client works
		// the same way.
		//   - case_id UNIQUE: one analytics row per case maximum. This is the
		//     ETL upsert key — re-running the job is a safe no-op (spec §6).
		//   - person_id: "how many unique borrowers" counts (the whole reason
		//     person_id exists).
		//   - (dsa_id, opened_at DESC): DSA-specific rollups.
		//   - opened_at DESC: "cases opened in the last 30 days" time series.
		//   - selected_lender_id: lender market-share queries.
		//   - (borrower_state, borrower_city): regional aggregations.
		//   - borrower_income_bracket: income-segment queries.
		await AnalyticsCases.createIndex({ case_id: 1 }, { unique: true });
		await AnalyticsCases.createIndex({ person_id: 1 });
		await AnalyticsCases.createIndex({ dsa_id: 1, opened_at: -1 });
		await AnalyticsCases.createIndex({ opened_at: -1 });
		await AnalyticsCases.createIndex({ selected_lender_id: 1 }, { sparse: true });
		await AnalyticsCases.createIndex({ borrower_state: 1, borrower_city: 1 });
		await AnalyticsCases.createIndex({ borrower_income_bracket: 1 }, { sparse: true });

		// ── DATA-4 — AnalyticsEtlRuns ──────────────────────────────
		//   - run_id unique: one audit row per run.
		//   - (finished_at, started_at DESC): the ETL reads the most recent
		//     FINISHED run's started_at as its incremental cursor.
		await AnalyticsEtlRuns.createIndex({ run_id: 1 }, { unique: true });
		await AnalyticsEtlRuns.createIndex({ finished_at: 1, started_at: -1 });

		logger.info('MongoDB indexes ensured');
	} catch (error) {
		// Non-fatal: indexes may already exist or collection may not yet exist.
		// Log warning but don't crash the app.
		logger.warn({ err: error }, 'MongoDB index creation warning');
	}
}

// Run on module load (fire-and-forget, idempotent)
ensureIndexes();
