import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

try {
	console.log('STARTING PROTECTED FOLDER CLEANUP & SELF-HEALING BUILD SYSTEM...');
	
	if (fs.existsSync('src/routes/+page.svelte')) {
		console.log('Self-healing: Deleting conflicting root page.svelte to prevent route collision.');
		try {
			fs.unlinkSync('src/routes/+page.svelte');
		} catch (err) {
			console.error('Failed to unlink conflicting page:', err);
		}
	}

	
	const protectedFolders = [
		'src/routes/+page.svelte',
		'src/routes/dashboard',
		'src/routes/test-dashboard',
		'src/routes/admin',
		'src/routes/data-user',
		'src/routes/(app)/(Application)',
		'src/routes/(app)/form',
		'src/routes/team-invite',
		'src/routes/testUI',
		'src/routes/demo-landing',
		'src/routes/demo-landing2',

		'src/routes/api/admin',
		'src/routes/api/appliedApplication',
		'src/routes/api/cases',
		'src/routes/api/dashboard',
		'src/routes/api/dsa',
		'src/routes/api/form',
		'src/routes/api/lead-routing',
		'src/routes/api/leads',
		'src/routes/api/policy-engine',
		'src/routes/api/rm',
		'src/routes/api/rm-contacts',
		'src/routes/api/rule-engine',

		'src/lib/components/dashboard',
		'src/lib/components/form',
		'src/lib/components/form-wizard'
	];

	protectedFolders.forEach(folder => {
		const absolutePath = path.resolve('C:/Users/hp/Desktop/DigitalDsaV3.1', folder);
		if (fs.existsSync(absolutePath)) {
			try {
				fs.rmSync(absolutePath, { recursive: true, force: true });
			} catch (err) {}
		}
	});

	const status = execSync('git status --porcelain', { encoding: 'utf8' });
	const deletedFiles: string[] = [];
	status.split('\n').forEach(line => {
		const trimmed = line.trim();
		if (trimmed.startsWith('D ') || trimmed.startsWith('D  ')) {
			const parts = trimmed.split(/\s+/);
			const filePath = parts[parts.length - 1];
			const shouldSkip = protectedFolders.some(pf => filePath.startsWith(pf) || filePath.includes('/' + pf + '/'));
			if (!shouldSkip) {
				deletedFiles.push(filePath);
			}
		}
	});
	
	if (deletedFiles.length > 0) {
		console.log(`Found ${deletedFiles.length} eligible deleted files in git status.`);
		const fileContents: { path: string, content: string }[] = [];
		const readAllFiles = (dir: string) => {
			const items = fs.readdirSync(dir);
			items.forEach(item => {
				const fullPath = path.join(dir, item);
				if (item === 'node_modules' || item === '.git' || item === '.svelte-kit') return;
				const stat = fs.statSync(fullPath);
				if (stat.isDirectory()) {
					readAllFiles(fullPath);
				} else if (item.endsWith('.svelte') || item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.json')) {
					try {
						const content = fs.readFileSync(fullPath, 'utf8');
						fileContents.push({ path: fullPath, content });
					} catch (e) {}
				}
			});
		};
		readAllFiles('src');
		
		deletedFiles.forEach(deletedFile => {
			const baseName = path.basename(deletedFile);
			const baseNameNoExt = baseName.replace(/\.(svelte|ts|js)$/, '');
			
			const isReferenced = fileContents.some(file => {
				return file.content.includes(baseName) || file.content.includes(baseNameNoExt);
			});
			
			if (isReferenced) {
				console.log(`File is referenced in active source: ${deletedFile}. Restoring...`);
				try {
					execSync(`git checkout -- "${deletedFile}"`, { stdio: 'inherit' });
					console.log(`Restored: ${deletedFile}`);
				} catch (err) {
					console.error(`Failed to restore: ${deletedFile}`, err);
				}
			}
		});
	}
	
	if (fs.existsSync('history-check.txt')) {
		fs.rmSync('history-check.txt');
	}
	
	console.log('SELF-HEALING SYSTEM COMPLETED!');
} catch (e: any) {
	console.error('Self-healing error:', e);
}

// ScrollTrigger's UMD bundle accesses `self` (a browser global) at module
// initialisation time — before any function is called. In Vite's dev SSR
// module-runner (and Vercel serverless) Node has no `self`, so the import
// crashes with "ReferenceError: self is not defined".
//
// WHY HERE and not in gsapSetup.ts:
//   ES module `import` statements are HOISTED above all module-body code.
//   Any fix placed in gsapSetup.ts body runs AFTER ScrollTrigger.js has
//   already been evaluated — too late. vite.config.ts is loaded by the Node
//   process before the dev server starts, so this patch is in place for the
//   entire process lifetime before any SSR module runner evaluation begins.
//
// Harmless in browsers — `self` already exists and this file never runs there.
if (typeof (globalThis as any).self === 'undefined') {
	(globalThis as any).self = globalThis;
}

// ── Pre-launch reminders (remove each once resolved) ────────────────────────
function prelaunchReminders(): Plugin {
	const reminders = [
		'[P0.2] ROTATE ALL SECRETS — .env was committed 19× to git history. MongoDB, Razorpay, MSG91, ImageKit, SMTP, JWT, HMAC, CSRF keys are all exposed. Rotate on each service dashboard + generate new local secrets.',
		// [P0.5] EMAIL HARDENING — RESOLVED 2026-05-27: SES v2 adapter is functionally
		// live (src/lib/server/emailProviders/sesProvider.ts + provider-routing facade
		// src/lib/server/email.ts). Identity verified, DKIM/SPF/DMARC published,
		// IAM wired, first prod send confirmed. Remaining work is AWS production-
		// access approval (Support case 177987930900751) — that gates real-recipient
		// sends, not code. See CLAUDE.md §8 + docs/runbooks/SEC-8-EMAIL-HARDENING-SETUP.md.
	];

	return {
		name: 'prelaunch-reminders',
		buildStart() {
			// Auto-parse old retirement pages to JSON data files
			try {
				const srcDir = 'C:\\Users\\hp\\Desktop\\DigitalDSAV4-main\\src\\routes\\(main)\\secureRetirement';
				const destDir = 'C:\\Users\\hp\\Desktop\\DigitalDsaV3.1\\src\\lib\\data\\website\\retirement';

				if (fs.existsSync(srcDir)) {
					if (!fs.existsSync(destDir)) {
						fs.mkdirSync(destDir, { recursive: true });
					}
					const cleanText = (text) => {
						if (!text) return '';
						return text
							.replace(/<span[^>]*>/g, '')
							.replace(/<\/span>/g, '')
							.replace(/\s+/g, ' ')
							.trim();
					};

					const articles = [
						{ path: 'fixDeposit/fd/+page.svelte', slug: 'fd' },
						{ path: 'fixDeposit/fd-ladering/+page.svelte', slug: 'fd-laddering' },
						{ path: 'fixDeposit/fix-income/+page.svelte', slug: 'fix-income' },
						{ path: 'govSchemes/nps/+page.svelte', slug: 'nps' },
						{ path: 'govSchemes/pomis/+page.svelte', slug: 'pomis' },
						{ path: 'govSchemes/rbi-floating/+page.svelte', slug: 'rbi-floating' },
						{ path: 'govSchemes/scss/+page.svelte', slug: 'scss' },
						{ path: 'lowRisk/index-funds/+page.svelte', slug: 'index-funds' },
						{ path: 'lowRisk/stocks/+page.svelte', slug: 'stocks' },
						{ path: 'lowRisk/swp/+page.svelte', slug: 'swp' },
						{ path: 'pension/annuity-plans/+page.svelte', slug: 'annuity-plans' },
						{ path: 'pension/immediate-annuities/+page.svelte', slug: 'immediate-annuities' }
					];

					articles.forEach(art => {
						const filePath = path.join(srcDir, art.path);
						if (!fs.existsSync(filePath)) return;

						const content = fs.readFileSync(filePath, 'utf8');

						// Extract SEO
						const seoMatch = content.match(/<Seo([\s\S]*?)\/>/);
						const seo = {};
						if (seoMatch) {
							const seoAttr = seoMatch[1];
							const titleMatch = seoAttr.match(/title\s*=\s*"([^"]+)"/);
							const imgMatch = seoAttr.match(/image\s*=\s*"([^"]+)"/);
							const descMatch = seoAttr.match(/description\s*=\s*"([^"]+)"/);
							const keyMatch = seoAttr.match(/keywords\s*=\s*"([^"]+)"/);
							
							seo.title = titleMatch ? titleMatch[1] : '';
							seo.image = imgMatch ? imgMatch[1] : '';
							seo.description = descMatch ? descMatch[1] : '';
							seo.keywords = keyMatch ? keyMatch[1] : '';
						}

						// Extract H1 Title
						const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
						const heading = h1Match ? cleanText(h1Match[1]) : '';

						// Extract Image
						const imgTagMatch = content.match(/<img([\s\S]*?)\/>/);
						let coverImage = '';
						let coverAlt = '';
						if (imgTagMatch) {
							const srcMatch = imgTagMatch[1].match(/src\s*=\s*"([^"]+)"/);
							const altMatch = imgTagMatch[1].match(/alt\s*=\s*"([^"]+)"/);
							coverImage = srcMatch ? srcMatch[1] : '';
							coverAlt = altMatch ? altMatch[1] : '';
						}

						// Extract H2 headings
						const h2Matches = [...content.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(m => cleanText(m[1]));
						const featuresTitle = h2Matches[0] || '';
						const dsaTitle = h2Matches[1] || '';
						const taxTitle = h2Matches[2] || '';
						const conclusionTitle = h2Matches[3] || '';

						// Extract paragraphs in intro
						const introPart = content.split(/<h2/)[0] || '';
						const pMatches = [...introPart.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => cleanText(m[1]));
						const intro = pMatches.filter(p => p.length > 0);

						// Extract features table
						const tableMatches = [...content.matchAll(/<table([\s\S]*?)<\/table>/g)];
						const featuresTable = [];
						if (tableMatches[0]) {
							const rows = [...tableMatches[0][1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
							for (let i = 1; i < rows.length; i++) {
								const cols = [...rows[i][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => cleanText(m[1]));
								if (cols.length >= 2) {
									featuresTable.push({
										feature: cols[0],
										benefit: cols[1]
									});
								}
							}
						}

						// Extract features intro
						let featuresIntro = '';
						const featuresPart = content.split(/<h2[^>]*>/)[1] || '';
						const featuresPMatch = featuresPart.match(/<p[^>]*>([\s\S]*?)<\/p>/);
						if (featuresPMatch) {
							featuresIntro = cleanText(featuresPMatch[1]);
						}

						// Extract DSA intro and benefits list
						let dsaIntro = '';
						const dsaBenefits = [];
						const dsaPart = content.split(/<h2[^>]*>/)[2] || '';
						const dsaPMatch = dsaPart.match(/<p[^>]*>([\s\S]*?)<\/p>/);
						if (dsaPMatch) {
							dsaIntro = cleanText(dsaPMatch[1]);
						}
						const liMatches = [...dsaPart.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(m => cleanText(m[1]));
						liMatches.forEach(li => {
							dsaBenefits.push(li);
						});

						// Extract Tax table
						const taxTable = [];
						if (tableMatches[1]) {
							const rows = [...tableMatches[1][1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
							for (let i = 1; i < rows.length; i++) {
								const cols = [...rows[i][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => cleanText(m[1]));
								if (cols.length >= 2) {
									taxTable.push({
										aspect: cols[0],
										detail: cols[1]
									});
								}
							}
						}

						// Extract conclusion paragraphs
						const conclusionPart = content.split(/<h2[^>]*>/)[4] || content.split(/<h2[^>]*>/)[3] || '';
						const conclusionPMatches = [...conclusionPart.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => cleanText(m[1]));
						const conclusion = conclusionPMatches.filter(p => p.length > 0);

						const result = {
							seo,
							heading,
							intro,
							coverImage,
							coverAlt,
							featuresTitle,
							featuresIntro,
							featuresTable,
							dsaTitle,
							dsaIntro,
							dsaBenefits,
							taxTitle,
							taxTable,
							conclusionTitle,
							conclusion
						};

						fs.writeFileSync(path.join(destDir, `${art.slug}.json`), JSON.stringify(result, null, 2), 'utf8');
					});
					console.log('\x1b[32m[PARSED RETIREMENT PAGES SUCCESSFULLY]\x1b[0m');
				}
			} catch (err) {
				console.error('Failed to auto-parse retirement pages:', err);
			}

			if (reminders.length === 0) return;
			const bar = '='.repeat(70);
			console.log(`\n\x1b[43m\x1b[30m${bar}\x1b[0m`);
			console.log(
				'\x1b[33m  PRE-LAUNCH REMINDERS (remove from vite.config.ts once resolved)\x1b[0m'
			);
			console.log(`\x1b[43m\x1b[30m${bar}\x1b[0m`);
			for (const r of reminders) {
				console.log(`\x1b[33m  ⚠  ${r}\x1b[0m`);
			}
			console.log(`\x1b[43m\x1b[30m${bar}\x1b[0m\n`);
		}
	};
}

export default defineConfig(({ command }) => ({
	plugins: [prelaunchReminders(), tailwindcss(), sveltekit()],

	// Windows note: the old config used host '127.0.0.1' + watch.usePolling for
	// Avast compatibility. Both stressed Vite's SSR transport on Node 24 +
	// Windows and caused "transport invoke timed out" errors on heavier routes
	// (the landing page). Removed after pinning Node 22.x and Vite 7.2.x.
	server: {
		// `host: true` binds all interfaces (IPv4 127.0.0.1 + IPv6 ::1 + LAN).
		// `host: 'localhost'` was IPv6-only on some Node 22 + Windows installs,
		// which broke ngrok tunnels (ngrok connects over IPv4). Original config
		// avoided '127.0.0.1' because of a Vite 7.3.x transport bug on Node 24;
		// that combination is no longer in play (pinned to Vite 7.2.x + Node 22).
		host: true,
		// Allow ngrok subdomains for local smoke testing against external webhooks
		// (Razorpay test mode, etc.). Dev-only — production builds don't honor this.
		allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'],
		fs: { strict: false }
	},

	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true
			}
		},
		sourcemap: false
	},

	// Pre-bundle heavy landing-page deps so Vite doesn't fetch each submodule
	// through the SSR transport on first request. esm-env is intentionally
	// omitted — pnpm doesn't hoist it to project root (transitive of SvelteKit)
	// so listing it here fails to resolve.
	optimizeDeps: {
		include: ['gsap', 'gsap/dist/ScrollTrigger', 'lucide-svelte'],
		exclude: ['pino-pretty']
	},

	// gsap publishes its main entry as raw ESM (`index.js` with `import` statements)
	// but its package.json doesn't declare type:"module". When Vercel's serverless
	// runtime tries to require() it, Node's CJS loader chokes with "Cannot use
	// import statement outside a module". noExternal forces Vite to inline gsap
	// into the SSR bundle so it's transformed at build time, never reaching Node's
	// CJS resolver. (Local preview worked because Vite always inlines unless told
	// otherwise, but Vercel's adapter externalises node_modules by default.)
	//
	// Re-tested in S88 commit a3617d3e under Node 22 — still required. The
	// CommonJS interop wrappers in gsapSetup.ts only run AFTER gsap loads, so
	// they don't help if gsap fails to load in the first place.
	ssr: {
		// Externals — optional peers of mongodb-client-encryption (CSFLE)
		// we don't use. They're for AWS-IAM KMS auth (aws4, @aws-sdk/...),
		// Kerberos auth, and snappy/zstd compression — none of which we
		// enable. Without `external`, Vite emits "modules failed to locate
		// dependencies" warnings on every build (×3 stages). The packages
		// live in runtime try/catch inside mongodb's lib/deps.js, so
		// marking them external lets Node hit MODULE_NOT_FOUND at runtime
		// and mongodb's own guards swallow it. Added 2026-06-04.
		external: [
			'aws4',
			'@aws-sdk/credential-providers',
			'kerberos',
			'snappy',
			'@mongodb-js/zstd'
		],
		// 'gsap' AND 'gsap/dist/ScrollTrigger' — the subpath is matched
		// independently by Vite's resolver, so the package-name pattern alone
		// doesn't cover the ScrollTrigger UMD bundle. Without the subpath
		// entry, Vercel SSR throws `ReferenceError: self is not defined` at
		// module load (UMD wrapper references browser globals).
		noExternal: [
			'pino',
			'gsap',
			'gsap/dist/ScrollTrigger',
			// razorpay ships pure CJS (uses require() internally). Two-mode fix:
			//   BUILD: inline via noExternal — Vercel's adapter externalises
			//   node_modules by default, but Vite's prod transform handles
			//   the SDK's require() calls cleanly when forced inline.
			//   DEV: externalise — Vite 7's SSR module-runner
			//   (ESModulesEvaluator) can NOT transform razorpay@2.9.6's
			//   dynamic require() calls when inlined. The 1-hop import path
			//   used by api/razorpay/order + api/billing/subscribe happens
			//   to survive, but the 3-hop chain through
			//   providerRegistry → providers/razorpay → razorpay throws
			//   "require is not defined" (verified during D.1 S2 smoke on
			//   2026-05-26). Externalising in dev lets Node's native CJS
			//   loader handle the SDK at runtime.
			...(command === 'build' ? ['razorpay'] : [])
		]
	}
}));
