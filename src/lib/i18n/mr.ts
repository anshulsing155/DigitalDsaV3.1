/**
 * Marathi (मराठी) Translations — Devanagari script, बोलचाल register
 *
 * Style: Conversational Marathi. NOT साहित्यिक/शुद्ध मराठी.
 * English technical terms stay in English script.
 * Mumbai/Pune casual register — the way DSAs and RMs actually talk.
 */

export const mr: Record<string, string> = {
	// ── Common UI ──────────────────────────────────────────────
	'common.next': 'पुढे →',
	'common.back': '← मागे',
	'common.skip': 'Skip करा',
	'common.submit': 'Submit करा',
	'common.cancel': 'Cancel करा',
	'common.save': 'Save करा',
	'common.done': 'झालं',
	'common.close': 'बंद करा',
	'common.loading': 'Load होत आहे...',
	'common.error': 'काहीतरी चुकलं',
	'common.retry': 'परत try करा',
	'common.yes': 'हो',
	'common.no': 'नाही',
	'common.ok': 'ठीक आहे',
	'common.search': 'Search करा',
	'common.filter': 'Filter',
	'common.clear': 'Clear करा',
	'common.delete': 'Delete करा',
	'common.edit': 'Edit करा',
	'common.view': 'बघा',
	'common.download': 'Download करा',
	'common.upload': 'Upload करा',
	'common.share': 'Share करा',
	'common.copy': 'Copy करा',
	'common.copied': 'Copy झालं!',

	// ── Disclaimers (AD-11) ───────────────────────────────────

	// 1. RM Onboarding Acceptance
	'disclaimer.rm_onboarding_title': 'सुरू करण्यापूर्वी',
	'disclaimer.rm_onboarding_body':
		'हे platform फक्त एक helper tool आहे — DSA आणि RM मधलं coordination smooth करण्यासाठी। ' +
		'इथे share होणारी कोणतीही information legally binding नाही। Final decision नेहमी lender चा असतो। ' +
		'चूक होऊ शकते, delay होऊ शकतो — म्हणून DSA ने नेहमी official channel वरून verify करावं। ' +
		'आमची कोणतीही liability नाही, RM ची पण नाही।',
	'disclaimer.rm_onboarding_checkbox': 'मी वाचलं, समजलं',

	// 2. Per-Rating Disclaimer
	'disclaimer.rating_notice':
		'ही rating फक्त platform चांगलं करण्यासाठी आहे। यामुळे कोणत्याही DSA च्या application वर काहीही फरक पडणार नाही। ' +
		'तुमची rating anonymous आहे — DSA ला तुमचं नाव दिसणार नाही।',

	// 3. Broadcast Footer (server-enforced)
	'disclaimer.broadcast_footer':
		'⚠️ ही information RM ने आपल्या समजुतीने share केली आहे। Platform याची guarantee देत नाही। Please official channel वरून confirm करा।',

	// 4. DSA-Side RM Content Tags
	'disclaimer.rm_content_tag': 'RM कडून आलेली info',
	'disclaimer.rm_content_notice': 'Platform verified नाही — तुमच्या lender कडून confirm करा',

	// 5. Eligibility Results
	'disclaimer.eligibility_result':
		'हा फक्त एक estimate आहे, final नाही। Lender ची policy वेगळी असू शकते। File submit करण्यापूर्वी RM शी बोला।',

	// 6. File Preview (PDF footers)
	'disclaimer.pdf_review_footer':
		'हे preliminary assessment आहे — PII (नाव, PAN, Aadhaar) जाणूनबुजून नाही. Final file वेगळी असेल.',
	'disclaimer.pdf_submission_footer':
		'या file मधला data DSA ने दिला आहे. Platform ने verify केलेला नाही.',

	// 7. Platform ToS
	'disclaimer.tos_summary_title': 'खरी गोष्ट काय आहे?',
	'disclaimer.tos_updated_modal': 'Terms बदलले आहेत',

	// ── RM Value Proposition Screens (AD-12) ──────────────────

	// Screen 1
	'rm_value.screen1_title': 'हे Platform तुमच्यासाठी काय करेल?',
	'rm_value.more_dsas_title': 'जास्त DSAs शी जोडले जा',
	'rm_value.more_dsas_desc':
		'तुमच्या area मधले active DSAs शी directly connect व्हा — कोणत्याही introduction शिवाय। System automatically match करेल।',
	'rm_value.quality_leads_title': 'Quality leads ओळखा',
	'rm_value.quality_leads_desc':
		'प्रत्येक DSA ची file quality, response time, track record दिसेल। आता अंदाजाने काम नाही — data वरून decision घ्या।',
	'rm_value.daily_manage_title': 'Daily काम manage करा',
	'rm_value.daily_manage_desc':
		'Pending files, queries, follow-ups — सगळं एका जागी। तुमचा unofficial todo list समजा जो incentive वाढवायला help करतो।',
	'rm_value.less_effort_title': 'कमी effort, जास्त output',
	'rm_value.less_effort_desc':
		'DSA ला phone करून status विचारणं बंद। System वर सगळं दिसतं — एका click मध्ये।',
	'rm_value.policy_updates_title': 'Policy updates एका जागी',
	'rm_value.policy_updates_desc':
		'तुमच्या bank ची नवीन policy एकदा upload करा — सगळ्या DSAs ना एकदम पोहोचेल। WhatsApp वर 50 groups मध्ये पाठवणं बंद।',
	'rm_value.async_title': 'Asynchronous coordination',
	'rm_value.async_desc':
		'DSA ला 10 वेळा call नाही करायचा, RM ला 10 वेळा pick up नाही करायचा। Query raise करा, जेव्हा वेळ मिळेल respond करा। सगळं logged आहे।',

	// Screen 2
	'rm_value.screen2_title': 'पैशांबद्दल बोलूया',
	'rm_value.more_files_title': 'जास्त files = जास्त incentive',
	'rm_value.more_files_desc':
		'जास्त DSAs connected = जास्त files येतील = जास्त login = जास्त incentive। Simple math।',
	'rm_value.conversion_title': 'Better conversion rate',
	'rm_value.conversion_desc':
		'System आधीच check करतो की file eligible आहे की नाही। तुमच्याकडे जी file येईल, ती काम करण्यासारखी असेल — rejection कमी, sanction जास्त।',
	'rm_value.time_money_title': 'Time = Money',
	'rm_value.time_money_desc':
		'जो time तुम्ही phone calls, WhatsApp, follow-ups मध्ये घालवता — तो वाचेल। त्या time मध्ये आणखी files process करा।',
	'rm_value.business_safe_title': 'सगळ्यांचा business safe',
	'rm_value.business_safe_desc':
		'Platform कोणाचा customer हिरावून घेत नाही। DSA चा customer DSA चा राहील। तुमचं network तुमचं राहील। आम्ही फक्त मध्ये coordination smooth करतो।',
	'rm_value.performance_title': 'Performance data ready',
	'rm_value.performance_desc':
		'तुमचा response time, sanction rate — सगळं track होईल। Appraisal आलं की data ready मिळेल।',
	'rm_value.free_title': 'RM साठी पूर्ण free',
	'rm_value.free_desc':
		'कोणता subscription नाही, कोणता hidden charge नाही। तुमचा time invest होईल, पैसे नाही।',
	'rm_value.seasonal_title': 'Seasonal push एका click मध्ये',
	'rm_value.seasonal_desc':
		'Quarter end आहे, target पूर्ण नाही झालं? एक broadcast पाठवा — "Special rate for salaried, 3 days only" — सगळ्या DSAs ना एकदम पोहोचेल।',

	// Screen 3
	'rm_value.screen3_title': 'हे Platform काय नाही',
	'rm_value.not_official_title': 'हे कोणतं official system नाही',
	'rm_value.not_official_desc':
		'हे lender चं system नाही। हे एक independent helper tool आहे — जसं WhatsApp group आहे, बस organized।',
	'rm_value.no_legal_title': 'कोणतं legal binding नाही',
	'rm_value.no_legal_desc':
		'तुम्ही इथे जे काही share कराल — rating, broadcast, policy update — ते फक्त information आहे। कोणती legal जबाबदारी नाही।',
	'rm_value.no_customer_data_title': 'Customer data दिसत नाही',
	'rm_value.no_customer_data_desc':
		'DSA च्या file मध्ये customer चं नाव, PAN, Aadhaar — काहीही दिसत नाही जोपर्यंत DSA स्वतः देत नाही। Privacy system-enforced आहे।',
	'rm_value.network_safe_title': 'तुमचं network चोरीला जाणार नाही',
	'rm_value.network_safe_desc':
		'कोणता दुसरा RM तुमच्या DSAs ला platform द्वारे approach करू शकत नाही। तुमचं network फक्त तुमचं आहे।',
	'rm_value.not_magic_title': 'हे magic नाही',
	'rm_value.not_magic_desc':
		'हे tool आहे। तुम्हाला use करावं लागेल — पण use कराल तर result दिसेल। Diary सारखं समजा, बस digital आणि organized।',

	// Screen 4
	'rm_value.screen4_title': 'कसं काम करेल?',
	'rm_value.step1_title': 'Profile बनवा',
	'rm_value.step1_desc': '2 minute — नाव, bank, branch, loan types। बस।',
	'rm_value.step2_title': 'DSAs connect होतील',
	'rm_value.step2_desc':
		'System automatically तुमच्या area/bank चे DSAs दाखवेल। तुम्ही accept करा।',
	'rm_value.step3_title': 'Files manage करा',
	'rm_value.step3_desc':
		'Files येतील, review करा, rating द्या, queries raise करा — सगळं एका dashboard वरून।',
	'rm_value.cta': 'चला सुरू करूया →',

	// Additional benefits
	'rm_value.informal_dsas_title': 'Informal DSAs शोधा',
	'rm_value.informal_dsas_desc':
		'बरेच DSAs जे formally कोणत्याही corporate code मध्ये नाहीत, पण चांगलं काम करतात — त्यांना शोधा। Hidden talent pool।',
	'rm_value.peer_proof': '{{dsaCount}} DSAs आणि {{rmCount}} RMs आधीपासूनच या platform वर आहेत।',

	// ── Auth / Login ─────────────────────────────────────────────
	'auth.welcome_demo': 'Demo मध्ये स्वागत! सगळे features freely explore करा.',
	'auth.demo_unavailable': 'Demo आत्ता available नाही. Please परत try करा.',
	'auth.ip_blocked': 'IP block झालं. 24 तासांनी try करा किंवा आमच्याशी contact करा.',
	'auth.otp_wait': 'Please दुसरा OTP request करण्यापूर्वी wait करा',
	'auth.otp_sent': 'OTP successfully पाठवला',
	'auth.otp_failed': 'OTP पाठवता आला नाही',
	'auth.otp_invalid': 'Please valid 4-digit OTP enter करा',
	'auth.otp_no_session': 'कोणता active OTP session नाही. Please आधी OTP request करा.',
	'auth.mobile_required': 'Mobile number आवश्यक आहे',
	'auth.ip_blocked_long':
		'तुमची IP temporarily block झाली आहे. 24 तासांनी परत try करा किंवा support शी contact करा.',

	// ── Errors ───────────────────────────────────────────────────
	'error.not_found': 'जो page तुम्ही शोधत आहात तो exist नाही करत.',
	'error.server': 'एक unexpected server error आला.',
	'error.forbidden': 'तुम्हाला हा page access करण्याची permission नाही.',
	'error.unauthorized': 'हा page access करण्यासाठी login करणं आवश्यक आहे.',
	'error.rate_limit': 'खूप जास्त requests. Please नंतर try करा.',
	'error.generic': 'काहीतरी चुकलं.',
	'error.url_missing': 'हा URL exist नाही किंवा move झाला आहे.',
	'error.go_home': 'Home ला जा',
	'error.try_url': 'URL check करा किंवा homepage वरून site explore करा.',
	'error.check_permissions': 'Please योग्य permissions ने login करा.',
	'error.rate_limit_wait': 'खूप requests झाल्या. थोडा wait करा आणि परत try करा.',
	'error.team_notified': 'आमच्या team ला या issue ची notification गेली आहे.',
	'error.path': 'Path:',
	'error.network': 'Network error. Please connection check करा आणि परत try करा.',

	// ── Dashboard ────────────────────────────────────────────────
	'dashboard.welcome': 'Welcome, {{name}}',
	'dashboard.active_cases': 'Active Cases',
	'dashboard.active_case': 'Active Case',
	'dashboard.files_submitted': 'Files Submitted',
	'dashboard.sanctioned': 'Sanctioned',
	'dashboard.avg_processing': 'Avg. Processing',
	'dashboard.of_total': '{{total}} पैकी',
	'dashboard.no_cases_yet': 'अजून कोणते case नाहीत',
	'dashboard.this_month': 'या महिन्यात',
	'dashboard.amount_value': '{{amount}} value',
	'dashboard.avg_to_sanction': 'Sanction पर्यंत avg.',
	'dashboard.no_data_yet': 'अजून कोणता data नाही',
	'dashboard.quick_actions': 'Quick Actions',
	'dashboard.new_case': 'New Case',
	'dashboard.my_cases': 'My Cases',
	'dashboard.rm_contacts': 'RM Contacts',
	'dashboard.communicate': 'Communicate',
	'dashboard.soon': 'SOON',
	'dashboard.recent_activity': 'Recent Activity',
	'dashboard.view_all_activity': 'सगळी Activity बघा',
	'dashboard.case_pipeline': 'Case Pipeline',
	'dashboard.active_count': '{{count}} active',
	'dashboard.no_active_pipeline': 'Pipeline मध्ये कोणते active case नाहीत',
	'dashboard.needs_attention': 'लक्ष द्या',
	'dashboard.all_clear': 'सगळं ठीक आहे!',
	'dashboard.no_attention_needed': 'कोणत्याही case ला आत्ता attention ची गरज नाही',
	'dashboard.more_attention': '+{{count}} आणखी items ज्यांवर लक्ष द्यायचं आहे',
	'dashboard.recent_cases': 'Recent Cases',
	'dashboard.create_first_case': 'सुरू करण्यासाठी तुमचा पहिला case बनवा',
	'dashboard.view_all_cases': 'सगळे {{count}} Cases बघा',
	'dashboard.view_all': 'सगळे Cases बघा',
	'dashboard.amount_tbd': 'Amount TBD',

	// Dashboard — empty state
	'dashboard.empty_title': 'तुमचं Dashboard तयार आहे',
	'dashboard.empty_desc':
		'Loan applications track करण्यासाठी, documents manage करण्यासाठी आणि RMs शी connect होण्यासाठी तुमचा पहिला case बनवा. तुमचं dashboard data ने भरेल.',
	'dashboard.empty_cta': 'तुमचा पहिला Case बनवा',

	// Dashboard — banners
	'dashboard.profile_banner':
		'Personalized recommendations unlock करण्यासाठी तुमचं **business profile** complete करा.',
	'dashboard.profile_later': 'नंतर',
	'dashboard.profile_setup': 'Profile Set Up करा',
	'dashboard.sample_first_case':
		'तुम्ही तुमचा पहिला case बनवला! Dashboard वरून **sample data** काढायचा आहे का?',
	'dashboard.keep_samples': 'Samples ठेवा',
	'dashboard.clear_samples': 'Samples काढा',
	'dashboard.clearing': 'काढत आहे...',
	'dashboard.clear_failed': 'Sample data काढता आला नाही. Please परत try करा.',
	'dashboard.sample_banner':
		'तुम्ही dashboard समजून घेण्यासाठी **sample data** बघत आहात. काढण्यासाठी dismiss करा.',
	'dashboard.dismiss': 'काढा',

	// Dashboard — RM contacts card
	'dashboard.no_rm_contacts': 'अजून कोणते RM contacts नाहीत',
	'dashboard.add_rm_hint': 'Cases submit करताना RM contacts add करा',
	'dashboard.view_all_rm': 'सगळे RM Contacts बघा',

	// Dashboard — attention types
	'dashboard.attention_query': 'Open Query',
	'dashboard.attention_expiring': 'Expiring Doc',
	'dashboard.attention_stuck': 'Stuck',

	// ── Cases ────────────────────────────────────────────────────
	'cases.title': 'My Cases',
	'cases.search_placeholder': 'Case label किंवा ID ने search करा...',
	'cases.all_stages': 'सगळे Stages',
	'cases.all_loan_types': 'सगळे Loan Types',
	'cases.all_lenders': 'सगळे Lenders',
	'cases.clear_filters': 'सगळे filters clear करा',
	'cases.showing': '{{total}} पैकी {{filtered}} cases दिसत आहेत',
	'cases.sample': 'Sample',
	'cases.documents': 'Documents',
	'cases.query_one': 'query',
	'cases.query_many': 'queries',
	'cases.days_in_stage': '{{days}}d या stage मध्ये',
	'cases.no_lenders': 'अजून कोणता lender add केला नाही',
	'cases.more_lenders': '+{{count}} आणखी',
	'cases.no_match': 'कोणताही case तुमच्या filters शी match नाही',
	'cases.no_match_hint': 'Search terms बदला किंवा सगळे cases बघण्यासाठी filters clear करा.',
	'cases.clear_filter_btn': 'Filters Clear करा',
	'cases.empty_title': 'अजून कोणते case नाहीत',
	'cases.empty_desc':
		'सुरू करण्यासाठी तुमचा पहिला case बनवा. तुम्ही loan applications track, documents manage आणि RMs शी connect करू शकाल.',
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
	'effort.easy': 'सोपं',
	'effort.moderate': 'Medium',
	'effort.significant': 'बराच effort',

	// ── Documents ────────────────────────────────────────────────
	'doc.not_started': 'सुरू नाही झालं',
	'doc.requested': 'Requested',
	'doc.received': 'Received',
	'doc.uploaded': 'Uploaded',
	'doc.expired': 'Expired',
	'doc.expires_in': '{{days}}d मध्ये expire होईल',
	'doc.fresh': 'Fresh',
	'doc.identity': 'Identity',
	'doc.income': 'Income',
	'doc.property': 'Property',
	'doc.lender_specific': 'Lender Specific',
	'doc.other': 'Other',

	// ── Credit & Legal Status ────────────────────────────────────
	'credit.not_set': 'Set नाही',
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
	'time.just_now': 'आत्ताच',
	'time.minutes_ago': '{{count}}m पूर्वी',
	'time.hours_ago': '{{count}}h पूर्वी',
	'time.days_ago': '{{count}}d पूर्वी',
	'time.weeks_ago': '{{count}}w पूर्वी',
	'time.hours_remaining': 'तास बाकी',
	'time.days_remaining': 'दिवस बाकी',

	// ── Pagination ───────────────────────────────────────────────
	'pagination.previous': 'मागचा',
	'pagination.next': 'पुढचा',
	'pagination.page_of': 'Page {{current}} of {{total}}',

	// ── Form ─────────────────────────────────────────────────────
	'form.saving': 'Save होत आहे...',
	'form.saved': 'Save झालं',
	'form.continue': 'Continue करा',
	'form.complete_details': 'Details पूर्ण करा',
	'form.view_edit': 'Details बघा / Edit करा',
	'form.add': 'Add करा',
	'form.remove': 'काढा',
	'form.update': 'Update करा',
	'form.create': 'बनवा',
	'form.please_wait': 'Please wait करा',
	'form.view_details': 'Details बघा',
	'form.show_more': 'आणखी दाखवा',

	// ── Accuracy Rating ──────────────────────────────────────────
	'rating.income_estimation': 'Income Estimation',
	'rating.property_valuation': 'Property Valuation',
	'rating.eligibility_check': 'Eligibility Check',
	'rating.documentation': 'Documentation',
	'rating.overall': 'Overall',
	'rating.feedback_placeholder': 'काही अधिक feedback...',

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
	'dashboard.intro': 'नमस्ते {name}! 👋',
	'dashboard.loanCount': 'तुमच्याकडे {count} loan applications आहेत',
	'dashboard.selectLanguage': 'तुमची भाषा निवडा',

	// Status Summary
	'status.quickGlance': 'तुमची स्थिती एक नजरेत',
	'status.readyToSubmit': 'submit करायला तयार',
	'status.readyToSubmitDesc': 'बँकला पाठवायला तयार',
	'status.needsHelp': 'मदत हवी आहे',
	'status.needsHelpDesc': 'बँकला काहीतरी हवं आहे',
	'status.urgent': 'तात्काळ',
	'status.urgentDesc': 'तात्काळ कारवाई हवी आहे',

	// Actions & Next Steps
	'action.submitToBank': 'बँकला पाठवा',
	'action.addMissingInfo': 'गहाळ माहिती जोडा',
	'action.followUpWithBank': 'बँकला संपर्क करा',
	'action.viewAll': 'सगळं बघा',
	'action.whatToDoToday': 'आज काय करायचं',

	// Application Status (Simplified)
	'appStatus.draft': 'Draft - अजून तयार नाही',
	'appStatus.readyToSubmit': 'बँकला पाठवायला तयार',
	'appStatus.submitted': 'बँकला पाठविलं - समीक्षा होत आहे',
	'appStatus.approved': 'Approve झालं - बँक म्हणाला हो',
	'appStatus.rejected': 'Reject झालं - बँक म्हणाला नाही',
	'appStatus.bankAskedQuestion': 'बँकला काहीतरी विचारायचं आहे',

	// Journey Steps (For Forms)
	'journey.step1': 'आपल्या बद्दल सांगा',
	'journey.step2': 'मालमत्ता कोठे आहे?',
	'journey.step3': 'कती पैसे हवेत?',
	'journey.step4': 'तुमची उत्पन्न',
	'journey.step5': 'कागदपत्रे',
	'journey.ready': 'submit करायला तयार',
	'journey.submitted': 'बँकला पाठविलं',
	'journey.reviewing': 'बँक पाहत आहे',
	'journey.approved': 'Approve झालं!',
	'journey.offer': 'बँकचा ऑफर',
	'journey.complete': 'सगळं झालं!',
	'journey.percentage_complete': 'तुम्ही {percent}% पर्यंत पोहोचलात!',

	// Simplified Field Labels
	'field.yourName': 'तुमचं नाव?',
	'field.phoneNumber': 'फोन नंबर?',
	'field.city': 'कोणत शहर?',
	'field.propertyType': 'मालमत्ता कशी आहे?',
	'field.propertyLocation': 'कोठे आहे?',
	'field.propertyUse': 'याचा काय वापर करणार?',
	'field.propertyValue': 'मालमत्तेची किंमत?',
	'field.propertyWorth': 'याचं मूल्य कती आहे?',
	'field.loanAmount': 'कती कर्ज घायचं?',
	'field.loanYears': 'किती वर्षांसाठी?',
	'field.incomeType': 'तुम्ही कसे कमवता?',
	'field.incomeAmount': 'महिन्यामध्ये कती?',
	'field.incomeStability': 'किती वेळापासून स्थिर आहे?',

	// Property Type Options
	'propertyType.apartment': 'अपार्टमेंट (फ्लॅट)',
	'propertyType.house': 'घर',
	'propertyType.plot': 'प्लॉट / जमीन',
	'propertyType.commercial': 'व्यावसायिक जागा',
	'propertyType.other': 'इतर',

	// Property Use Options
	'propertyUse.liveThere': 'तुम्ही तेथे राहाल',
	'propertyUse.business': 'व्यावसायिक उपयोग',
	'propertyUse.rentOut': 'भाडेत द्या',
	'propertyUse.investment': 'गुंतवणूक',

	// Income Type Options
	'incomeType.salariedJob': 'वेतन नोकरी',
	'incomeType.business': 'व्यवसाय',
	'incomeType.selfEmployed': 'स्वयंरोजगार',
	'incomeType.agriculture': 'कृषी',
	'incomeType.rental': 'भाडेच्या उत्पन्न',
	'incomeType.professional': 'व्यावसायिक',
	'incomeType.multiple': 'अनेक स्त्रोत',

	// RM Dashboard
	'rm.loanFromAgents': 'एजंटांकडून कर्ज',
	'rm.taskList': 'तुमची कार्य यादी (आज)',
	'rm.actionNeeded': 'कारवाई हवी आहे',
	'rm.reviewLater': 'नंतर बघा',
	'rm.alreadyApproved': 'आधीच Approve',
	'rm.bankUpdates': 'बँकच्या अपडेट',
	'rm.shareWithAgents': 'एजंटांसह share करा',
	'rm.forwardToAgents': 'एजंटांना पाठवा',
	'rm.connected': '{count} एजंटांशी जोडलेले आहेत',

	// Help Text & Guidance
	'help.fillForm': 'तुमच्या कर्जाबद्दल या प्रश्नांची उत्तरे द्या',
	'help.complete': 'तुम्ही {percent}% पर्यंत पोहोचलात!',
	'help.nextStep': 'पुढचं: {step}',
	'help.bankAsked': 'बँकला हवं:',
	'help.deadline': 'अंतिम तारीख: {date}',
	'help.uploadedOn': '{date} ला upload झालं',
	'help.validUntil': '{date} पर्यंत वैध आहे',

	// Dashboard Statistics
	'stats.thisMonth': 'या महिन्यात',
	'stats.approved': 'Approve झालेले',
	'stats.submitted': 'submit केलेले',
	'stats.processing': 'प्रक्रिया',
	'stats.rejected': 'Reject झालेले',

	// ── Application Form — Success & Evaluating ───────────────
	'app.submitted.title': 'Application Submit झाली!',
	'app.submitted.message':
		'तुमच्या {{loanType}} loan application बद्दल धन्यवाद। आमची team 24-48 तासांत तुमच्याशी contact करेल।',
	'app.submitted.goHome': 'Home वर जा',
	'app.submitted.submitBtn': 'Application Submit करा',
	'app.submitted.submitting': 'Submit होत आहे...',
	'app.submitted.backToOffers': 'Offers वर परत जा',
	'app.evaluating.title': 'तुमची Application Evaluate होत आहे',
	'app.evaluating.offersReady': '{{count}} Offer{{plural}} तयार!',
	'app.evaluating.error': 'काहीतरी चुकलं. परत try करा.',
	'app.evaluating.tryAgain': 'परत Try करा',
	'app.evaluating.goBack': 'मागे जा',
	'app.evaluating.insight1': 'जे DSAs 5+ lenders compare करतात, ते 40% जास्त cases close करतात.',
	'app.evaluating.insight2':
		'तुमच्या client चा income profile specialized programs शी match होत आहे.',
	'app.evaluating.insight3': 'Tip: Client ला present करण्यापूर्वी top 3 shortlist करा.',
	'app.evaluating.insight4':
		'आम्ही सर्व lenders ची eligibility, rates, आणि processing fees check करतो.',
	'app.evaluating.insight5':
		'Multiple options दाखवल्याने client चा trust वाढतो आणि conversions improve होतात.',

	// ── Policy Library (C.2) ──────────────────────────────────
	'policy_library.sort_recently_verified': 'अलीकडे verify केले',
	'policy_library.sort_due_soonest': 'लवकर due',
	'policy_library.sort_az': 'A–Z',
	'policy_library.badge_verified': 'Verified {{timeAgo}}',
	'policy_library.badge_not_yet': 'अद्याप verify झाले नाही',
	'policy_library.no_match': '"{{query}}" शी जुळणारा कोणताही lender नाही',
	'policy_library.type_all': 'सर्व types',

	// ── Admin Impersonation (C.4) ─────────────────────────────
	'admin.impersonate_btn': 'Impersonate',
	'admin.impersonate_title': '{{name}} म्हणून login करा?',
	'admin.impersonate_body':
		'तुम्ही त्यांचा dashboard नक्कीच असाच पाहाल जसा ते पाहतात. ही action log केली जाते. एक banner तुम्हाला आठवण करून देईल की तुम्ही कोणाच्या रूपात पाहत आहात — admin वर परत जाण्यासाठी "Exit" वर click करा.',
	'admin.impersonate_reason_label': 'कारण (आवश्यक)',
	'admin.impersonate_reason_placeholder': 'उदा: रिपोर्ट केलेला results issue debug करत आहे',
	'admin.impersonate_start_btn': 'सुरू करा',
	'admin.impersonate_blocked_self': 'तुम्ही स्वतःला impersonate करू शकत नाही',
	'admin.impersonate_blocked_suspended': 'User suspended आहे',
	'admin.impersonate_blocked_admin': 'Admin accounts impersonate करता येत नाहीत'
};
