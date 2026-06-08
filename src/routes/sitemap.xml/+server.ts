/**
 * GET /sitemap.xml — Dynamic XML sitemap
 * ══════════════════════════════════════════════════════════════════
 * Lists all public routes. Excludes dashboard, form, and API routes.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';

const SITE_URL = 'https://digitaldsa.com';

const PUBLIC_ROUTES = [
	{ path: '/', changefreq: 'weekly', priority: '1.0' },
	{ path: '/login', changefreq: 'monthly', priority: '0.8' },
	{ path: '/dsa-onboarding', changefreq: 'monthly', priority: '0.7' },
	{ path: '/rm-onboarding', changefreq: 'monthly', priority: '0.7' },
	{ path: '/privacy', changefreq: 'yearly', priority: '0.3' },
	{ path: '/terms', changefreq: 'yearly', priority: '0.3' },
	{ path: '/about', changefreq: 'monthly', priority: '0.5' },
	{ path: '/contact', changefreq: 'monthly', priority: '0.5' }
];

export const GET: RequestHandler = async () => {
	const lastmod = new Date().toISOString().split('T')[0];

	const urls = PUBLIC_ROUTES.map(
		(route) => `
  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
	).join('');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

	return new Response(xml.trim(), {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
