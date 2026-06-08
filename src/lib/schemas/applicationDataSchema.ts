import { z } from 'zod';

export const applicationDataSchema = z
	.object({
		loanType: z.string().default(''),
		purpose: z.string().optional(),

		applicants: z
			.array(
				z.object({
					details: z.object({
						name: z.string().min(1),
						age: z.number().int().positive(),
						cibilScore: z.number().min(300).max(900),
						income: z.number().min(0),
						employmentType: z.enum(['salaried', 'self-employed', 'student', 'retired'])
					}),
					documents: z
						.object({
							pan: z.string().length(10),
							aadhaar: z.string().length(12),
							proofTypesSubmitted: z.array(z.string()).optional(),
							hasSurrogateIncomeLogicUsed: z.boolean().optional()
						})
						.partial()
				})
			)
			.optional(),

		property: z
			.object({
				city: z.string(),
				type: z.string(),
				cost: z.number().positive(),
				coOwned: z.boolean().optional(),
				ownershipType: z.enum(['single', 'joint', 'inherited']).optional(),
				landAreaSqFt: z.number().optional(),
				builtUpAreaSqFt: z.number().optional(),
				approvalAuthority: z.string().optional(),
				registrationStatus: z.enum(['registered', 'under-process', 'not-registered']).optional(),
				isAgriculturalLand: z.boolean().optional(),
				locationPinCode: z.string().optional(),
				propertyTypeDetail: z
					.enum(['new', 'resale', 'under-construction', 'plot', 'plot+construction'])
					.optional()
			})
			.optional(),

		flags: z.record(z.string(), z.boolean()).optional(),

		documentProfile: z
			.object({
				hasPAN: z.boolean().optional(),
				hasAadhaar: z.boolean().optional(),
				hasSalarySlip: z.boolean().optional(),
				hasITR: z.boolean().optional(),
				hasBankStatement: z.boolean().optional(),
				hasPropertyDocs: z.boolean().optional(),
				eKYCStatus: z.enum(['pending', 'verified', 'failed']).optional()
			})
			.optional(),

		loanHistory: z
			.object({
				hasPastRejections: z.boolean().optional(),
				pastLenders: z.array(z.string()).optional(),
				lastAppliedAmount: z.number().optional(),
				lastApprovedAmount: z.number().optional(),
				lastLoanStatus: z.enum(['approved', 'rejected', 'disbursed', 'cancelled']).optional()
			})
			.optional(),

		preferences: z
			.object({
				preferredBanks: z.array(z.string()).optional(),
				excludeBanks: z.array(z.string()).optional(),
				minTenure: z.number().optional(),
				maxInterestRate: z.number().optional(),
				noProcessingFeePreferred: z.boolean().optional(),
				schemesToSkip: z.array(z.string()).optional()
			})
			.optional(),

		userMetadata: z
			.object({
				preferredLanguage: z.string().optional(),
				sessionStartTime: z.string().optional(),
				sessionEndTime: z.string().optional(),
				intentConfidenceScore: z.number().optional(),
				selfDeclaredLoanUrgency: z.enum(['high', 'medium', 'low']).optional()
			})
			.optional(),

		aiInsights: z
			.object({
				cibilAnalysis: z.string().optional(),
				riskFlagsGenerated: z.array(z.string()).optional(),
				recommendedSchemes: z.array(z.string()).optional(),
				rejectionReasons: z.array(z.string()).optional()
			})
			.optional(),

		riskFlags: z
			.object({
				missingCriticalDocs: z.boolean().optional(),
				incomeMismatch: z.boolean().optional(),
				inconsistentAnswers: z.boolean().optional(),
				AIConfidenceLow: z.boolean().optional(),
				highFraudRiskZone: z.boolean().optional(),
				highDTIRatio: z.boolean().optional()
			})
			.optional(),

		derivedMetrics: z
			.object({
				foir: z.number().optional(),
				foirGroupVsBankMaxAllowed: z.record(z.string(), z.number()).optional(),
				totalFOIRIndividual: z.number().optional(),
				totalFOIRGroup: z.number().optional(),
				netIncomePerApplicant: z.array(z.number()).optional(),
				combinedNetIncome: z.number().optional(),
				combinedExistingEMIs: z.number().optional(),
				calculatedLTV: z.number().optional(),
				totalCreditExposure: z.number().optional(),
				discretionScore: z.number().optional(),
				confidenceScore: z.number().optional(),
				proxyCreditRiskScore: z.number().optional(),
				relationshipScore: z.number().optional(),
				probabilityOfApproval: z.number().optional(),
				lowestCibilScore: z.number().min(300).max(900).optional()
			})
			.optional(),

		internalStatus: z
			.object({
				status: z
					.enum([
						'initiated',
						'incomplete',
						'submitted',
						'processing',
						'approved_simulated',
						'conditional_simulated',
						'rejected_simulated',
						'bank_approved',
						'bank_rejected',
						'verified'
					])
					.optional(),
				lastUpdated: z.string().optional(),
				processedBy: z.string().optional(),
				reviewByHuman: z.boolean().optional(),
				verificationDetails: z
					.object({
						incomeVerified: z.boolean().optional(),
						propertyVerified: z.boolean().optional(),
						documentsVerified: z.boolean().optional(),
						cibilVerified: z.boolean().optional()
					})
					.optional(),
				rejectionReasons: z.array(z.string()).optional()
			})
			.optional()
	})
	.catchall(z.any());

export type ApplicationData = z.infer<typeof applicationDataSchema>;
