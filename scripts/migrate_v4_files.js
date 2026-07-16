import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Users\\hp\\Desktop\\DigitalDSAV4-main';
const destDir = 'C:\\Users\\hp\\Desktop\\DigitalDsaV3.1';

const pathsToMigrate = [
	// Routes
	{ src: 'src/routes/(main)/calculators', dest: 'src/routes/(main)/calculators' },
	{ src: 'src/routes/(main)/planners', dest: 'src/routes/(main)/planners' },
	{ src: 'src/routes/(quiz)', dest: 'src/routes/(quiz)' },
	{ src: 'src/routes/financial-wellbeing', dest: 'src/routes/financial-wellbeing' },
	{ src: 'src/routes/banksData', dest: 'src/routes/banksData' },
	{ src: 'src/routes/sitemap.xml', dest: 'src/routes/sitemap.xml' },
	// API routes
	{ src: 'src/routes/api/quiz', dest: 'src/routes/api/quiz' },
	{ src: 'src/routes/api/feedback', dest: 'src/routes/api/feedback' },
	{ src: 'src/routes/api/verify-turnstile', dest: 'src/routes/api/verify-turnstile' },
	{ src: 'src/routes/api/notify-404', dest: 'src/routes/api/notify-404' },
	{ src: 'src/routes/api/download-guide', dest: 'src/routes/api/download-guide' },
	{ src: 'src/routes/api/helpWidget', dest: 'src/routes/api/helpWidget' },
	{ src: 'src/routes/api/SeoAnalyzer', dest: 'src/routes/api/SeoAnalyzer' },
	// Library and assets
	{ src: 'src/lib/components', dest: 'src/lib/components' },
	{ src: 'src/lib/data', dest: 'src/lib/data' },
	{ src: 'src/lib/store', dest: 'src/lib/store' },
	{ src: 'src/lib/i18n', dest: 'src/lib/i18n' },
	// Individual files
	{ src: 'src/lib/financialWellnessQuestions.json', dest: 'src/lib/financialWellnessQuestions.json' },
	{ src: 'src/lib/authoritiesData.json', dest: 'src/lib/authoritiesData.json' },
	{ src: 'src/lib/stampDuty.json', dest: 'src/lib/stampDuty.json' },
	{ src: 'src/lib/stateNameWithGst.json', dest: 'src/lib/stateNameWithGst.json' }
];

let filesCopied = 0;
let filesSkipped = 0;
let copyLog = [];
let skipLog = [];

function migratePath(relativeSrc, relativeDest) {
	const srcPath = path.join(srcDir, relativeSrc);
	const destPath = path.join(destDir, relativeDest);

	if (!fs.existsSync(srcPath)) {
		console.warn(`[WARNING] Source path does not exist: ${srcPath}`);
		return;
	}

	const stats = fs.statSync(srcPath);
	if (stats.isDirectory()) {
		if (!fs.existsSync(destPath)) {
			fs.mkdirSync(destPath, { recursive: true });
		}
		const children = fs.readdirSync(srcPath);
		for (const child of children) {
			// Do not copy ignored folders (auth, form, dashboard, etc.) if encountered
			if (['(auth)', '(form)', '(dashboard)', 'admin', 'pdf-generate'].includes(child)) {
				continue;
			}
			migratePath(path.join(relativeSrc, child), path.join(relativeDest, child));
		}
	} else {
		// Ensure parent directory exists
		fs.mkdirSync(path.dirname(destPath), { recursive: true });

		// Avoid overwriting newer/existing files in V3.1
		if (fs.existsSync(destPath)) {
			filesSkipped++;
			skipLog.push(relativeDest);
		} else {
			fs.copyFileSync(srcPath, destPath);
			filesCopied++;
			copyLog.push(`${relativeSrc} -> ${relativeDest}`);
		}
	}
}

console.log('=== STARTING WEBSITE-ONLY MIGRATION ===');
for (const item of pathsToMigrate) {
	migratePath(item.src, item.dest);
}

console.log('\n=== MIGRATION SUMMARY ===');
console.log(`Files Copied: ${filesCopied}`);
console.log(`Files Skipped (Already Exist): ${filesSkipped}`);
console.log('=========================');

// Write detailed logs for record
fs.writeFileSync(path.join(destDir, 'migration_copied.log'), copyLog.join('\n'), 'utf8');
fs.writeFileSync(path.join(destDir, 'migration_skipped.log'), skipLog.join('\n'), 'utf8');
console.log('Detailed logs written to migration_copied.log and migration_skipped.log');
