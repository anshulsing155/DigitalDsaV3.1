/**
 * English Translations — Default language (baseline)
 *
 * Every key that exists in the system MUST be defined here.
 * Other languages fall back to English for missing keys.
 *
 * Style: Conversational, simple English. Not legal jargon.
 */

export const en = {
	// ── Common UI ──────────────────────────────────────────────
	'common.next': 'Next →',
	'common.back': '← Back',
	'common.skip': 'Skip',
	'common.submit': 'Submit',
	'common.cancel': 'Cancel',
	'common.save': 'Save',
	'common.done': 'Done',
	'common.close': 'Close',
	'common.loading': 'Loading...',
	'common.error': 'Something went wrong',
	'common.retry': 'Try again',
	'common.yes': 'Yes',
	'common.no': 'No',
	'common.ok': 'OK',
	'common.search': 'Search',
	'common.filter': 'Filter',
	'common.clear': 'Clear',
	'common.delete': 'Delete',
	'common.edit': 'Edit',
	'common.view': 'View',
	'common.download': 'Download',
	'common.upload': 'Upload',
	'common.share': 'Share',
	'common.copy': 'Copy',
	'common.copied': 'Copied!',

	// ── Disclaimers (AD-11) ───────────────────────────────────

	// 1. RM Onboarding Acceptance
	'disclaimer.rm_onboarding_title': 'Before we begin',
	'disclaimer.rm_onboarding_body':
		'This platform is just a helper tool — it makes coordination between DSAs and RMs smoother. ' +
		"Nothing shared here is legally binding. The final decision is always the lender's. " +
		'Mistakes and delays can happen — DSAs should always verify through official channels. ' +
		'Neither we nor you (as RM) are liable for any miscommunication.',
	'disclaimer.rm_onboarding_checkbox': 'I have read and understood this',

	// 2. Per-Rating Disclaimer
	'disclaimer.rating_notice':
		"This rating is only to improve the platform. It won't affect any DSA's application. " +
		"Your rating is anonymous — the DSA won't see your name.",

	// 3. Broadcast Footer (server-enforced)
	'disclaimer.broadcast_footer':
		'⚠️ This information is shared by the RM based on their understanding. ' +
		'The platform does not guarantee it. Please confirm through official channels.',

	// 4. DSA-Side RM Content Tags
	'disclaimer.rm_content_tag': 'Info from RM',
	'disclaimer.rm_content_notice': 'Not verified by platform — confirm with your lender',

	// 5. Eligibility Results
	'disclaimer.eligibility_result':
		"This is just an estimate, not final. The lender's own policy may differ. " +
		'Talk to the RM before submitting the file.',

	// 6. File Preview (PDF footers)
	'disclaimer.pdf_review_footer':
		'This is a preliminary assessment — PII (name, PAN, Aadhaar) is intentionally excluded. The final file will be different.',
	'disclaimer.pdf_submission_footer':
		'The data in this file is provided by the DSA. The platform has not verified it.',

	// 7. Platform ToS
	'disclaimer.tos_summary_title': "What's the real deal?",
	'disclaimer.tos_updated_modal': 'Terms have been updated',

	// ── RM Value Proposition Screens (AD-12) ──────────────────

	// Screen 1: What will this platform do for you?
	'rm_value.screen1_title': 'What will this platform do for you?',
	'rm_value.more_dsas_title': 'Connect with more DSAs',
	'rm_value.more_dsas_desc':
		'Connect directly with active DSAs in your area — no introductions needed. The system will match you automatically.',
	'rm_value.quality_leads_title': 'Identify quality leads',
	'rm_value.quality_leads_desc':
		"See every DSA's file quality, response time, and track record. Make decisions based on data, not guesswork.",
	'rm_value.daily_manage_title': 'Manage daily work',
	'rm_value.daily_manage_desc':
		'Pending files, queries, follow-ups — all in one place. Think of it as your unofficial todo list that helps you earn more incentives.',
	'rm_value.less_effort_title': 'Less effort, more output',
	'rm_value.less_effort_desc':
		'Stop calling DSAs for status updates. Everything is visible on the system — one click away.',
	'rm_value.policy_updates_title': 'Policy updates in one place',
	'rm_value.policy_updates_desc':
		"Upload your bank's new policy once — it reaches all DSAs at once. No more sending to 50 WhatsApp groups.",
	'rm_value.async_title': 'Asynchronous coordination',
	'rm_value.async_desc':
		"DSA doesn't need to call 10 times, RM doesn't need to pick up 10 times. Raise a query, respond when you have time. Everything is logged.",

	// Screen 2: The money talk
	'rm_value.screen2_title': "Let's talk money",
	'rm_value.more_files_title': 'More files = more incentive',
	'rm_value.more_files_desc':
		'More DSAs connected = more files coming in = more logins = more incentive. Simple math.',
	'rm_value.conversion_title': 'Better conversion rate',
	'rm_value.conversion_desc':
		'The system pre-checks if a file is eligible or not. The files that reach you will be worth processing — fewer rejections, more sanctions.',
	'rm_value.time_money_title': 'Time = Money',
	'rm_value.time_money_desc':
		'The time you spend on phone calls, WhatsApp, follow-ups — that gets saved. Use that time to process more files.',
	'rm_value.business_safe_title': "Everyone's business is safe",
	'rm_value.business_safe_desc':
		"The platform doesn't steal anyone's customers. DSA's customer stays with the DSA. Your network stays yours. We just make coordination smoother.",
	'rm_value.performance_title': 'Performance data ready',
	'rm_value.performance_desc':
		'Your response time, sanction rate — everything is tracked. When appraisal comes, data is ready.',
	'rm_value.free_title': 'Completely free for RMs',
	'rm_value.free_desc':
		'No subscription, no hidden charges. Your time is the investment, not your money.',
	'rm_value.seasonal_title': 'Seasonal push in one click',
	'rm_value.seasonal_desc':
		'Quarter end, target not met? Send one broadcast — "Special rate for salaried, 3 days only" — reaches all DSAs at once.',

	// Screen 3: What this platform is NOT (trust builder)
	'rm_value.screen3_title': 'What this platform is NOT',
	'rm_value.not_official_title': 'This is not an official system',
	'rm_value.not_official_desc':
		"This is not the lender's system. It's an independent helper tool — like a WhatsApp group, but organized.",
	'rm_value.no_legal_title': 'No legal binding',
	'rm_value.no_legal_desc':
		"Whatever you share here — rating, broadcast, policy update — it's just information. No legal responsibility.",
	'rm_value.no_customer_data_title': 'Customer data is not visible',
	'rm_value.no_customer_data_desc':
		"The DSA's file won't show customer name, PAN, Aadhaar — nothing is visible unless the DSA chooses to share. Privacy is system-enforced.",
	'rm_value.network_safe_title': "Your network won't be stolen",
	'rm_value.network_safe_desc':
		'No other RM can approach your DSAs through the platform. Your network is only yours.',
	'rm_value.not_magic_title': 'This is not magic',
	'rm_value.not_magic_desc':
		"It's a tool. You'll need to use it — but if you use it, you'll see results. Think of it like a diary, just digital and organized.",

	// Screen 4: How it works (3 steps)
	'rm_value.screen4_title': 'How does it work?',
	'rm_value.step1_title': 'Create your profile',
	'rm_value.step1_desc': "2 minutes — name, bank, branch, loan types. That's it.",
	'rm_value.step2_title': 'DSAs will connect',
	'rm_value.step2_desc': 'The system will automatically show DSAs in your area/bank. You accept.',
	'rm_value.step3_title': 'Manage files',
	'rm_value.step3_desc':
		'Files will come in, review them, rate them, raise queries — all from one dashboard.',
	'rm_value.cta': "Let's get started →",

	// Additional benefits
	'rm_value.informal_dsas_title': 'Discover informal DSAs',
	'rm_value.informal_dsas_desc':
		"Many DSAs who aren't formally under any corporate code but do great work — discover them. Hidden talent pool.",
	'rm_value.peer_proof': '{{dsaCount}} DSAs and {{rmCount}} RMs are already on this platform.',

	// ── Auth / Login ─────────────────────────────────────────────
	'auth.welcome_demo': 'Welcome to the demo! Explore all features freely.',
	'auth.demo_unavailable': 'Demo unavailable right now. Please try again.',
	'auth.ip_blocked': 'IP blocked. Try again in 24 hours or contact us.',
	'auth.otp_wait': 'Please wait before requesting another OTP',
	'auth.otp_sent': 'OTP sent successfully',
	'auth.otp_failed': 'Failed to send OTP',
	'auth.otp_invalid': 'Please enter a valid 4-digit OTP',
	'auth.otp_no_session': 'No active OTP session. Please request an OTP first.',
	'auth.mobile_required': 'Mobile number is required',
	'auth.ip_blocked_long':
		'Your IP has been temporarily blocked. Please try again after 24 hours or contact support.',

	// ── Errors ───────────────────────────────────────────────────
	'error.not_found': 'The page you are looking for does not exist.',
	'error.server': 'An unexpected server error occurred.',
	'error.forbidden': 'You do not have permission to access this page.',
	'error.unauthorized': 'You must be logged in to access this page.',
	'error.rate_limit': 'Too many requests. Please try again later.',
	'error.generic': 'Something went wrong.',
	'error.url_missing': 'The URL you requested does not exist or may have been moved.',
	'error.go_home': 'Go Home',
	'error.try_url': 'Try checking the URL or explore our site map from the homepage.',
	'error.check_permissions': "Please ensure you're logged in with the correct permissions.",
	'error.rate_limit_wait': 'Too many requests. Please wait a moment and try again.',
	'error.team_notified': 'Our team has been notified about this issue.',
	'error.path': 'Path:',
	'error.network': 'Network error. Please check your connection and try again.',

	// ── Dashboard ────────────────────────────────────────────────
	'dashboard.welcome': 'Welcome, {{name}}',
	'dashboard.active_cases': 'Active Cases',
	'dashboard.active_case': 'Active Case',
	'dashboard.files_submitted': 'Files Submitted',
	'dashboard.sanctioned': 'Sanctioned',
	'dashboard.avg_processing': 'Avg. Processing',
	'dashboard.of_total': 'of {{total}} total',
	'dashboard.no_cases_yet': 'No cases yet',
	'dashboard.this_month': 'This month',
	'dashboard.amount_value': '{{amount}} value',
	'dashboard.avg_to_sanction': 'Avg. to sanction',
	'dashboard.no_data_yet': 'No data yet',
	'dashboard.quick_actions': 'Quick Actions',
	'dashboard.new_case': 'New Case',
	'dashboard.my_cases': 'My Cases',
	'dashboard.rm_contacts': 'RM Contacts',
	'dashboard.communicate': 'Communicate',
	'dashboard.soon': 'SOON',
	'dashboard.recent_activity': 'Recent Activity',
	'dashboard.view_all_activity': 'View All Activity',
	'dashboard.case_pipeline': 'Case Pipeline',
	'dashboard.active_count': '{{count}} active',
	'dashboard.no_active_pipeline': 'No active cases in pipeline',
	'dashboard.needs_attention': 'Needs Attention',
	'dashboard.all_clear': 'All clear!',
	'dashboard.no_attention_needed': 'No cases need your attention right now',
	'dashboard.more_attention': '+{{count}} more items needing attention',
	'dashboard.recent_cases': 'Recent Cases',
	'dashboard.create_first_case': 'Create your first case to get started',
	'dashboard.view_all_cases': 'View All {{count}} Cases',
	'dashboard.view_all': 'View All Cases',
	'dashboard.amount_tbd': 'Amount TBD',

	// Dashboard — empty state
	'dashboard.empty_title': 'Your Dashboard is Ready',
	'dashboard.empty_desc':
		'Create your first case to start tracking loan applications, managing documents, and connecting with RMs. Your dashboard will come alive with data.',
	'dashboard.empty_cta': 'Create Your First Case',

	// Dashboard — banners
	'dashboard.profile_banner':
		'Complete your **business profile** to unlock personalized recommendations.',
	'dashboard.profile_later': 'Later',
	'dashboard.profile_setup': 'Set Up Profile',
	'dashboard.sample_first_case':
		"You've created your first case! Would you like to **clear sample data** from your dashboard?",
	'dashboard.keep_samples': 'Keep Samples',
	'dashboard.clear_samples': 'Clear Samples',
	'dashboard.clearing': 'Clearing...',
	'dashboard.clear_failed': 'Failed to clear sample data. Please try again.',
	'dashboard.sample_banner':
		"You're viewing **sample data** to help you understand the dashboard. Click dismiss to clear.",
	'dashboard.dismiss': 'Dismiss',

	// Dashboard — RM contacts card
	'dashboard.no_rm_contacts': 'No RM contacts yet',
	'dashboard.add_rm_hint': 'Add RM contacts when you submit cases',
	'dashboard.view_all_rm': 'View All RM Contacts',

	// Dashboard — attention types
	'dashboard.attention_query': 'Open Query',
	'dashboard.attention_expiring': 'Expiring Doc',
	'dashboard.attention_stuck': 'Stuck',

	// ── Cases ────────────────────────────────────────────────────
	'cases.title': 'My Cases',
	'cases.search_placeholder': 'Search by case label or ID...',
	'cases.all_stages': 'All Stages',
	'cases.all_loan_types': 'All Loan Types',
	'cases.all_lenders': 'All Lenders',
	'cases.clear_filters': 'Clear all filters',
	'cases.showing': 'Showing {{filtered}} of {{total}} cases',
	'cases.sample': 'Sample',
	'cases.documents': 'Documents',
	'cases.query_one': 'query',
	'cases.query_many': 'queries',
	'cases.days_in_stage': '{{days}}d in stage',
	'cases.no_lenders': 'No lenders added yet',
	'cases.more_lenders': '+{{count}} more',
	'cases.no_match': 'No cases match your filters',
	'cases.no_match_hint':
		'Try adjusting your search terms or clearing the filters to see all cases.',
	'cases.clear_filter_btn': 'Clear Filters',
	'cases.empty_title': 'No cases yet',
	'cases.empty_desc':
		'Create your first case to get started. You will be able to track loan applications, manage documents, and connect with RMs.',
	'cases.lender_one': 'lender',
	'cases.lender_many': 'lenders',

	// ── Case Stages ──────────────────────────────────────────────
	'stage.intake': 'Intake',
	'stage.profiling': 'Profiling',
	'stage.file_building': 'File Building',
	'stage.submitted': 'Submitted',
	'stage.processing': 'Processing',
	'stage.query': 'Query',
	'stage.sanctioned': 'Sanctioned',
	'stage.disbursed': 'Disbursed',
	'stage.rejected': 'Rejected',
	'stage.dropped': 'Dropped',
	'stage.closed': 'Closed',

	// ── Loan Types ───────────────────────────────────────────────
	'loan.home_loan': 'Home Loan',
	'loan.lap': 'LAP',
	'loan.personal_loan': 'Personal Loan',
	'loan.business_loan': 'Business Loan',
	'loan.professional_loan': 'Professional Loan',
	'loan.plot_loan': 'Plot Loan',
	'loan.balance_transfer': 'Balance Transfer',
	'loan.top_up': 'Top Up',
	'loan.bt_top_up': 'BT + Top Up',

	// ── Eligibility ──────────────────────────────────────────────
	'eligibility.eligible': 'Eligible',
	'eligibility.marginal': 'Marginal',
	'eligibility.not_eligible': 'Not Eligible',
	'eligibility.unknown': 'Unknown',

	// ── Decision Factors ─────────────────────────────────────────
	'factor.income': 'Income',
	'factor.credit': 'Credit',
	'factor.property': 'Property',
	'factor.obligations': 'Obligations',
	'factor.profile': 'Profile',
	'factor.policy': 'Policy',

	// ── Result Badges ────────────────────────────────────────────
	'badge.new_contender': 'NEW CONTENDER',
	'badge.best_amount': 'BEST AMOUNT',
	'badge.best_rate': 'BEST RATE',
	'badge.best_emi': 'BEST EMI',
	'badge.updated': 'UPDATED',

	// ── Improvement Tips ─────────────────────────────────────────
	'effort.easy': 'Easy',
	'effort.moderate': 'Moderate',
	'effort.significant': 'Significant',

	// ── Documents ────────────────────────────────────────────────
	'doc.not_started': 'Not Started',
	'doc.requested': 'Requested',
	'doc.received': 'Received',
	'doc.uploaded': 'Uploaded',
	'doc.expired': 'Expired',
	'doc.expires_in': 'Expires in {{days}}d',
	'doc.fresh': 'Fresh',
	'doc.identity': 'Identity',
	'doc.income': 'Income',
	'doc.property': 'Property',
	'doc.lender_specific': 'Lender Specific',
	'doc.other': 'Other',

	// ── Credit & Legal Status ────────────────────────────────────
	'credit.not_set': 'Not set',
	'credit.pending': 'Pending',
	'credit.ordered': 'Ordered',
	'credit.received': 'Received',
	'credit.positive': 'Positive',
	'credit.negative': 'Negative',
	'credit.clear': 'Clear',
	'credit.not_clear': 'Not Clear',
	'credit.approved': 'Approved',
	'credit.rejected': 'Rejected',
	'credit.conditional': 'Conditional',

	// ── Time & Relative ──────────────────────────────────────────
	'time.just_now': 'Just now',
	'time.minutes_ago': '{{count}}m ago',
	'time.hours_ago': '{{count}}h ago',
	'time.days_ago': '{{count}}d ago',
	'time.weeks_ago': '{{count}}w ago',
	'time.hours_remaining': 'hours remaining',
	'time.days_remaining': 'days remaining',

	// ── Pagination ───────────────────────────────────────────────
	'pagination.previous': 'Previous',
	'pagination.next': 'Next',
	'pagination.page_of': 'Page {{current}} of {{total}}',

	// ── Form ─────────────────────────────────────────────────────
	'form.saving': 'Saving...',
	'form.saved': 'Saved',
	'form.continue': 'Continue',
	'form.complete_details': 'Complete Details',
	'form.view_edit': 'View / Edit Details',
	'form.add': 'Add',
	'form.remove': 'Remove',
	'form.update': 'Update',
	'form.create': 'Create',
	'form.please_wait': 'Please wait',
	'form.view_details': 'View Details',
	'form.show_more': 'Show More',

	// ── Accuracy Rating ──────────────────────────────────────────
	'rating.income_estimation': 'Income Estimation',
	'rating.property_valuation': 'Property Valuation',
	'rating.eligibility_check': 'Eligibility Check',
	'rating.documentation': 'Documentation',
	'rating.overall': 'Overall',
	'rating.feedback_placeholder': 'Any additional feedback...',

	// ── Communication ────────────────────────────────────────────
	'comm.whatsapp': 'WhatsApp',
	'comm.email': 'Email',

	// ── Processing Status ────────────────────────────────────────
	'status.pending': 'Pending',
	'status.in_review': 'In Review',
	'status.under_review': 'Under Review',
	'status.sanctioned': 'Sanctioned',
	'status.disbursed': 'Disbursed',
	'status.rejected': 'Rejected',

	// ── Sample Data Labels ───────────────────────────────────────
	'sample.loan_sanctioned': 'Loan Sanctioned',
	'sample.commission_credited': 'Commission Credited',
	'sample.new_referral': 'New Referral',
	'sample.under_review': 'Under Review',
	'sample.application_rejected': 'Application Rejected',

	// ── DASHBOARD REDESIGN (Session 11 - Non-Tech User Simplification) ──

	// Dashboard Greeting
	'dashboard.intro': 'Hi {name}! 👋',
	'dashboard.loanCount': 'You have {count} loan applications',
	'dashboard.selectLanguage': 'Choose Your Language',

	// Status Summary
	'status.quickGlance': 'Your Status at a Glance',
	'status.readyToSubmit': 'Ready to Submit',
	'status.readyToSubmitDesc': 'Ready to send to bank',
	'status.needsHelp': 'Needs Help',
	'status.needsHelpDesc': 'Bank asked for something',
	'status.urgent': 'Urgent',
	'status.urgentDesc': 'Needs immediate action',

	// Actions & Next Steps
	'action.submitToBank': 'Submit to Bank',
	'action.addMissingInfo': 'Add Missing Information',
	'action.followUpWithBank': 'Follow Up with Bank',
	'action.viewAll': 'See All',
	'action.whatToDoToday': 'What to Do Today',

	// Application Status (Simplified)
	'appStatus.draft': 'Draft - Not Ready Yet',
	'appStatus.readyToSubmit': 'Ready to Submit to Bank',
	'appStatus.submitted': 'Submitted - Bank is Reviewing',
	'appStatus.approved': 'Approved - Bank Said Yes',
	'appStatus.rejected': 'Rejected - Bank Said No',
	'appStatus.bankAskedQuestion': 'Bank Asked a Question',

	// Journey Steps (For Forms)
	'journey.step1': 'Tell Us About Yourself',
	'journey.step2': "Where's the Property?",
	'journey.step3': 'How Much Money?',
	'journey.step4': 'Your Income',
	'journey.step5': 'Documents',
	'journey.ready': 'Ready to Submit',
	'journey.submitted': 'Submitted to Bank',
	'journey.reviewing': 'Bank is Reviewing',
	'journey.approved': 'Approved!',
	'journey.offer': "Bank's Offer",
	'journey.complete': 'All Done!',
	'journey.percentage_complete': "You're {percent}% done!",

	// Simplified Field Labels
	'field.yourName': 'Your Name?',
	'field.phoneNumber': 'Phone Number?',
	'field.city': 'Which City?',
	'field.propertyType': 'What Type of Property?',
	'field.propertyLocation': 'Where is It?',
	'field.propertyUse': 'What Will It Be Used For?',
	'field.propertyValue': 'Property Worth?',
	'field.propertyWorth': 'How much is it worth?',
	'field.loanAmount': 'How Much to Borrow?',
	'field.loanYears': 'For How Many Years?',
	'field.incomeType': 'How Do You Earn?',
	'field.incomeAmount': 'How Much Per Month?',
	'field.incomeStability': 'Steady for How Long?',

	// Property Type Options
	'propertyType.apartment': 'Apartment (Flat)',
	'propertyType.house': 'House',
	'propertyType.plot': 'Plot / Land',
	'propertyType.commercial': 'Commercial Space',
	'propertyType.other': 'Other',

	// Property Use Options
	'propertyUse.liveThere': "You'll Live There",
	'propertyUse.business': 'Business Use',
	'propertyUse.rentOut': 'Rent It Out',
	'propertyUse.investment': 'Investment',

	// Income Type Options
	'incomeType.salariedJob': 'Salaried Job',
	'incomeType.business': 'Business',
	'incomeType.selfEmployed': 'Self-Employed',
	'incomeType.agriculture': 'Agriculture',
	'incomeType.rental': 'Rental Income',
	'incomeType.professional': 'Professional',
	'incomeType.multiple': 'Multiple Sources',

	// RM Dashboard
	'rm.loanFromAgents': 'Loans from Agents',
	'rm.taskList': 'Your Task List (Today)',
	'rm.actionNeeded': 'Action Needed',
	'rm.reviewLater': 'Review Later',
	'rm.alreadyApproved': 'Already Approved',
	'rm.bankUpdates': 'Your Bank Updates',
	'rm.shareWithAgents': 'Share with Agents',
	'rm.forwardToAgents': 'Forward to Agents',
	'rm.connected': 'Connected with {count} Agents',

	// Help Text & Guidance
	'help.fillForm': 'Answer these questions about your loan',
	'help.complete': "You're {percent}% done!",
	'help.nextStep': 'Next: {step}',
	'help.bankAsked': 'Bank Asked For:',
	'help.deadline': 'Deadline: {date}',
	'help.uploadedOn': 'Uploaded on {date}',
	'help.validUntil': 'Valid until {date}',

	// Dashboard Statistics
	'stats.thisMonth': 'This Month',
	'stats.approved': 'Approved',
	'stats.submitted': 'Submitted',
	'stats.processing': 'Processing',
	'stats.rejected': 'Rejected',

	// ── Application Form — Success & Evaluating ───────────────
	'app.submitted.title': 'Application Submitted!',
	'app.submitted.message':
		'Thank you for your {{loanType}} loan application. Our team will review your application and contact you within 24-48 hours.',
	'app.submitted.goHome': 'Go to Home',
	'app.submitted.submitBtn': 'Submit Application',
	'app.submitted.submitting': 'Submitting...',
	'app.submitted.backToOffers': 'Back to Offers',
	'app.evaluating.title': 'Evaluating Your Application',
	'app.evaluating.offersReady': '{{count}} Offer{{plural}} Ready!',
	'app.evaluating.error': 'Something went wrong. Please try again.',
	'app.evaluating.tryAgain': 'Try Again',
	'app.evaluating.goBack': 'Go Back',
	'app.evaluating.insight1': 'DSAs who compare 5+ lenders close 40% more cases.',
	'app.evaluating.insight2':
		"Your client's income profile is being matched against specialized programs.",
	'app.evaluating.insight3': 'Tip: Shortlist your top 3 before presenting to the client.',
	'app.evaluating.insight4': 'We check eligibility, rates, and processing fees across all lenders.',
	'app.evaluating.insight5':
		'Presenting multiple options builds client trust and increases conversions.',

	// ── Policy Library (C.2) ──────────────────────────────────
	'policy_library.sort_recently_verified': 'Recently verified',
	'policy_library.sort_due_soonest': 'Due soonest',
	'policy_library.sort_az': 'A–Z',
	'policy_library.badge_verified': 'Verified {{timeAgo}}',
	'policy_library.badge_not_yet': 'Not yet verified',
	'policy_library.no_match': 'No lenders match "{{query}}"',
	'policy_library.type_all': 'All types',

	// ── Admin Impersonation (C.4) ─────────────────────────────
	'admin.impersonate_btn': 'Impersonate',
	'admin.impersonate_title': 'Log in as {{name}}?',
	'admin.impersonate_body':
		"You'll see their dashboard exactly as they do. This action is logged. A banner will remind you who you're viewing as — click \"Exit\" to return to admin.",
	'admin.impersonate_reason_label': 'Reason (required)',
	'admin.impersonate_reason_placeholder': 'e.g. Debugging reported results issue',
	'admin.impersonate_start_btn': 'Start',
	'admin.impersonate_blocked_self': "You can't impersonate yourself",
	'admin.impersonate_blocked_suspended': 'User is suspended',
	'admin.impersonate_blocked_admin': "Admin accounts can't be impersonated"
} as const;
