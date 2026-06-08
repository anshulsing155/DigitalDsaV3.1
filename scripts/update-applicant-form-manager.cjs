/**
 * Programmatic update to applicantFormManager.svelte.ts
 * Adds: director state management, BT numeric counters, director validation
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
	__dirname,
	'..',
	'src',
	'lib',
	'components',
	'applicantFormManager.svelte.ts'
);
let c = fs.readFileSync(filePath, 'utf-8');
const NL = c.includes('\r\n') ? '\r\n' : '\n';

function assert(condition, msg) {
	if (!condition) {
		console.error('ASSERTION FAILED:', msg);
		process.exit(1);
	}
}

// ═══════════════════════════════════════════════════════════════
// 1. ADD IMPORTS after last existing import
// ═══════════════════════════════════════════════════════════════
const importMarker = `} from '$lib/utils/applicantRecoveryDetector';`;
assert(c.includes(importMarker), 'Import marker not found');
c = c.replace(
	importMarker,
	importMarker +
		NL +
		NL +
		`import { untrack } from 'svelte';` +
		NL +
		`import {` +
		NL +
		`\ttype DirectorForm,` +
		NL +
		`\tinitDirectorForms,` +
		NL +
		`\tisCardComplete,` +
		NL +
		`\tresizeDirectorForms,` +
		NL +
		`\tcreateEmptyDirectorForm,` +
		NL +
		`\tvalidateAllDirectors,` +
		NL +
		`\tcommitDirectorsToApplicants,` +
		NL +
		`\tMEMBER_LABEL_MAP,` +
		NL +
		`\tROLE_MAP` +
		NL +
		`} from '$lib/utils/directorFormUtils';` +
		NL +
		`import type { DirectorDisplayRow } from '$lib/components/ApplicantSummaryTable.svelte';`
);

// ═══════════════════════════════════════════════════════════════
// 2. REPLACE BT_STRUCTURE_OPTIONS constant
// ═══════════════════════════════════════════════════════════════
const btOptionsRegex = /export const BT_STRUCTURE_OPTIONS = \[[\s\S]*?\] as const;/;
assert(btOptionsRegex.test(c), 'BT_STRUCTURE_OPTIONS not found');
c = c.replace(
	btOptionsRegex,
	`/** Company types where all directors get full financial profiling (no onProperty/onEMI choice) */` +
		NL +
		`export const FULL_PROFILE_COMPANY_TYPES = ['Partnership Firm', 'LLP', 'One Person Company (OPC)'];` +
		NL +
		NL +
		`/** Backward-compat map: old btExistingStructure strings → { co, guar } */` +
		NL +
		`const BT_STRUCTURE_COMPAT: Record<string, { co: number; guar: number }> = {` +
		NL +
		`\tsingle_borrower: { co: 0, guar: 0 },` +
		NL +
		`\tborrower_1co: { co: 1, guar: 0 },` +
		NL +
		`\tborrower_2co: { co: 2, guar: 0 },` +
		NL +
		`\tborrower_co_guarantor: { co: 1, guar: 1 },` +
		NL +
		`\tborrower_2co_guarantor: { co: 2, guar: 1 }` +
		NL +
		`};`
);

// ═══════════════════════════════════════════════════════════════
// 3. REPLACE BT STATE section (btExistingStructure → numeric counters)
// ═══════════════════════════════════════════════════════════════
const btStateStart = `\tlet btExistingStructure = $state('');`;
const btStateEnd = `\t});` + NL + NL + `\t// ── Form + Table state`;
assert(c.includes(btStateStart), 'btExistingStructure state not found');
assert(c.includes(btStateEnd), 'BT state end marker not found');

const btStartIdx = c.indexOf(btStateStart);
const btEndIdx = c.indexOf(btStateEnd);
assert(btStartIdx < btEndIdx, 'BT state markers in wrong order');

const btNewContent =
	`\tlet btCoApplicantCount = $state(0);` +
	NL +
	`\tlet btGuarantorCount = $state(0);` +
	NL +
	NL +
	`\t// Sync from persisted loanData on mount (with backward compat for old btExistingStructure)` +
	NL +
	`\t$effect(() => {` +
	NL +
	`\t\tconst storedCo = currentLoanAnswers.btCoApplicantCount;` +
	NL +
	`\t\tconst storedGuar = currentLoanAnswers.btGuarantorCount;` +
	NL +
	`\t\tif (typeof storedCo === 'number' && btCoApplicantCount === 0 && btGuarantorCount === 0) {` +
	NL +
	`\t\t\tbtCoApplicantCount = storedCo;` +
	NL +
	`\t\t\tbtGuarantorCount = typeof storedGuar === 'number' ? storedGuar : 0;` +
	NL +
	`\t\t} else if (btCoApplicantCount === 0 && btGuarantorCount === 0) {` +
	NL +
	`\t\t\t// Backward compat: convert old btExistingStructure string` +
	NL +
	`\t\t\tconst oldStructure = (currentLoanAnswers.btExistingStructure as string) ?? '';` +
	NL +
	`\t\t\tif (oldStructure && BT_STRUCTURE_COMPAT[oldStructure]) {` +
	NL +
	`\t\t\t\tconst { co, guar } = BT_STRUCTURE_COMPAT[oldStructure];` +
	NL +
	`\t\t\t\tbtCoApplicantCount = co;` +
	NL +
	`\t\t\t\tbtGuarantorCount = guar;` +
	NL +
	`\t\t\t}` +
	NL +
	`\t\t}` +
	NL +
	`\t});` +
	NL +
	NL +
	`\tconst btExpectedCount = $derived(` +
	NL +
	`\t\t(btCoApplicantCount > 0 || btGuarantorCount > 0) ? 1 + btCoApplicantCount + btGuarantorCount : 0` +
	NL +
	`\t);` +
	NL +
	NL +
	`\tfunction setBtCoApplicantCount(count: number) {` +
	NL +
	`\t\tbtCoApplicantCount = count;` +
	NL +
	`\t\tpersistBtCounts(count, btGuarantorCount);` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tfunction setBtGuarantorCount(count: number) {` +
	NL +
	`\t\tbtGuarantorCount = count;` +
	NL +
	`\t\tpersistBtCounts(btCoApplicantCount, count);` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tfunction persistBtCounts(co: number, guar: number) {` +
	NL +
	`\t\tconst data = formState.loanData as Record<string, unknown>;` +
	NL +
	`\t\tconst loanAnswers = (data[currentLoanName] ?? {}) as Record<string, unknown>;` +
	NL +
	`\t\tformState.replaceLoanData({` +
	NL +
	`\t\t\t...data,` +
	NL +
	`\t\t\t[currentLoanName]: {` +
	NL +
	`\t\t\t\t...loanAnswers,` +
	NL +
	`\t\t\t\tbtCoApplicantCount: co,` +
	NL +
	`\t\t\t\tbtGuarantorCount: guar,` +
	NL +
	`\t\t\t\tbtExpectedApplicantCount: 1 + co + guar` +
	NL +
	`\t\t\t}` +
	NL +
	`\t\t});` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tconst btMismatchWarning = $derived.by(() => {` +
	NL +
	`\t\tif (!isBTCase || !btExpectedCount) return '';` +
	NL +
	`\t\tconst actualCount = formState.applicants.filter((a) => a.applicantType).length;` +
	NL +
	`\t\tif (actualCount > 0 && actualCount !== btExpectedCount) {` +
	NL +
	`\t\t\treturn \`Expected \${btExpectedCount} applicant(s) based on existing loan, but \${actualCount} added. Lenders require matching structure for balance transfer.\`;` +
	NL +
	`\t\t}` +
	NL +
	`\t\treturn '';` +
	NL +
	`\t});` +
	NL +
	NL +
	`\t// ── Director State (secured loans — inline management) ────────────` +
	NL +
	NL +
	`\tlet directorFormsMap: Map<string, DirectorForm[]> = $state(new Map());` +
	NL +
	`\tlet editingDirectorCompanyId: string | null = $state(null);` +
	NL +
	`\tlet editingDirectorIdx: number | null = $state(null);` +
	NL +
	`\tlet directorModalOpen = $state(false);` +
	NL +
	`\tlet directorError = $state('');` +
	NL +
	`\tlet showDirectorRemovePicker = $state(false);` +
	NL +
	`\tlet removePickerFilled: DirectorForm[] = $state([]);` +
	NL +
	`\tlet removePickerTargetCount = $state(0);` +
	NL +
	`\tlet removePickerCompanyId: string = $state('');` +
	NL +
	NL +
	`\t// ── Director fingerprint for reactive init ──────────────────────` +
	NL +
	`\tconst companyDirectorFingerprint = $derived(` +
	NL +
	`\t\tformState.applicants` +
	NL +
	`\t\t\t.filter((a) => a.applicantType === 'Company')` +
	NL +
	`\t\t\t.map((a) => \`\${a.id}|\${a.numberOfDirectorsOrPartners}|\${a.companyType}\`)` +
	NL +
	`\t\t\t.join(';;')` +
	NL +
	`\t);` +
	NL +
	NL +
	`\t// ── Director init/resize effect ─────────────────────────────────` +
	NL +
	`\t$effect(() => {` +
	NL +
	`\t\t// eslint-disable-next-line @typescript-eslint/no-unused-expressions` +
	NL +
	`\t\tcompanyDirectorFingerprint; // subscribe to fingerprint changes only` +
	NL +
	NL +
	`\t\tif (!hasRoleQuestions) return; // Unsecured loans handle directors differently` +
	NL +
	NL +
	`\t\tconst companies = untrack(() =>` +
	NL +
	`\t\t\tformState.applicants.filter((a) => a.applicantType === 'Company')` +
	NL +
	`\t\t);` +
	NL +
	NL +
	`\t\tlet nextMap = new Map(directorFormsMap);` +
	NL +
	`\t\tlet changed = false;` +
	NL +
	NL +
	`\t\tfor (const company of companies) {` +
	NL +
	`\t\t\tconst companyId = company.id as string;` +
	NL +
	`\t\t\tif (!companyId) continue;` +
	NL +
	`\t\t\tconst expectedCount = Number(company.numberOfDirectorsOrPartners) || 1;` +
	NL +
	`\t\t\tconst companyType = (company.companyType as string) ?? '';` +
	NL +
	`\t\t\tconst isOPC = companyType === 'One Person Company (OPC)';` +
	NL +
	`\t\t\tconst isFullProfile = FULL_PROFILE_COMPANY_TYPES.includes(companyType);` +
	NL +
	`\t\t\tconst existing = nextMap.get(companyId);` +
	NL +
	NL +
	`\t\t\tif (!existing) {` +
	NL +
	`\t\t\t\tlet forms = initDirectorForms(company as Record<string, unknown>, false);` +
	NL +
	`\t\t\t\tconst opcOpts = isOPC ? { isOPC: true } : undefined;` +
	NL +
	`\t\t\t\twhile (forms.length < expectedCount) {` +
	NL +
	`\t\t\t\t\tforms = [...forms, createEmptyDirectorForm(false, opcOpts)];` +
	NL +
	`\t\t\t\t}` +
	NL +
	`\t\t\t\tif (isFullProfile) {` +
	NL +
	`\t\t\t\t\tforms = forms.map((f) => ({` +
	NL +
	`\t\t\t\t\t\t...f,` +
	NL +
	`\t\t\t\t\t\tonProperty: f.onProperty || 'false',` +
	NL +
	`\t\t\t\t\t\tonEMI: f.onEMI || 'false'` +
	NL +
	`\t\t\t\t\t}));` +
	NL +
	`\t\t\t\t}` +
	NL +
	`\t\t\t\tnextMap.set(companyId, forms);` +
	NL +
	`\t\t\t\tchanged = true;` +
	NL +
	`\t\t\t} else if (existing.length !== expectedCount) {` +
	NL +
	`\t\t\t\tconst { forms, needsUserChoice } = resizeDirectorForms(existing, expectedCount, false);` +
	NL +
	`\t\t\t\tif (needsUserChoice.length > 0) {` +
	NL +
	`\t\t\t\t\tremovePickerFilled = needsUserChoice;` +
	NL +
	`\t\t\t\t\tremovePickerTargetCount = expectedCount;` +
	NL +
	`\t\t\t\t\tremovePickerCompanyId = companyId;` +
	NL +
	`\t\t\t\t\tshowDirectorRemovePicker = true;` +
	NL +
	`\t\t\t\t} else {` +
	NL +
	`\t\t\t\t\tnextMap.set(companyId, forms);` +
	NL +
	`\t\t\t\t\tchanged = true;` +
	NL +
	`\t\t\t\t}` +
	NL +
	`\t\t\t}` +
	NL +
	`\t\t}` +
	NL +
	NL +
	`\t\tconst companyIds = new Set(companies.map((cc) => cc.id as string).filter(Boolean));` +
	NL +
	`\t\tfor (const id of nextMap.keys()) {` +
	NL +
	`\t\t\tif (!companyIds.has(id)) {` +
	NL +
	`\t\t\t\tnextMap.delete(id);` +
	NL +
	`\t\t\t\tchanged = true;` +
	NL +
	`\t\t\t}` +
	NL +
	`\t\t}` +
	NL +
	NL +
	`\t\tif (changed) {` +
	NL +
	`\t\t\tdirectorFormsMap = nextMap;` +
	NL +
	`\t\t}` +
	NL +
	`\t});` +
	NL +
	NL +
	`\t// ── Director row map for summary table ───────────────────────────` +
	NL +
	`\tconst directorRowsMap = $derived.by(() => {` +
	NL +
	`\t\tconst map = new Map<string, DirectorDisplayRow[]>();` +
	NL +
	`\t\tfor (const [companyId, forms] of directorFormsMap) {` +
	NL +
	`\t\t\tconst company = formState.applicants.find((a) => a.id === companyId);` +
	NL +
	`\t\t\tif (!company) continue;` +
	NL +
	`\t\t\tconst companyType = (company.companyType as string) ?? '';` +
	NL +
	`\t\t\tconst memberLabel = MEMBER_LABEL_MAP[companyType] ?? 'Director';` +
	NL +
	`\t\t\tconst isFullProfile = FULL_PROFILE_COMPANY_TYPES.includes(companyType);` +
	NL +
	`\t\t\tconst rows: DirectorDisplayRow[] = forms.map((d, i) => ({` +
	NL +
	`\t\t\t\tdirectorIndex: i,` +
	NL +
	`\t\t\t\tname: d.fullName?.trim() || \`\${memberLabel} \${i + 1}\`,` +
	NL +
	`\t\t\t\trole: memberLabel,` +
	NL +
	`\t\t\t\tisComplete: isCardComplete(d, false, companyType),` +
	NL +
	`\t\t\t\townershipPercent: d.ownershipPercent || undefined,` +
	NL +
	`\t\t\t\tonProperty: d.onProperty,` +
	NL +
	`\t\t\t\tonEMI: d.onEMI,` +
	NL +
	`\t\t\t\tfullProfile: isFullProfile` +
	NL +
	`\t\t\t}));` +
	NL +
	`\t\t\tmap.set(companyId, rows);` +
	NL +
	`\t\t}` +
	NL +
	`\t\treturn map;` +
	NL +
	`\t});` +
	NL +
	NL +
	`\t// ── All directors complete (for isNextEnabled) ───────────────────` +
	NL +
	`\tconst allDirectorsComplete = $derived.by(() => {` +
	NL +
	`\t\tfor (const [companyId, forms] of directorFormsMap) {` +
	NL +
	`\t\t\tconst company = formState.applicants.find((a) => a.id === companyId);` +
	NL +
	`\t\t\tif (!company) continue;` +
	NL +
	`\t\t\tconst companyType = (company.companyType as string) ?? '';` +
	NL +
	`\t\t\tfor (const d of forms) {` +
	NL +
	`\t\t\t\tif (!isCardComplete(d, false, companyType)) return false;` +
	NL +
	`\t\t\t}` +
	NL +
	`\t\t}` +
	NL +
	`\t\treturn true;` +
	NL +
	`\t});` +
	NL +
	NL +
	`\t// ── Director handlers ────────────────────────────────────────────` +
	NL +
	`\tfunction handleEditDirector(companyId: string, directorIndex: number) {` +
	NL +
	`\t\teditingDirectorCompanyId = companyId;` +
	NL +
	`\t\teditingDirectorIdx = directorIndex;` +
	NL +
	`\t\tdirectorModalOpen = true;` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tfunction handleDirectorSave(data: DirectorForm) {` +
	NL +
	`\t\tif (editingDirectorCompanyId === null || editingDirectorIdx === null) return;` +
	NL +
	`\t\tconst forms = directorFormsMap.get(editingDirectorCompanyId);` +
	NL +
	`\t\tif (!forms) return;` +
	NL +
	`\t\tconst updated = forms.map((d, i) => (i === editingDirectorIdx ? data : d));` +
	NL +
	`\t\tdirectorFormsMap = new Map(directorFormsMap).set(editingDirectorCompanyId, updated);` +
	NL +
	`\t\teditingDirectorIdx = null;` +
	NL +
	`\t\teditingDirectorCompanyId = null;` +
	NL +
	`\t\tdirectorModalOpen = false;` +
	NL +
	`\t\tdirectorError = '';` +
	NL +
	`\t\tglobalRoleError = '';` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tfunction handleDirectorModalClose() {` +
	NL +
	`\t\teditingDirectorIdx = null;` +
	NL +
	`\t\teditingDirectorCompanyId = null;` +
	NL +
	`\t\tdirectorModalOpen = false;` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tfunction handleRemovePickerConfirm(keepIndexes: number[]) {` +
	NL +
	`\t\tconst kept = keepIndexes.map((i) => removePickerFilled[i]);` +
	NL +
	`\t\twhile (kept.length < removePickerTargetCount) {` +
	NL +
	`\t\t\tkept.push(createEmptyDirectorForm(false));` +
	NL +
	`\t\t}` +
	NL +
	`\t\tdirectorFormsMap = new Map(directorFormsMap).set(removePickerCompanyId, kept);` +
	NL +
	`\t\tshowDirectorRemovePicker = false;` +
	NL +
	`\t\tremovePickerFilled = [];` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tfunction handleRemovePickerCancel() {` +
	NL +
	`\t\tconst forms = directorFormsMap.get(removePickerCompanyId);` +
	NL +
	`\t\tif (forms) {` +
	NL +
	`\t\t\tconst list = [...formState.applicants];` +
	NL +
	`\t\t\tconst idx = list.findIndex((a) => a.id === removePickerCompanyId);` +
	NL +
	`\t\t\tif (idx >= 0) {` +
	NL +
	`\t\t\t\tlist[idx] = { ...list[idx], numberOfDirectorsOrPartners: String(forms.length) };` +
	NL +
	`\t\t\t\tformState.replaceApplicants(list);` +
	NL +
	`\t\t\t}` +
	NL +
	`\t\t}` +
	NL +
	`\t\tshowDirectorRemovePicker = false;` +
	NL +
	`\t\tremovePickerFilled = [];` +
	NL +
	`\t}` +
	NL +
	NL +
	`\tfunction getDirectorModalData() {` +
	NL +
	`\t\tif (editingDirectorCompanyId === null || editingDirectorIdx === null) return null;` +
	NL +
	`\t\tconst forms = directorFormsMap.get(editingDirectorCompanyId);` +
	NL +
	`\t\tif (!forms || !forms[editingDirectorIdx]) return null;` +
	NL +
	`\t\tconst company = formState.applicants.find((a) => a.id === editingDirectorCompanyId);` +
	NL +
	`\t\tconst companyType = (company?.companyType as string) ?? '';` +
	NL +
	`\t\treturn {` +
	NL +
	`\t\t\tform: forms[editingDirectorIdx],` +
	NL +
	`\t\t\tallForms: forms,` +
	NL +
	`\t\t\tcompanyType,` +
	NL +
	`\t\t\tmemberLabel: MEMBER_LABEL_MAP[companyType] ?? 'Director'` +
	NL +
	`\t\t};` +
	NL +
	`\t}`;

c =
	c.substring(0, btStartIdx) +
	btNewContent +
	NL +
	NL +
	`\t// ── Form + Table state` +
	c.substring(btEndIdx + btStateEnd.length);

// ═══════════════════════════════════════════════════════════════
// 5. MODIFY deleteApplicant — add Company cleanup after main removal
// ═══════════════════════════════════════════════════════════════
const deleteCleanupMarker = `\t\t// Remove from active list and re-index applicant errors`;
assert(c.includes(deleteCleanupMarker), 'deleteApplicant cleanup marker not found');

const companyCleanup =
	`\t\t// When deleting a Company, clean up director forms and linked Individual entries` +
	NL +
	`\t\tif (applicant.applicantType === 'Company') {` +
	NL +
	`\t\t\tconst companyId = applicant.id as string;` +
	NL +
	`\t\t\tif (companyId) {` +
	NL +
	`\t\t\t\tconst nextMap = new Map(directorFormsMap);` +
	NL +
	`\t\t\t\tnextMap.delete(companyId);` +
	NL +
	`\t\t\t\tdirectorFormsMap = nextMap;` +
	NL +
	`\t\t\t}` +
	NL +
	`\t\t}` +
	NL +
	NL;

c = c.replace(deleteCleanupMarker, companyCleanup + deleteCleanupMarker);

// After the main replaceApplicants in delete, add linked Individual cleanup
const deleteReplaceMarker = `\t\tformState.replaceApplicants(formState.applicants.filter((_, i) => i !== index));`;
assert(c.includes(deleteReplaceMarker), 'deleteApplicant replaceApplicants not found');
c = c.replace(
	deleteReplaceMarker,
	deleteReplaceMarker +
		NL +
		`\t\t// Clean up linked Individual entries if Company was deleted` +
		NL +
		`\t\tif (applicant.applicantType === 'Company' && applicant.id) {` +
		NL +
		`\t\t\tformState.replaceApplicants(` +
		NL +
		`\t\t\t\tformState.applicants.filter((a) => a.linkedCompanyId !== applicant.id)` +
		NL +
		`\t\t\t);` +
		NL +
		`\t\t}`
);

// ═══════════════════════════════════════════════════════════════
// 6. MODIFY validateStep — add director validation before role check
// ═══════════════════════════════════════════════════════════════
const roleCheckMarker = `\t\tconst roleError = getRoleValidationError(applicants as LegacyApplicant[], hasRoleQuestions);`;
assert(c.includes(roleCheckMarker), 'validateStep role check marker not found');

const directorValidation =
	`\t\t// Validate and commit directors for all Company applicants` +
	NL +
	`\t\tif (hasRoleQuestions) {` +
	NL +
	`\t\t\tlet latestApplicants = formState.applicants as Array<Record<string, unknown>>;` +
	NL +
	NL +
	`\t\t\tfor (const company of [...latestApplicants].filter((a) => a.applicantType === 'Company')) {` +
	NL +
	`\t\t\t\tconst companyId = company.id as string;` +
	NL +
	`\t\t\t\tconst forms = directorFormsMap.get(companyId);` +
	NL +
	`\t\t\t\tif (!forms || forms.length === 0) continue;` +
	NL +
	NL +
	`\t\t\t\tconst companyType = (company.companyType as string) ?? '';` +
	NL +
	`\t\t\t\tconst memberLabel = MEMBER_LABEL_MAP[companyType] ?? 'Director';` +
	NL +
	`\t\t\t\tconst role = ROLE_MAP[companyType] ?? 'director';` +
	NL +
	`\t\t\t\tconst dirErrors = validateAllDirectors(forms, false, memberLabel, companyType);` +
	NL +
	NL +
	`\t\t\t\tif (dirErrors.length > 0) {` +
	NL +
	`\t\t\t\t\tdirectorError = dirErrors[0];` +
	NL +
	`\t\t\t\t\tglobalRoleError = dirErrors[0];` +
	NL +
	`\t\t\t\t\treturn false;` +
	NL +
	`\t\t\t\t}` +
	NL +
	NL +
	`\t\t\t\tconst snapshotForms = $state.snapshot(forms) as DirectorForm[];` +
	NL +
	`\t\t\t\tconst isFullProfile = FULL_PROFILE_COMPANY_TYPES.includes(companyType);` +
	NL +
	`\t\t\t\tconst formsToCommit = isFullProfile` +
	NL +
	`\t\t\t\t\t? snapshotForms.map((d: DirectorForm) => ({ ...d, onEMI: 'true' }))` +
	NL +
	`\t\t\t\t\t: snapshotForms;` +
	NL +
	NL +
	`\t\t\t\tlatestApplicants = commitDirectorsToApplicants(` +
	NL +
	`\t\t\t\t\tcompanyId, formsToCommit, latestApplicants, role` +
	NL +
	`\t\t\t\t);` +
	NL +
	`\t\t\t}` +
	NL +
	NL +
	`\t\t\tformState.replaceApplicants(latestApplicants);` +
	NL +
	`\t\t\tdirectorError = '';` +
	NL +
	`\t\t}` +
	NL +
	NL;

c = c.replace(roleCheckMarker, directorValidation + roleCheckMarker);

// ═══════════════════════════════════════════════════════════════
// 7. MODIFY isNextEnabled — add allDirectorsComplete
// ═══════════════════════════════════════════════════════════════
c = c.replace(
	`\t\tsetIsNextEnabled(\n\t\t\tformLevelComplete &&\n\t\t\thasApplicants &&\n\t\t\tallComplete &&\n\t\t\tnoDuplicates &&\n\t\t\trolesValid &&\n\t\t\t!globalRoleError\n\t\t);`,
	`\t\tsetIsNextEnabled(\n\t\t\tformLevelComplete &&\n\t\t\thasApplicants &&\n\t\t\tallComplete &&\n\t\t\tallDirectorsComplete &&\n\t\t\tnoDuplicates &&\n\t\t\trolesValid &&\n\t\t\t!globalRoleError\n\t\t);`
);

// Also try with \r\n in case the file uses Windows line endings
c = c.replace(
	`\t\tsetIsNextEnabled(\r\n\t\t\tformLevelComplete &&\r\n\t\t\thasApplicants &&\r\n\t\t\tallComplete &&\r\n\t\t\tnoDuplicates &&\r\n\t\t\trolesValid &&\r\n\t\t\t!globalRoleError\r\n\t\t);`,
	`\t\tsetIsNextEnabled(\r\n\t\t\tformLevelComplete &&\r\n\t\t\thasApplicants &&\r\n\t\t\tallComplete &&\r\n\t\t\tallDirectorsComplete &&\r\n\t\t\tnoDuplicates &&\r\n\t\t\trolesValid &&\r\n\t\t\t!globalRoleError\r\n\t\t);`
);

// ═══════════════════════════════════════════════════════════════
// 8. MODIFY return object — replace old BT exports with new ones + director state
// ═══════════════════════════════════════════════════════════════

// Replace BT_STRUCTURE_OPTIONS constant export
c = c.replace(`\t\tBT_STRUCTURE_OPTIONS,`, `\t\tFULL_PROFILE_COMPANY_TYPES,`);

// Replace btExistingStructure getter with new BT getters
c = c.replace(
	`\t\tget btExistingStructure() { return btExistingStructure; },`,
	`\t\tget btCoApplicantCount() { return btCoApplicantCount; },` +
		NL +
		`\t\tget btGuarantorCount() { return btGuarantorCount; },`
);

// Replace setBtStructure with new handlers
c = c.replace(
	`\t\tsetBtStructure,`,
	`\t\tsetBtCoApplicantCount,` + NL + `\t\tsetBtGuarantorCount,`
);

// Add director state exports — insert before retriggerRecoveryDetection
c = c.replace(
	`\t\t// Handlers\n\t\tretriggerRecoveryDetection,`,
	`\t\t// Director state` +
		NL +
		`\t\tget directorFormsMap() { return directorFormsMap; },` +
		NL +
		`\t\tget directorModalOpen() { return directorModalOpen; },` +
		NL +
		`\t\tget editingDirectorIdx() { return editingDirectorIdx; },` +
		NL +
		`\t\tget editingDirectorCompanyId() { return editingDirectorCompanyId; },` +
		NL +
		`\t\tget directorError() { return directorError; },` +
		NL +
		`\t\tget showDirectorRemovePicker() { return showDirectorRemovePicker; },` +
		NL +
		`\t\tget removePickerFilled() { return removePickerFilled; },` +
		NL +
		`\t\tget removePickerTargetCount() { return removePickerTargetCount; },` +
		NL +
		`\t\tget removePickerCompanyId() { return removePickerCompanyId; },` +
		NL +
		`\t\tget directorRowsMap() { return directorRowsMap; },` +
		NL +
		`\t\tget allDirectorsComplete() { return allDirectorsComplete; },` +
		NL +
		NL +
		`\t\t// Handlers` +
		NL +
		`\t\tretriggerRecoveryDetection,` +
		NL +
		`\t\thandleEditDirector,` +
		NL +
		`\t\thandleDirectorSave,` +
		NL +
		`\t\thandleDirectorModalClose,` +
		NL +
		`\t\thandleRemovePickerConfirm,` +
		NL +
		`\t\thandleRemovePickerCancel,` +
		NL +
		`\t\tgetDirectorModalData,`
);

// Also handle \r\n version of the handler section
c = c.replace(
	`\t\t// Handlers\r\n\t\tretriggerRecoveryDetection,`,
	`\t\t// Director state` +
		NL +
		`\t\tget directorFormsMap() { return directorFormsMap; },` +
		NL +
		`\t\tget directorModalOpen() { return directorModalOpen; },` +
		NL +
		`\t\tget editingDirectorIdx() { return editingDirectorIdx; },` +
		NL +
		`\t\tget editingDirectorCompanyId() { return editingDirectorCompanyId; },` +
		NL +
		`\t\tget directorError() { return directorError; },` +
		NL +
		`\t\tget showDirectorRemovePicker() { return showDirectorRemovePicker; },` +
		NL +
		`\t\tget removePickerFilled() { return removePickerFilled; },` +
		NL +
		`\t\tget removePickerTargetCount() { return removePickerTargetCount; },` +
		NL +
		`\t\tget removePickerCompanyId() { return removePickerCompanyId; },` +
		NL +
		`\t\tget directorRowsMap() { return directorRowsMap; },` +
		NL +
		`\t\tget allDirectorsComplete() { return allDirectorsComplete; },` +
		NL +
		NL +
		`\t\t// Handlers` +
		NL +
		`\t\tretriggerRecoveryDetection,` +
		NL +
		`\t\thandleEditDirector,` +
		NL +
		`\t\thandleDirectorSave,` +
		NL +
		`\t\thandleDirectorModalClose,` +
		NL +
		`\t\thandleRemovePickerConfirm,` +
		NL +
		`\t\thandleRemovePickerCancel,` +
		NL +
		`\t\tgetDirectorModalData,`
);

fs.writeFileSync(filePath, c, 'utf-8');
console.log('applicantFormManager.svelte.ts updated successfully');
console.log('File size:', c.length, 'chars');
