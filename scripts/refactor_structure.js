import fs from 'fs';
import path from 'path';

const projectDir = 'C:\\Users\\hp\\Desktop\\DigitalDsaV3.1';
const srcDir = path.join(projectDir, 'src');

const uiComponents = [
	'Button.svelte', 'InputField.svelte', 'Radio.svelte', 'Select.svelte', 'Tooltip.svelte',
	'Check.svelte', 'NewSelect.svelte', 'CheckCard.svelte', 'CheckCard2.svelte', 'CheckCard3.svelte',
	'CheckCard4.svelte', 'CheckCard5.svelte', 'SingleCheck.svelte', 'Dropdown.svelte',
	'RadioSelection.svelte', 'Anchor.svelte', 'AnchorCounter.svelte', 'FeedbackCheck.svelte'
];

const layoutComponents = [
	'Navbar.svelte', 'Footer.svelte', 'Breadcrumb.svelte', 'StickyNavbar.svelte', 'NewPageLayout.svelte',
	'Seo.svelte', 'Loader.svelte', 'Sublist.svelte', 'AdminImpersonationBanner.svelte',
	'DatePickerYearAndMonth.svelte', 'FormLogo.svelte', 'PageDesign.svelte', 'PageFullTextDesign.svelte',
	'PageNotFound.svelte', 'SecondPageLayout.svelte', 'TestBreadCrumb.svelte', 'PlannerPath.svelte',
	'CalculatorPath.svelte'
];

const calculatorsComponents = [
	'EmiCalc.svelte', 'AffordabilityCalculator.svelte', 'BalanceTransferCalculator.svelte',
	'EligibilityCalculator.svelte', 'StampDuty.svelte', 'FdWithSavingGoal.svelte', 'EmiChangeLineGraph.svelte',
	'LineGraph.svelte', 'LineGraphMonthly.svelte', 'SinglelineGraph.svelte', 'SummaryResult.svelte',
	'TableModel.svelte', 'Payments.svelte', 'PaymentTable.svelte', 'AdvanceCalculator.svelte',
	'HomeLoanCalculator.svelte', 'ReverseCalculationsOfMoneyLast.svelte', 'MoneyLast.svelte',
	'AllTypeOfEligiblity.svelte', 'BtCalculatorForUnsecureLoan.svelte', 'BtPlotLoanOfferCard.svelte',
	'BtUnsecuredLoanOfferCard.svelte', 'NewLapLoanOfferCard.svelte', 'NewOfferCard.svelte',
	'NewPlotLoanOfferCard.svelte', 'NewUnsecuredLoanOfferCard.svelte', 'NotIdentifiedOfferCard.svelte',
	'OfferCard.svelte', 'BTLAPOfferCard.svelte', 'BTOfferCard.svelte', 'TopOnlyLAP.svelte',
	'TopUpHLOfferCard.svelte', 'SuggestedLoanCard.svelte', 'OfferPageModelIncomeSelection.svelte',
	'OtherBusiness.svelte', 'SalariedIncome.svelte', 'SalariedIncomeFormTest.svelte',
	'BusinessIncomeFormTest.svelte'
];

const plannersComponents = [
	'NewPartPayment.svelte', 'updatedEmi.svelte', 'repayment.svelte', 'customDatePicker.svelte',
	'datePickerOfLargeScreen.svelte'
];

const modalsComponents = [
	'Modal.svelte', 'CookieConsent.svelte', 'ChatModal.svelte', 'DownloadGuideModal.svelte',
	'DatabaseModal.svelte', 'PopupModal.svelte', 'NewPopUp.svelte', 'AlertModal.svelte',
	'ApplyMobileModal.svelte', 'ChatWrapper.svelte', 'ModalPopUp.svelte', 'ModalSlot.svelte'
];

const wellbeingComponents = [
	'FinancialWellbeingForm.svelte', 'FinancialWellbeingQuestion.svelte'
];

// Helper to determine the target path for a component
function getTargetRelativePath(filename) {
	if (uiComponents.includes(filename)) return 'lib/components/ui/' + filename;
	if (layoutComponents.includes(filename)) return 'lib/components/layout/' + filename;
	if (calculatorsComponents.includes(filename)) return 'lib/components/features/calculators/' + filename;
	if (plannersComponents.includes(filename)) return 'lib/components/features/planners/' + filename;
	if (modalsComponents.includes(filename)) return 'lib/components/modals/' + filename;
	if (wellbeingComponents.includes(filename)) return 'lib/components/features/wellbeing/' + filename;
	return 'lib/components/sections/' + filename;
}

// 1. Gather all files to move
const moveList = []; // Array of { oldAbs, newAbs, oldRelLib, newRelLib }
const pathMap = new Map(); // Maps old relative path (e.g. components/website/Button.svelte) to new relative path

function scanDirForMoves(dirPath, relativeBase) {
	if (!fs.existsSync(dirPath)) return;
	const items = fs.readdirSync(dirPath);
	for (const item of items) {
		const fullPath = path.join(dirPath, item);
		const relativePath = path.join(relativeBase, item).replace(/\\/g, '/');
		const stats = fs.statSync(fullPath);

		if (stats.isDirectory()) {
			// If it's a subfolder inside components/website, we move it to sections/subfolder
			if (relativeBase.startsWith('lib/components/website') || relativeBase.startsWith('lib/ui-component')) {
				// Scan recursively but map their target subfolders
				scanDirForMoves(fullPath, relativePath);
			}
		} else {
			if (item.endsWith('.svelte') || item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.json')) {
				let targetRel;
				if (relativeBase.startsWith('lib/components/website/retirement')) {
					targetRel = 'lib/components/sections/retirement/' + item;
				} else if (relativeBase.startsWith('lib/data/website/retirement')) {
					targetRel = 'lib/data/website/retirement/' + item;
				} else {
					targetRel = getTargetRelativePath(item);
				}
				const newAbs = path.join(projectDir, 'src', targetRel);
				
				const oldRelLib = relativePath.substring(4); // Remove 'src/' prefix
				const newRelLib = targetRel;

				moveList.push({
					oldAbs: fullPath,
					newAbs,
					oldRelLib,
					newRelLib
				});
				pathMap.set(oldRelLib, newRelLib);
			}
		}
	}
}

// Scan both legacy directories
scanDirForMoves(path.join(srcDir, 'lib/components/website'), 'src/lib/components/website');
scanDirForMoves(path.join(srcDir, 'lib/ui-component'), 'src/lib/ui-component');

// 2. Perform the moves on disk
console.log(`Found ${moveList.length} files to move/refactor.`);
moveList.forEach(({ oldAbs, newAbs }) => {
	if (fs.existsSync(oldAbs)) {
		fs.mkdirSync(path.dirname(newAbs), { recursive: true });
		fs.renameSync(oldAbs, newAbs);
		console.log(`Moved: ${path.basename(oldAbs)} -> ${path.dirname(newAbs)}`);
	}
});

// 3. Scan all Svelte, TS, and JS files to rewrite imports
function refactorImportsInFile(filePath) {
	let content = fs.readFileSync(filePath, 'utf8');
	let modified = false;

	// Regex to match imports (both Svelte/ES6 absolute and relative)
	// Example absolute: from '$lib/components/website/Button.svelte'
	// Example relative: from './Button.svelte' or '../../ui-component/Button.svelte'
	const importRegex = /(from|import)\s+['"]([^'"]+)['"]/g;

	content = content.replace(importRegex, (match, prefix, importPath) => {
		let resolvedOldRel = '';
		if (importPath.startsWith('$lib/')) {
			resolvedOldRel = importPath.substring(5); // Remove '$lib/' to get relative to lib
		} else if (importPath.startsWith('.')) {
			// Relative import: resolve relative to old path of importer
			// Find old path of the importer file
			const importerRel = path.relative(path.join(projectDir, 'src'), filePath).replace(/\\/g, '/');
			
			// Find what the old path of the importer was before we moved it
			let oldImporterRel = importerRel;
			for (const move of moveList) {
				if (move.newRelLib === importerRel) {
					oldImporterRel = move.oldRelLib;
					break;
				}
			}

			const oldImporterDir = path.dirname(path.join(projectDir, 'src', 'lib', oldImporterRel));
			const resolvedOldAbs = path.resolve(oldImporterDir, importPath);
			resolvedOldRel = path.relative(path.join(projectDir, 'src', 'lib'), resolvedOldAbs).replace(/\\/g, '/');
		}

		if (resolvedOldRel && pathMap.has(resolvedOldRel)) {
			const newRelTarget = pathMap.get(resolvedOldRel);
			modified = true;

			// If it was absolute, replace with new absolute path
			if (importPath.startsWith('$lib/')) {
				return `${prefix} '$lib/${newRelTarget}'`;
			} else {
				// If it was relative, compute new relative path between new importer and new target
				const importerRel = path.relative(path.join(projectDir, 'src'), filePath).replace(/\\/g, '/');
				const newImporterDir = path.dirname(path.join(projectDir, 'src', 'lib', importerRel));
				const newTargetAbs = path.join(projectDir, 'src', 'lib', newRelTarget);
				
				let newRelative = path.relative(newImporterDir, newTargetAbs).replace(/\\/g, '/');
				if (!newRelative.startsWith('.')) {
					newRelative = './' + newRelative;
				}
				return `${prefix} '${newRelative}'`;
			}
		}
		return match;
	});

	if (modified) {
		fs.writeFileSync(filePath, content, 'utf8');
		console.log(`Refactored imports in: ${filePath}`);
	}
}

function recursiveRefactor(dir) {
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stats = fs.statSync(fullPath);
		if (stats.isDirectory()) {
			if (!['node_modules', '.git', '.svelte-kit', 'build'].includes(item)) {
				recursiveRefactor(fullPath);
			}
		} else {
			if (item.endsWith('.svelte') || item.endsWith('.ts') || item.endsWith('.js')) {
				refactorImportsInFile(fullPath);
			}
		}
	}
}

console.log('Scanning files to update import paths...');
recursiveRefactor(srcDir);

// 4. Clean up empty folders
function cleanEmptyDirs(dir) {
	if (!fs.existsSync(dir)) return;
	const items = fs.readdirSync(dir);
	if (items.length === 0) {
		fs.rmdirSync(dir);
		console.log(`Removed empty folder: ${dir}`);
		return;
	}
	for (const item of items) {
		const fullPath = path.join(dir, item);
		if (fs.statSync(fullPath).isDirectory()) {
			cleanEmptyDirs(fullPath);
		}
	}
	// Try cleaning parent again
	if (fs.readdirSync(dir).length === 0) {
		fs.rmdirSync(dir);
		console.log(`Removed empty folder: ${dir}`);
	}
}

console.log('Cleaning empty legacy folders...');
cleanEmptyDirs(path.join(srcDir, 'lib/components/website'));
cleanEmptyDirs(path.join(srcDir, 'lib/ui-component'));

console.log('=== ARCHITECTURE REFACTORING COMPLETED ===');
