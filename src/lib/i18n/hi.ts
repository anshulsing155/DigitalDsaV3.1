/**
 * Hindi (हिन्दी) Translations — Devanagari script, बोलचाल की भाषा
 *
 * Style: Hinglish in Devanagari. NOT शुद्ध हिन्दी. NOT Roman transliteration.
 * English technical terms (platform, DSA, RM, lender, PDF, PII, etc.) stay in English.
 *
 * Rule: If a branch-level RM in a Tier-3 city can't understand it in 2 seconds → rewrite.
 */

export const hi: Record<string, string> = {
	// ── Common UI ──────────────────────────────────────────────
	'common.next': 'अगला →',
	'common.back': '← पीछे',
	'common.skip': 'Skip करें',
	'common.submit': 'Submit करें',
	'common.cancel': 'Cancel करें',
	'common.save': 'Save करें',
	'common.done': 'हो गया',
	'common.close': 'बंद करें',
	'common.loading': 'Load हो रहा है...',
	'common.error': 'कुछ गड़बड़ हो गई',
	'common.retry': 'फिर से try करें',
	'common.yes': 'हाँ',
	'common.no': 'नहीं',
	'common.ok': 'ठीक है',
	'common.search': 'Search करें',
	'common.filter': 'Filter',
	'common.clear': 'Clear करें',
	'common.delete': 'Delete करें',
	'common.edit': 'Edit करें',
	'common.view': 'देखें',
	'common.download': 'Download करें',
	'common.upload': 'Upload करें',
	'common.share': 'Share करें',
	'common.copy': 'Copy करें',
	'common.copied': 'Copy हो गया!',

	// ── Disclaimers (AD-11) ───────────────────────────────────

	// 1. RM Onboarding Acceptance
	'disclaimer.rm_onboarding_title': 'शुरू करने से पहले',
	'disclaimer.rm_onboarding_body':
		'ये platform सिर्फ एक helper tool है — DSA और RM के बीच coordination smooth करने के लिए। ' +
		'कोई भी information जो यहाँ share होती है, वो legally binding नहीं है। Final decision हमेशा lender का होगा। ' +
		'गलती हो सकती है, delay हो सकता है — इसलिए DSA को हमेशा official channel से verify करना चाहिए। ' +
		'ना हमारी कोई liability है, ना RM की।',
	'disclaimer.rm_onboarding_checkbox': 'मैंने पढ़ लिया, समझ गया',

	// 2. Per-Rating Disclaimer
	'disclaimer.rating_notice':
		'ये rating सिर्फ platform को better बनाने के लिए है। इससे किसी DSA की application पे कोई फर्क नहीं पड़ेगा। ' +
		'आपकी rating anonymous है — DSA को आपका नाम नहीं दिखेगा।',

	// 3. Broadcast Footer (server-enforced)
	'disclaimer.broadcast_footer':
		'⚠️ ये information RM ने अपनी समझ से share की है। Platform इसका guarantee नहीं देता। Please official channel से confirm कर लें।',

	// 4. DSA-Side RM Content Tags
	'disclaimer.rm_content_tag': 'RM से मिली info',
	'disclaimer.rm_content_notice': 'Platform verified नहीं है — अपने lender से confirm करें',

	// 5. Eligibility Results
	'disclaimer.eligibility_result':
		'ये सिर्फ एक estimate है, final नहीं। Lender की अपनी policy अलग हो सकती है। File submit करने से पहले RM से बात कर लें।',

	// 6. File Preview (PDF footers)
	'disclaimer.pdf_review_footer':
		'ये preliminary assessment है — PII (नाम, PAN, Aadhaar) intentionally नहीं है। Final file अलग होगी।',
	'disclaimer.pdf_submission_footer':
		'इस file का data DSA द्वारा दिया गया है। Platform ने verify नहीं किया है।',

	// 7. Platform ToS
	'disclaimer.tos_summary_title': 'असली बात क्या है?',
	'disclaimer.tos_updated_modal': 'Terms बदल गये हैं',

	// ── RM Value Proposition Screens (AD-12) ──────────────────

	// Screen 1
	'rm_value.screen1_title': 'ये Platform आपके लिए क्या करेगा?',
	'rm_value.more_dsas_title': 'ज़्यादा DSAs से जुड़ें',
	'rm_value.more_dsas_desc':
		'आपके area में जो DSAs active हैं, उनसे directly connect हों — बिना किसी introduction के। System automatically match करेगा।',
	'rm_value.quality_leads_title': 'Quality leads पहचानें',
	'rm_value.quality_leads_desc':
		'हर DSA की file quality, response time, past track record दिखेगा। अब अंदाज़े से काम नहीं — data से decision लें।',
	'rm_value.daily_manage_title': 'Daily काम manage करें',
	'rm_value.daily_manage_desc':
		'Pending files, queries, follow-ups — सब एक जगह। अपना unofficial todo list समझें जो incentive बढ़ाने में help करे।',
	'rm_value.less_effort_title': 'कम effort, ज़्यादा output',
	'rm_value.less_effort_desc':
		'DSA को phone करके status पूछना बंद। System पर सब दिखता है — एक click में।',
	'rm_value.policy_updates_title': 'Policy updates एक जगह',
	'rm_value.policy_updates_desc':
		'अपनी bank की नई policy एक बार upload करो — सारे DSAs को एक साथ पहुँच जाएगी। WhatsApp पर 50 groups में भेजना बंद।',
	'rm_value.async_title': 'Asynchronous coordination',
	'rm_value.async_desc':
		'DSA को 10 बार call नहीं करना पड़ेगा, RM को 10 बार pick up नहीं करना पड़ेगा। Query raise करो, जब time मिले respond करो। सब logged है।',

	// Screen 2
	'rm_value.screen2_title': 'पैसों की बात',
	'rm_value.more_files_title': 'ज़्यादा files = ज़्यादा incentive',
	'rm_value.more_files_desc':
		'ज़्यादा DSAs connected = ज़्यादा files आएंगी = ज़्यादा login = ज़्यादा incentive। Simple math।',
	'rm_value.conversion_title': 'Better conversion rate',
	'rm_value.conversion_desc':
		'System पहले ही check करता है कि file eligible है या नहीं। आपके पास जो file आएगी, वो काम की होगी — rejection कम, sanction ज़्यादा।',
	'rm_value.time_money_title': 'Time = Money',
	'rm_value.time_money_desc':
		'जो time आप phone calls, WhatsApp, follow-ups में लगाते हैं — वो बचेगा। उस time में और files process करें।',
	'rm_value.business_safe_title': 'सबका business safe',
	'rm_value.business_safe_desc':
		'Platform किसी का customer नहीं छीनता। DSA का customer DSA का रहेगा। आपका network आपका रहेगा। हम बस बीच में coordination smooth करते हैं।',
	'rm_value.performance_title': 'Performance data ready',
	'rm_value.performance_desc':
		'आपकी response time, sanction rate — सब track होगा। जब appraisal हो, data ready मिलेगा।',
	'rm_value.free_title': 'RM के लिए पूरा free',
	'rm_value.free_desc':
		'कोई subscription नहीं, कोई hidden charge नहीं। आपका time invest होगा, पैसा नहीं।',
	'rm_value.seasonal_title': 'Seasonal push एक click में',
	'rm_value.seasonal_desc':
		'Quarter end है, target पूरा नहीं हुआ? एक broadcast भेजो — "Special rate for salaried, 3 days only" — सारे DSAs को एक साथ पहुँचे।',

	// Screen 3
	'rm_value.screen3_title': 'ये Platform क्या नहीं है',
	'rm_value.not_official_title': 'ये कोई official system नहीं है',
	'rm_value.not_official_desc':
		'ये lender का system नहीं है। ये एक independent helper tool है — जैसे WhatsApp group है, बस organized।',
	'rm_value.no_legal_title': 'कोई legal binding नहीं',
	'rm_value.no_legal_desc':
		'आप जो भी यहाँ share करें — rating, broadcast, policy update — वो सिर्फ information है। कोई legal ज़िम्मेदारी नहीं।',
	'rm_value.no_customer_data_title': 'Customer data नहीं दिखता',
	'rm_value.no_customer_data_desc':
		'DSA की file में customer का नाम, PAN, Aadhaar — कुछ नहीं दिखता जब तक DSA खुद न दे। Privacy system-enforced है।',
	'rm_value.network_safe_title': 'आपका network चोरी नहीं होगा',
	'rm_value.network_safe_desc':
		'कोई और RM आपके DSAs को approach नहीं कर सकता platform के through। आपका network सिर्फ आपका है।',
	'rm_value.not_magic_title': 'ये magic नहीं है',
	'rm_value.not_magic_desc':
		'ये tool है। आपको use करना पड़ेगा — पर use करोगे तो result दिखेगा। Diary जैसा समझो, बस digital और organized।',

	// Screen 4
	'rm_value.screen4_title': 'कैसे काम करेगा?',
	'rm_value.step1_title': 'Profile बनाएं',
	'rm_value.step1_desc': '2 minute — नाम, bank, branch, loan types। बस।',
	'rm_value.step2_title': 'DSAs connect हों',
	'rm_value.step2_desc': 'System automatically आपके area/bank के DSAs दिखाएगा। आप accept करें।',
	'rm_value.step3_title': 'Files manage करें',
	'rm_value.step3_desc':
		'Files आएंगी, review करें, rating दें, queries raise करें — सब एक dashboard से।',
	'rm_value.cta': 'चलो शुरू करते हैं →',

	// Additional benefits
	'rm_value.informal_dsas_title': 'Informal DSAs discover करें',
	'rm_value.informal_dsas_desc':
		'बहुत से DSAs जो formally किसी corporate code में नहीं हैं, पर अच्छा काम करते हैं — उन्हें discover करें। Hidden talent pool।',
	'rm_value.peer_proof': '{{dsaCount}} DSAs और {{rmCount}} RMs पहले से इस platform पर हैं।',

	// ── Auth / Login ─────────────────────────────────────────────
	'auth.welcome_demo': 'Demo में आपका स्वागत है! सब features freely explore करें।',
	'auth.demo_unavailable': 'Demo अभी available नहीं है। Please फिर से try करें।',
	'auth.ip_blocked': 'IP block हो गया है। 24 घंटे बाद try करें या हमसे contact करें।',
	'auth.otp_wait': 'Please एक और OTP request करने से पहले wait करें',
	'auth.otp_sent': 'OTP successfully भेज दिया गया',
	'auth.otp_failed': 'OTP भेजने में fail हो गया',
	'auth.otp_invalid': 'Please valid 4-digit OTP enter करें',
	'auth.otp_no_session': 'कोई active OTP session नहीं है। Please पहले OTP request करें।',
	'auth.mobile_required': 'Mobile number ज़रूरी है',
	'auth.ip_blocked_long':
		'आपकी IP temporarily block हो गई है। 24 घंटे बाद फिर try करें या support से contact करें।',

	// ── Errors ───────────────────────────────────────────────────
	'error.not_found': 'जो page आप ढूंढ रहे हैं वो exist नहीं करता।',
	'error.server': 'एक unexpected server error हो गया।',
	'error.forbidden': 'आपको इस page को access करने की permission नहीं है।',
	'error.unauthorized': 'इस page को access करने के लिए login करना ज़रूरी है।',
	'error.rate_limit': 'बहुत ज़्यादा requests। Please बाद में try करें।',
	'error.generic': 'कुछ गड़बड़ हो गई।',
	'error.url_missing': 'ये URL exist नहीं करता या move हो गया है।',
	'error.go_home': 'Home जाएं',
	'error.try_url': 'URL check करें या homepage से site explore करें।',
	'error.check_permissions': 'Please सही permissions से login करें।',
	'error.rate_limit_wait': 'बहुत requests हो गई हैं। थोड़ा wait करें और फिर try करें।',
	'error.team_notified': 'हमारी team को इस issue की notification मिल गई है।',
	'error.path': 'Path:',
	'error.network': 'Network error। Please connection check करें और फिर try करें।',

	// ── Dashboard ────────────────────────────────────────────────
	'dashboard.welcome': 'Welcome, {{name}}',
	'dashboard.active_cases': 'Active Cases',
	'dashboard.active_case': 'Active Case',
	'dashboard.files_submitted': 'Files Submitted',
	'dashboard.sanctioned': 'Sanctioned',
	'dashboard.avg_processing': 'Avg. Processing',
	'dashboard.of_total': '{{total}} में से',
	'dashboard.no_cases_yet': 'अभी कोई case नहीं',
	'dashboard.this_month': 'इस महीने',
	'dashboard.amount_value': '{{amount}} value',
	'dashboard.avg_to_sanction': 'Sanction तक avg.',
	'dashboard.no_data_yet': 'अभी कोई data नहीं',
	'dashboard.quick_actions': 'Quick Actions',
	'dashboard.new_case': 'New Case',
	'dashboard.my_cases': 'My Cases',
	'dashboard.rm_contacts': 'RM Contacts',
	'dashboard.communicate': 'Communicate',
	'dashboard.soon': 'SOON',
	'dashboard.recent_activity': 'Recent Activity',
	'dashboard.view_all_activity': 'सारी Activity देखें',
	'dashboard.case_pipeline': 'Case Pipeline',
	'dashboard.active_count': '{{count}} active',
	'dashboard.no_active_pipeline': 'Pipeline में कोई active case नहीं',
	'dashboard.needs_attention': 'ध्यान दें',
	'dashboard.all_clear': 'सब ठीक है!',
	'dashboard.no_attention_needed': 'किसी भी case को अभी attention की ज़रूरत नहीं',
	'dashboard.more_attention': '+{{count}} और items जिन पर ध्यान देना है',
	'dashboard.recent_cases': 'Recent Cases',
	'dashboard.create_first_case': 'शुरू करने के लिए अपना पहला case बनाएं',
	'dashboard.view_all_cases': 'सभी {{count}} Cases देखें',
	'dashboard.view_all': 'सभी Cases देखें',
	'dashboard.amount_tbd': 'Amount TBD',

	// Dashboard — empty state
	'dashboard.empty_title': 'आपका Dashboard तैयार है',
	'dashboard.empty_desc':
		'Loan applications track करने, documents manage करने और RMs से connect होने के लिए अपना पहला case बनाएं। आपका dashboard data से भर जाएगा।',
	'dashboard.empty_cta': 'अपना पहला Case बनाएं',

	// Dashboard — banners
	'dashboard.profile_banner':
		'Personalized recommendations unlock करने के लिए अपना **business profile** complete करें।',
	'dashboard.profile_later': 'बाद में',
	'dashboard.profile_setup': 'Profile Set Up करें',
	'dashboard.sample_first_case':
		'आपने अपना पहला case बना लिया! क्या आप dashboard से **sample data** हटाना चाहेंगे?',
	'dashboard.keep_samples': 'Samples रखें',
	'dashboard.clear_samples': 'Samples हटाएं',
	'dashboard.clearing': 'हटा रहे हैं...',
	'dashboard.clear_failed': 'Sample data हटाने में fail। Please फिर से try करें।',
	'dashboard.sample_banner':
		'आप dashboard समझने के लिए **sample data** देख रहे हैं। हटाने के लिए dismiss करें।',
	'dashboard.dismiss': 'हटाएं',

	// Dashboard — RM contacts card
	'dashboard.no_rm_contacts': 'अभी कोई RM contacts नहीं',
	'dashboard.add_rm_hint': 'Cases submit करते वक्त RM contacts add करें',
	'dashboard.view_all_rm': 'सभी RM Contacts देखें',

	// Dashboard — attention types
	'dashboard.attention_query': 'Open Query',
	'dashboard.attention_expiring': 'Expiring Doc',
	'dashboard.attention_stuck': 'Stuck',

	// ── Cases ────────────────────────────────────────────────────
	'cases.title': 'My Cases',
	'cases.search_placeholder': 'Case label या ID से search करें...',
	'cases.all_stages': 'सभी Stages',
	'cases.all_loan_types': 'सभी Loan Types',
	'cases.all_lenders': 'सभी Lenders',
	'cases.clear_filters': 'सभी filters clear करें',
	'cases.showing': '{{total}} में से {{filtered}} cases दिख रहे हैं',
	'cases.sample': 'Sample',
	'cases.documents': 'Documents',
	'cases.query_one': 'query',
	'cases.query_many': 'queries',
	'cases.days_in_stage': '{{days}}d इस stage में',
	'cases.no_lenders': 'अभी कोई lender add नहीं किया',
	'cases.more_lenders': '+{{count}} और',
	'cases.no_match': 'कोई case आपके filters से match नहीं करता',
	'cases.no_match_hint': 'Search terms बदलें या सभी cases देखने के लिए filters clear करें।',
	'cases.clear_filter_btn': 'Filters Clear करें',
	'cases.empty_title': 'अभी कोई case नहीं',
	'cases.empty_desc':
		'शुरू करने के लिए अपना पहला case बनाएं। आप loan applications track कर पाएंगे, documents manage कर पाएंगे और RMs से connect हो पाएंगे।',
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
	'effort.easy': 'आसान',
	'effort.moderate': 'Medium',
	'effort.significant': 'काफी effort',

	// ── Documents ────────────────────────────────────────────────
	'doc.not_started': 'शुरू नहीं हुआ',
	'doc.requested': 'Requested',
	'doc.received': 'Received',
	'doc.uploaded': 'Uploaded',
	'doc.expired': 'Expired',
	'doc.expires_in': '{{days}}d में expire होगा',
	'doc.fresh': 'Fresh',
	'doc.identity': 'Identity',
	'doc.income': 'Income',
	'doc.property': 'Property',
	'doc.lender_specific': 'Lender Specific',
	'doc.other': 'Other',

	// ── Credit & Legal Status ────────────────────────────────────
	'credit.not_set': 'Set नहीं',
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
	'time.just_now': 'अभी',
	'time.minutes_ago': '{{count}}m पहले',
	'time.hours_ago': '{{count}}h पहले',
	'time.days_ago': '{{count}}d पहले',
	'time.weeks_ago': '{{count}}w पहले',
	'time.hours_remaining': 'घंटे बाकी',
	'time.days_remaining': 'दिन बाकी',

	// ── Pagination ───────────────────────────────────────────────
	'pagination.previous': 'पिछला',
	'pagination.next': 'अगला',
	'pagination.page_of': 'Page {{current}} of {{total}}',

	// ── Form ─────────────────────────────────────────────────────
	'form.saving': 'Save हो रहा है...',
	'form.saved': 'Save हो गया',
	'form.continue': 'Continue करें',
	'form.complete_details': 'Details पूरी करें',
	'form.view_edit': 'Details देखें / Edit करें',
	'form.add': 'Add करें',
	'form.remove': 'हटाएं',
	'form.update': 'Update करें',
	'form.create': 'बनाएं',
	'form.please_wait': 'Please wait करें',
	'form.view_details': 'Details देखें',
	'form.show_more': 'और दिखाएं',

	// ── Accuracy Rating ──────────────────────────────────────────
	'rating.income_estimation': 'Income Estimation',
	'rating.property_valuation': 'Property Valuation',
	'rating.eligibility_check': 'Eligibility Check',
	'rating.documentation': 'Documentation',
	'rating.overall': 'Overall',
	'rating.feedback_placeholder': 'कोई और feedback...',

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
	'dashboard.loanCount': 'आपके पास {count} लोन आवेदन हैं',
	'dashboard.selectLanguage': 'अपनी भाषा चुनें',

	// Status Summary
	'status.quickGlance': 'आपकी स्थिति एक नजर में',
	'status.readyToSubmit': 'जमा करने के लिए तैयार',
	'status.readyToSubmitDesc': 'बैंक को भेजने के लिए तैयार',
	'status.needsHelp': 'मदद की जरूरत है',
	'status.needsHelpDesc': 'बैंक को कुछ चाहिए',
	'status.urgent': 'तुरंत',
	'status.urgentDesc': 'तुरंत कार्रवाई की जरूरत है',

	// Actions & Next Steps
	'action.submitToBank': 'बैंक को भेजें',
	'action.addMissingInfo': 'गायब जानकारी जोड़ें',
	'action.followUpWithBank': 'बैंक को संपर्क करें',
	'action.viewAll': 'सभी देखें',
	'action.whatToDoToday': 'आज क्या करें',

	// Application Status (Simplified)
	'appStatus.draft': 'ड्राफ्ट - अभी तैयार नहीं',
	'appStatus.readyToSubmit': 'बैंक को भेजने के लिए तैयार',
	'appStatus.submitted': 'बैंक को भेजा गया - समीक्षा में',
	'appStatus.approved': 'Approve हो गया - बैंक ने हां कहा',
	'appStatus.rejected': 'Reject हो गया - बैंक ने नहीं कहा',
	'appStatus.bankAskedQuestion': 'बैंक को कुछ पूछना है',

	// Journey Steps (For Forms)
	'journey.step1': 'अपने बारे में बताएं',
	'journey.step2': 'प्रॉपर्टी कहां है?',
	'journey.step3': 'कितना पैसा चाहिए?',
	'journey.step4': 'आपकी आय',
	'journey.step5': 'दस्तावेज',
	'journey.ready': 'जमा करने के लिए तैयार',
	'journey.submitted': 'बैंक को भेजा गया',
	'journey.reviewing': 'बैंक देख रहा है',
	'journey.approved': 'Approve हो गया!',
	'journey.offer': 'बैंक का ऑफर',
	'journey.complete': 'सब कुछ हो गया!',
	'journey.percentage_complete': 'आप {percent}% तक पहुंच गए!',

	// Simplified Field Labels
	'field.yourName': 'आपका नाम?',
	'field.phoneNumber': 'फोन नंबर?',
	'field.city': 'कौन सा शहर?',
	'field.propertyType': 'प्रॉपर्टी कैसी है?',
	'field.propertyLocation': 'कहां है?',
	'field.propertyUse': 'इसे किसके लिए use करेंगे?',
	'field.propertyValue': 'प्रॉपर्टी की कीमत?',
	'field.propertyWorth': 'इसकी कीमत कितनी है?',
	'field.loanAmount': 'कितना उधार लेना है?',
	'field.loanYears': 'कितने सालों के लिए?',
	'field.incomeType': 'आप कैसे कमाते हैं?',
	'field.incomeAmount': 'महीने में कितना?',
	'field.incomeStability': 'कितने समय से स्थिर है?',

	// Property Type Options
	'propertyType.apartment': 'अपार्टमेंट (फ्लैट)',
	'propertyType.house': 'घर',
	'propertyType.plot': 'प्लॉट / जमीन',
	'propertyType.commercial': 'व्यावसायिक स्थान',
	'propertyType.other': 'अन्य',

	// Property Use Options
	'propertyUse.liveThere': 'आप वहां रहेंगे',
	'propertyUse.business': 'व्यवसाय के लिए',
	'propertyUse.rentOut': 'किराये पर दें',
	'propertyUse.investment': 'निवेश',

	// Income Type Options
	'incomeType.salariedJob': 'वेतन नौकरी',
	'incomeType.business': 'व्यवसाय',
	'incomeType.selfEmployed': 'अपने लिए काम',
	'incomeType.agriculture': 'कृषि',
	'incomeType.rental': 'किराया आय',
	'incomeType.professional': 'पेशेदार',
	'incomeType.multiple': 'कई स्रोत',

	// RM Dashboard
	'rm.loanFromAgents': 'एजेंटों से लोन',
	'rm.taskList': 'आपका कार्य सूची (आज)',
	'rm.actionNeeded': 'कार्रवाई की जरूरत है',
	'rm.reviewLater': 'बाद में देखें',
	'rm.alreadyApproved': 'पहले से Approve',
	'rm.bankUpdates': 'बैंक की अपडेट',
	'rm.shareWithAgents': 'एजेंटों के साथ शेयर करें',
	'rm.forwardToAgents': 'एजेंटों को भेजें',
	'rm.connected': '{count} एजेंटों से जुड़े हैं',

	// Help Text & Guidance
	'help.fillForm': 'अपने लोन के बारे में ये सवालों के जवाब दें',
	'help.complete': 'आप {percent}% तक पहुंच गए!',
	'help.nextStep': 'अगला: {step}',
	'help.bankAsked': 'बैंक को चाहिए:',
	'help.deadline': 'समय सीमा: {date}',
	'help.uploadedOn': '{date} को अपलोड किया गया',
	'help.validUntil': '{date} तक वैलिड है',

	// Dashboard Statistics
	'stats.thisMonth': 'इस महीने',
	'stats.approved': 'Approve हुए',
	'stats.submitted': 'जमा किए गए',
	'stats.processing': 'प्रसंस्करण',
	'stats.rejected': 'Reject हुए',

	// ── Application Form — Success & Evaluating ───────────────
	'app.submitted.title': 'Application Submit हो गई!',
	'app.submitted.message':
		'आपकी {{loanType}} loan application के लिए धन्यवाद। हमारी team 24-48 घंटों में आपसे contact करेगी।',
	'app.submitted.goHome': 'Home पर जाएं',
	'app.submitted.submitBtn': 'Application Submit करें',
	'app.submitted.submitting': 'Submit हो रहा है...',
	'app.submitted.backToOffers': 'Offers पर वापस जाएं',
	'app.evaluating.title': 'आपकी Application Evaluate हो रही है',
	'app.evaluating.offersReady': '{{count}} Offer{{plural}} तैयार!',
	'app.evaluating.error': 'कुछ गड़बड़ हो गई। फिर से try करें।',
	'app.evaluating.tryAgain': 'फिर से Try करें',
	'app.evaluating.goBack': 'वापस जाएं',
	'app.evaluating.insight1':
		'जो DSAs 5+ lenders compare करते हैं, वो 40% ज़्यादा cases close करते हैं।',
	'app.evaluating.insight2':
		'आपके client की income profile specialized programs से match हो रही है।',
	'app.evaluating.insight3': 'Tip: Client को present करने से पहले top 3 shortlist करें।',
	'app.evaluating.insight4':
		'हम सभी lenders की eligibility, rates, और processing fees check करते हैं।',
	'app.evaluating.insight5':
		'Multiple options दिखाने से client का trust बढ़ता है और conversions improve होते हैं।',

	// ── Policy Library (C.2) ──────────────────────────────────
	'policy_library.sort_recently_verified': 'हाल ही में verify किया गया',
	'policy_library.sort_due_soonest': 'जल्द due',
	'policy_library.sort_az': 'A–Z',
	'policy_library.badge_verified': 'Verified {{timeAgo}}',
	'policy_library.badge_not_yet': 'अभी तक verify नहीं हुआ',
	'policy_library.no_match': '"{{query}}" से कोई lender match नहीं हुआ',
	'policy_library.type_all': 'सभी types',

	// ── Admin Impersonation (C.4) ─────────────────────────────
	'admin.impersonate_btn': 'Impersonate',
	'admin.impersonate_title': '{{name}} के रूप में login करें?',
	'admin.impersonate_body':
		'आप उनका dashboard बिल्कुल वैसे ही देखेंगे जैसे वे देखते हैं। यह action log किया जाता है। एक banner आपको याद दिलाएगा कि आप किसके रूप में देख रहे हैं — admin पर वापस जाने के लिए "Exit" पर click करें।',
	'admin.impersonate_reason_label': 'कारण (आवश्यक)',
	'admin.impersonate_reason_placeholder': 'जैसे: रिपोर्ट किए गए results issue को debug करना',
	'admin.impersonate_start_btn': 'शुरू करें',
	'admin.impersonate_blocked_self': 'आप खुद को impersonate नहीं कर सकते',
	'admin.impersonate_blocked_suspended': 'User suspended है',
	'admin.impersonate_blocked_admin': 'Admin accounts को impersonate नहीं किया जा सकता'
};
