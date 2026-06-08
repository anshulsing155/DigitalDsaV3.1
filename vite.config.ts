import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

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
