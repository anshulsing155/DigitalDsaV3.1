# Dashboard Redesign — Implementation Guide (Phase-by-Phase)

> **Status**: Ready to implement
> **Effort**: 4-5 days total
> **Complexity**: Medium (UI/UX changes, translations, component redesign)
> **Risk**: LOW (non-breaking, can test in parallel with current UI)

---

## Phase 1: Terminology & Translations (2 Days)

### Step 1.1: Update i18n Keys

**File**: `src/lib/i18n/en.ts`

**Add these new keys** (in addition to existing ones):

```typescript
// === DASHBOARD REDESIGN (NEW KEYS) ===

// Plain Language Terminology
'dashboard.intro': 'Hi {name}! 👋',
'dashboard.loanCount': 'You have {count} loan applications',
'dashboard.selectLanguage': 'Choose Your Language',

// Status Summary
'status.quickGlance': 'Quick Status at a Glance',
'status.readyToSubmit': 'Ready to Submit',
'status.needsHelp': 'Needs Help',
'status.urgent': 'Urgent',

// Actions
'action.submitToBank': 'Submit to Bank',
'action.addMissingInfo': 'Add Missing Information',
'action.followUpWithBank': 'Follow Up with Bank',
'action.viewAll': 'See All',

// Application Status
'appStatus.draft': 'Draft - Not Ready Yet',
'appStatus.readyToSubmit': 'Ready to Submit to Bank',
'appStatus.submitted': 'Submitted - Bank is Reviewing',
'appStatus.approved': 'Approved - Bank Said Yes',
'appStatus.rejected': 'Rejected - Bank Said No',

// Journey Steps
'journey.step1': 'Tell Us About Yourself',
'journey.step2': 'Where\'s the Property?',
'journey.step3': 'How Much Money?',
'journey.step4': 'Your Income',
'journey.step5': 'Documents',
'journey.ready': 'Ready to Submit',
'journey.submitted': 'Submitted to Bank',
'journey.reviewing': 'Bank is Reviewing',
'journey.approved': 'Approved!',
'journey.offer': 'Final Offer',
'journey.complete': 'Completed!',

// Field Labels (Simplified)
'field.yourName': 'Your Name?',
'field.phoneNumber': 'Phone Number?',
'field.city': 'Which City?',
'field.propertyType': 'What Type of Property?',
'field.propertyLocation': 'Where is It?',
'field.propertyUse': 'What Will It Be Used For?',
'field.propertyValue': 'Property Worth?',
'field.loanAmount': 'How Much to Borrow?',
'field.loanYears': 'For How Many Years?',
'field.incomeType': 'How Do You Earn?',
'field.incomeAmount': 'How Much Per Month?',
'field.incomeStability': 'Steady for How Long?',

// Property Type Options
'propertyType.apartment': 'Apartment (Flat)',
'propertyType.house': 'House',
'propertyType.plot': 'Plot / Land',
'propertyType.other': 'Other',

// Property Use Options
'propertyUse.liveThere': 'You\'ll Live There',
'propertyUse.business': 'Business Use',
'propertyUse.rentOut': 'Rent It Out',

// Income Type Options
'incomeType.salariedJob': 'Salaried Job',
'incomeType.business': 'Business',
'incomeType.selfEmployed': 'Self-Employed',
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
'rm.connected': 'Connected with {count} DSAs',

// Help Text
'help.fillForm': 'Answer these questions about your loan',
'help.complete': 'You\'re {percent}% done!',
'help.nextStep': 'Next: {step}',
'help.bankAsked': 'Bank Asked For:',
'help.deadline': 'Deadline: {date}',
```

### Step 1.2: Add Hindi Translations

**File**: `src/lib/i18n/hi.ts`

**Hindi Terminology** (examples):

```typescript
// === HINDI TRANSLATIONS ===

'dashboard.intro': 'नमस्ते {name}! 👋',
'dashboard.loanCount': 'आपके पास {count} लोन आवेदन हैं',
'dashboard.selectLanguage': 'अपनी भाषा चुनें',

'status.quickGlance': 'आपकी स्थिति एक नजर में',
'status.readyToSubmit': 'जमा करने के लिए तैयार',
'status.needsHelp': 'मदद की जरूरत है',
'status.urgent': 'तुरंत',

'action.submitToBank': 'बैंक को भेजें',
'action.addMissingInfo': 'गायब जानकारी जोड़ें',
'action.followUpWithBank': 'बैंक को संपर्क करें',
'action.viewAll': 'सभी देखें',

'appStatus.draft': 'ड्राफ्ट - अभी तैयार नहीं',
'appStatus.readyToSubmit': 'बैंक को भेजने के लिए तैयार',
'appStatus.submitted': 'बैंक को भेजा गया - समीक्षा में',
'appStatus.approved': 'मंजूर - बैंक ने हां कहा',
'appStatus.rejected': 'अस्वीकृत - बैंक ने नहीं कहा',

'field.yourName': 'आपका नाम?',
'field.phoneNumber': 'फोन नंबर?',
'field.city': 'कौन सा शहर?',

'propertyType.apartment': 'अपार्टमेंट',
'propertyType.house': 'घर',
'propertyType.plot': 'प्लॉट / जमीन',
'propertyType.other': 'अन्य',

'propertyUse.liveThere': 'आप वहां रहेंगे',
'propertyUse.business': 'व्यवसाय उपयोग',
'propertyUse.rentOut': 'किराये पर दें',

'incomeType.salariedJob': 'वेतन नौकरी',
'incomeType.business': 'व्यवसाय',
'incomeType.selfEmployed': 'स्व-नियोजित',
'incomeType.multiple': 'कई स्रोत',
```

### Step 1.3: Add Marathi Translations

**File**: `src/lib/i18n/mr.ts`

Create equivalent Marathi translations using same key structure.

---

## Phase 2: Dashboard Redesign (2 Days)

### Step 2.1: Redesign DSA Home Dashboard

**File**: `src/routes/dashboard/dsa/+page.svelte`

**Changes**:

1. **Add Language Selector** (top right):
```svelte
<div class="language-selector">
  <button onclick={() => setLanguage('en')}>English</button>
  <button onclick={() => setLanguage('hi')}>हिंदी</button>
  <button onclick={() => setLanguage('mr')}>मराठी</button>
</div>
```

2. **Add Status Summary Section** (3 colored boxes):
```svelte
<div class="status-grid">
  <StatusCard
    color="green"
    icon="✅"
    title={t('status.readyToSubmit')}
    count={readyToSubmitCount}
  />
  <StatusCard
    color="yellow"
    icon="⚠️"
    title={t('status.needsHelp')}
    count={needsHelpCount}
  />
  <StatusCard
    color="red"
    icon="🔴"
    title={t('status.urgent')}
    count={urgentCount}
  />
</div>
```

3. **Add Action List Section** (what to do today):
```svelte
<ActionList actions={actionItems} />
```

4. **Simplify Application List** (organize by status):
```svelte
<ApplicationGroupList
  groupByStatus={true}
  showJourneyIcon={true}
/>
```

### Step 2.2: Redesign RM Home Dashboard

**File**: `src/routes/dashboard/rm/+page.svelte`

**Changes**: Apply similar structure to RM dashboard

---

## Phase 3: Form Simplification (1.5 Days)

### Step 3.1: Create Plain Language Form Wrapper

**File**: `src/lib/components/form/PlainLanguageForm.svelte` (NEW)

```svelte
<script lang="ts">
  import { t } from '$lib/i18n';

  interface Props {
    step: number;
    totalSteps: number;
    title: string;
    description: string;
    icon: string;
    children?: any;
  }

  let { step, totalSteps, title, description, icon, children }: Props = $props();

  const progress = $derived((step / totalSteps) * 100);
</script>

<div class="form-wrapper">
  <!-- Progress Bar -->
  <div class="progress-section">
    <div class="progress-bar" style="width: {progress}%"></div>
    <div class="progress-text">
      {t('help.complete', { percent: Math.round(progress) })}
    </div>
  </div>

  <!-- Step Header -->
  <div class="step-header">
    <div class="step-icon">{icon}</div>
    <div class="step-info">
      <h2 class="step-title">{title}</h2>
      <p class="step-description">{description}</p>
    </div>
  </div>

  <!-- Form Content -->
  <div class="form-content">
    <slot />
  </div>

  <!-- Navigation -->
  <div class="form-navigation">
    {#if step > 1}
      <button class="btn-secondary" onclick={() => onPrevious?.()}>
        ← {t('common.back')}
      </button>
    {/if}
    <button class="btn-primary" onclick={() => onNext?.()}>
      {step === totalSteps ? t('common.submit') : t('common.next')} →
    </button>
  </div>
</div>

<style>
  .form-wrapper {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }

  .progress-bar {
    height: 6px;
    background: linear-gradient(to right, #10b981, #3b82f6);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .step-header {
    display: flex;
    gap: 20px;
    margin: 30px 0;
  }

  .step-icon {
    font-size: 48px;
    text-align: center;
    min-width: 60px;
  }

  .step-title {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
    color: #1f2937;
  }

  .step-description {
    font-size: 14px;
    color: #6b7280;
    margin: 5px 0 0 0;
  }

  .form-content {
    margin: 30px 0;
  }

  .form-navigation {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    margin-top: 30px;
  }

  .btn-primary {
    flex: 1;
    padding: 12px 20px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
  }

  .btn-secondary {
    flex: 1;
    padding: 12px 20px;
    background: #e5e7eb;
    color: #1f2937;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
</style>
```

### Step 3.2: Update Home Loan Form

**File**: `src/routes/(app)/form/home-loan/+page.svelte`

**Change from**: All fields on one page
**Change to**: Step-by-step wizard using PlainLanguageForm

**Example Step 1** (Tell Us About Yourself):

```svelte
<PlainLanguageForm
  step={currentStep}
  totalSteps={5}
  title={t('journey.step1')}
  description={t('help.fillForm')}
  icon="👤"
>
  <TextInput
    label={t('field.yourName')}
    placeholder="Rajesh Kumar"
    bind:value={formData.applicantName}
  />
  <TextInput
    label={t('field.phoneNumber')}
    placeholder="98XXXXXX00"
    bind:value={formData.phoneNumber}
  />
  <Select
    label={t('field.city')}
    options={cities}
    bind:value={formData.city}
    icon="📍"
  />
</PlainLanguageForm>
```

---

## Phase 4: New Components (1 Day)

### Create these new components:

1. **StatusCard.svelte**
   - Display colored box with icon, title, count
   - Click to see applications in that status

2. **ActionList.svelte**
   - Show 3-5 top actions for today
   - Green/yellow/red priority icons
   - "Click here" pointer

3. **JourneyVisualization.svelte**
   - Visual timeline of loan journey
   - Show current step
   - Next step highlighted
   - Icon + text for each step

4. **SimpleStatusBadge.svelte**
   - Replace "submitted" with "📤 Submitted"
   - Replace "approved" with "✅ Approved"
   - Color-coded (green/yellow/red)

---

## Color & Icon Implementation

### CSS Variables (in app.css):

```css
:root {
  --color-ready: #10b981; /* Green */
  --color-pending: #f59e0b; /* Yellow */
  --color-urgent: #ef4444; /* Red */
}
```

### Icon Mapping:

```typescript
const ICONS = {
  applicant: '👤',
  property: '🏠',
  money: '💰',
  documents: '📄',
  approved: '✅',
  rejected: '❌',
  waiting: '⏳',
  reviewing: '🔍',
  offer: '💳',
  contact: '🤝',
  message: '📱',
  email: '📧',
  alert: '🔔',
  stats: '📊',
  rating: '⭐',
  action: '🎯',
};
```

---

## Testing Checklist

- [ ] Language selector works (en/hi/mr)
- [ ] All translations display correctly
- [ ] Status cards show correct colors
- [ ] Action list shows relevant actions
- [ ] Form progress bar updates
- [ ] Form steps navigate correctly
- [ ] Icons render in all browsers
- [ ] Mobile layout is readable
- [ ] No text overflows
- [ ] Hindi/Marathi text is readable
- [ ] Dark mode works with new colors

---

## Rollout Strategy

### Option 1: Gradual Rollout (Recommended)
- Deploy redesigned dashboards behind feature flag
- Test with 10% of users first
- Gather feedback
- Expand to 50%, then 100%

### Option 2: Big Bang
- Deploy all changes at once
- Provide support hotline for questions

---

## Support Resources

Prepare for launch:
- [ ] Create help videos (with Hindi/Marathi subtitles)
- [ ] Create quick start guide (visual, minimal text)
- [ ] Set up FAQ page
- [ ] Prepare support team with talking points
- [ ] Create WhatsApp/call support script in local language

---

## Success Metrics to Track

Post-launch, monitor:
- Support ticket count (should ↓ by 50%)
- Form completion rate (should ↑ by 40%)
- Average time to complete form (should ↓ by 40%)
- User satisfaction (survey)
- Language preference distribution

