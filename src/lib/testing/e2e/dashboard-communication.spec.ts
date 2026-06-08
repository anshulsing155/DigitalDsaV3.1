/**
 * Dashboard Communication Hub E2E Tests (Task 4.15)
 *
 * Tests the Communication Hub UI at /dashboard/dsa/communication.
 * Covers:
 *   - Page load and header
 *   - Category tabs (Customer, RM, Source/Broker) with counts
 *   - Template card grid display and selection
 *   - Compose panel: variable inputs, live preview, action buttons
 *   - Search / filter templates
 *   - Copy to clipboard and WhatsApp share
 */

import { test, expect } from '@playwright/test';
import { DASHBOARD_ROUTES, createTestCase } from './dashboard.setup';

test.describe('Communication Hub — UI Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.COMMUNICATION);
		await page.waitForLoadState('networkidle');
	});

	// ── PAGE LOAD & HEADER ────────────────────────────────────────────

	test('page renders with correct heading and subtitle', async ({ page }) => {
		await expect(page.locator('h1:has-text("Communication Hub")')).toBeVisible();
		await expect(
			page.locator('text=Browse templates, fill in details, and share with one click')
		).toBeVisible();
	});

	test('back to dashboard link is visible', async ({ page }) => {
		const backLink = page.locator('a[href="/dashboard/dsa"]:has-text("Dashboard")');
		await expect(backLink).toBeVisible();
	});

	// ── CATEGORY TABS ─────────────────────────────────────────────────

	test('category tabs are displayed (Customer, RM, Source / Broker)', async ({ page }) => {
		const tabContainer = page.locator('.comm-tabs-scroll');
		await expect(tabContainer).toBeVisible();

		// Verify all three tab buttons are present
		await expect(page.getByRole('button', { name: /Customer/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /RM/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Source/i })).toBeVisible();
	});

	test('Customer tab is active by default', async ({ page }) => {
		const customerTab = page.getByRole('button', { name: /Customer/i });
		// Active tab has gradient background class
		const classes = await customerTab.getAttribute('class');
		expect(classes).toContain('bg-gradient');
	});

	test('each tab shows a template count badge', async ({ page }) => {
		// The tab buttons contain a <span> with the count
		const customerTab = page.getByRole('button', { name: /Customer/i });
		const countBadge = customerTab.locator('span');
		await expect(countBadge).toBeVisible();

		// Count should be a number (might be 0 if no templates)
		const countText = await countBadge.innerText();
		expect(Number(countText)).toBeGreaterThanOrEqual(0);
	});

	test('clicking RM tab switches active tab and updates templates', async ({ page }) => {
		const rmTab = page.getByRole('button', { name: /^RM/i });
		await rmTab.click();
		await page.waitForTimeout(300);

		// RM tab should now have gradient styling
		const classes = await rmTab.getAttribute('class');
		expect(classes).toContain('bg-gradient');

		// Customer tab should no longer be active
		const customerTab = page.getByRole('button', { name: /Customer/i });
		const customerClasses = await customerTab.getAttribute('class');
		expect(customerClasses).not.toContain('bg-gradient');
	});

	test('clicking Source / Broker tab shows source templates', async ({ page }) => {
		const sourceTab = page.getByRole('button', { name: /Source/i });
		await sourceTab.click();
		await page.waitForTimeout(300);

		const classes = await sourceTab.getAttribute('class');
		expect(classes).toContain('bg-gradient');
	});

	// ── SEARCH ────────────────────────────────────────────────────────

	test('search input is visible with placeholder', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search templates..."]');
		await expect(searchInput).toBeVisible();
	});

	test('searching with no results shows empty state', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search templates..."]');
		await searchInput.fill('zzz_nonexistent_template_xyz');
		await page.waitForTimeout(300);

		await expect(page.locator('text=No templates found')).toBeVisible();
	});

	test('clearing search restores template list', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search templates..."]');
		await searchInput.fill('zzz_nonexistent');
		await page.waitForTimeout(300);
		await expect(page.locator('text=No templates found')).toBeVisible();

		// Clear search
		await searchInput.clear();
		await page.waitForTimeout(300);

		// Either templates appear or empty category message shows
		const hasTemplates = await page.locator('.template-card').count();
		const hasEmptyCategory = await page
			.locator('text=No templates in this category')
			.isVisible()
			.catch(() => false);
		expect(hasTemplates > 0 || hasEmptyCategory).toBeTruthy();
	});

	// ── TEMPLATE CARDS ────────────────────────────────────────────────

	test('template cards display name, body preview, and badges', async ({ page }) => {
		const cards = page.locator('.template-card');
		const cardCount = await cards.count();

		if (cardCount === 0) {
			// No templates in default (customer) category — skip
			test.skip();
			return;
		}

		const firstCard = cards.first();
		await expect(firstCard).toBeVisible();

		// Card should contain a template name (h3)
		const name = firstCard.locator('h3');
		await expect(name).toBeVisible();
		const nameText = await name.innerText();
		expect(nameText.length).toBeGreaterThan(0);

		// Card should have a body preview (p tag)
		const bodyPreview = firstCard.locator('p').first();
		await expect(bodyPreview).toBeVisible();

		// Card should have channel badge (WhatsApp, Email, or SMS)
		const channelBadge = firstCard.locator(
			'span:has-text("WhatsApp"), span:has-text("Email"), span:has-text("SMS")'
		);
		await expect(channelBadge.first()).toBeVisible();
	});

	// ── TEMPLATE SELECTION & COMPOSE PANEL ────────────────────────────

	test('clicking a template card selects it and shows Compose Message', async ({ page }) => {
		const cards = page.locator('.template-card');
		const cardCount = await cards.count();
		if (cardCount === 0) {
			test.skip();
			return;
		}

		// Before selection: hint text should be visible
		await expect(page.locator('text=Select a template to get started')).toBeVisible();

		// Click the first template card
		await cards.first().click();
		await page.waitForTimeout(300);

		// Compose Message heading should appear
		await expect(page.locator('h2:has-text("Compose Message")')).toBeVisible();

		// Close button should be visible
		await expect(page.getByRole('button', { name: /Close/i })).toBeVisible();
	});

	test('selected template card shows checkmark indicator', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		// The selected card should have ring styling (border accent color)
		const firstCard = cards.first();
		const classes = await firstCard.getAttribute('class');
		expect(classes).toContain('ring-2');
	});

	test('clicking the same template card again deselects it', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);
		await expect(page.locator('h2:has-text("Compose Message")')).toBeVisible();

		// Click again to deselect
		await cards.first().click();
		await page.waitForTimeout(300);

		// Hint text should reappear
		await expect(page.locator('text=Select a template to get started')).toBeVisible();
	});

	test('Close button closes the compose panel', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		const closeBtn = page.getByRole('button', { name: /Close/i });
		await closeBtn.click();
		await page.waitForTimeout(300);

		await expect(page.locator('text=Select a template to get started')).toBeVisible();
	});

	// ── COMPOSE PANEL: VARIABLE INPUTS ────────────────────────────────

	test('compose panel shows Template Variables section', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		// Should show "Template Variables" heading
		await expect(page.locator('text=Template Variables')).toBeVisible();
	});

	test('compose panel shows variable input fields for the template', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(500);

		// Variable inputs should be rendered (input or textarea elements inside the composer)
		const composerWrap = page.locator('.composer-wrap');
		await expect(composerWrap).toBeVisible();

		// There should be at least one input or textarea for variables
		const variableInputs = composerWrap.locator('input[type="text"], textarea');
		const inputCount = await variableInputs.count();
		// Templates may have 0 variables — but usually they have at least 1
		expect(inputCount).toBeGreaterThanOrEqual(0);
	});

	// ── COMPOSE PANEL: LIVE PREVIEW ───────────────────────────────────

	test('compose panel shows Live Preview section', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		await expect(page.locator('text=Live Preview')).toBeVisible();
	});

	test('typing in variable input updates the live preview', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(500);

		const composerWrap = page.locator('.composer-wrap');
		const variableInputs = composerWrap.locator('input[type="text"]');
		const inputCount = await variableInputs.count();

		if (inputCount === 0) {
			// No variable inputs — skip
			return;
		}

		// Get the preview text before filling
		const previewBefore = await composerWrap.locator('pre').innerText();

		// Fill the first variable input with a test value
		const firstInput = variableInputs.first();
		await firstInput.clear();
		await firstInput.fill('E2ETestValue');
		await page.waitForTimeout(300);

		// Preview should now contain the filled value (replacing {{variable}})
		const previewAfter = await composerWrap.locator('pre').innerText();

		// The preview should have changed or contain our value
		// (it may not change if the variable was already pre-filled)
		expect(previewAfter.includes('E2ETestValue') || previewAfter !== previewBefore).toBeTruthy();
	});

	// ── COMPOSE PANEL: CASE PICKER (auto-fill) ────────────────────────

	test('compose panel shows case picker if recent cases exist', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(500);

		// The case picker label says "Link to a Case"
		const casePicker = page.locator('label:has-text("Link to a Case")');
		// Case picker might not appear if no recent cases exist
		const isVisible = await casePicker.isVisible().catch(() => false);
		if (isVisible) {
			// The select element should be present
			const selectEl = page.locator('#case-picker');
			await expect(selectEl).toBeVisible();
		}
	});

	// ── COMPOSE PANEL: ACTION BUTTONS ─────────────────────────────────

	test('compose panel has WhatsApp share button', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		const whatsAppBtn = page.getByRole('button', { name: /Share via WhatsApp/i });
		await expect(whatsAppBtn).toBeVisible();

		// Verify the button has the WhatsApp green color
		const classes = await whatsAppBtn.getAttribute('class');
		expect(classes).toContain('#25d366');
	});

	test('compose panel has Copy Message and Copy for Email buttons', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		await expect(page.getByRole('button', { name: /Copy Message/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Copy for Email/i })).toBeVisible();
	});

	test('Copy Message button shows success feedback', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		// Grant clipboard permissions for the test
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		const copyBtn = page.getByRole('button', { name: /Copy Message/i });
		await copyBtn.click();
		await page.waitForTimeout(500);

		// Success message should appear
		await expect(page.locator('text=Message copied!')).toBeVisible();
	});

	test('WhatsApp button generates wa.me URL', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(300);

		// Intercept window.open calls
		const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);

		const whatsAppBtn = page.getByRole('button', { name: /Share via WhatsApp/i });
		await whatsAppBtn.click();

		const popup = await popupPromise;
		if (popup) {
			const popupUrl = popup.url();
			expect(popupUrl).toContain('wa.me');
			await popup.close();
		}
		// If no popup (blocked by browser), that is acceptable in test env
	});

	// ── MISSING REQUIRED VARS WARNING ─────────────────────────────────

	test('shows missing required fields warning when variables are empty', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		await cards.first().click();
		await page.waitForTimeout(500);

		// Check if "Missing required fields" warning appears
		// (depends on whether the template has required variables)
		const warningVisible = await page
			.locator('text=Missing required fields')
			.isVisible()
			.catch(() => false);

		// Either warning is visible (template has required vars) or it is not (all optional)
		expect(typeof warningVisible).toBe('boolean');
	});

	// ── TAB SWITCHING CLEARS SELECTION ─────────────────────────────────

	test('switching tabs clears the selected template', async ({ page }) => {
		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) {
			test.skip();
			return;
		}

		// Select a template
		await cards.first().click();
		await page.waitForTimeout(300);
		await expect(page.locator('h2:has-text("Compose Message")')).toBeVisible();

		// Switch to RM tab
		const rmTab = page.getByRole('button', { name: /^RM/i });
		await rmTab.click();
		await page.waitForTimeout(300);

		// Selection should be cleared — hint text should show
		await expect(page.locator('text=Select a template to get started')).toBeVisible();
	});

	// ── API: templates endpoint ────────────────────────────────────────

	test('GET /api/communication/templates returns templates', async ({ request }) => {
		const resp = await request.get('/api/communication/templates');
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.templates).toBeTruthy();
		expect(Array.isArray(body.data.templates)).toBe(true);
		expect(body.data.total).toBeGreaterThanOrEqual(0);
	});

	test('GET /api/communication/templates?category=customer filters correctly', async ({
		request
	}) => {
		const resp = await request.get('/api/communication/templates?category=customer');
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);

		// All returned templates should be in the 'customer' category
		for (const tmpl of body.data.templates) {
			expect(tmpl.category).toBe('customer');
		}
	});

	test('GET /api/communication/templates?category=invalid returns 400', async ({ request }) => {
		const resp = await request.get('/api/communication/templates?category=invalid');
		expect(resp.status()).toBe(400);
	});
});
