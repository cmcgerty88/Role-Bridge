import { expand, tool, chooseSituation, profileEditor, confirmProfile, privacyControl, tracker } from './helpers.mjs';
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const storageKey = 'rolebridge.encrypted-workspace.v1';
const password = 'Synthetic-unrelated-words-only!';
async function begin(page, url = '/') { await page.goto(url); await page.locator('#diagnosis-start').click(); await chooseSituation(page); await profileEditor(page); await expand(page, '#cv-reader'); }
async function saveWorkspace(page) {
  await page.locator('#save-password').fill(password); await page.locator('#save-password-confirm').fill(password);
  await page.locator('#save-consent').check(); await page.getByRole('button', { name: 'Save my information', exact: true }).click();
  await expect(page.locator('#save-dialog')).not.toBeVisible();
}
async function unlock(page) { await page.locator('#password').fill(password); await page.getByRole('button', { name: 'Unlock workspace', exact: true }).click(); await expect(page.locator('#workspace')).toBeVisible(); }
async function completeProfile(page, { stopAtDirections = false } = {}) {
  await page.locator('#name').fill('Synthetic Alex');
  await page.locator('#currentRole').fill('Customer support coordinator');
  await page.locator('#evidence').fill('Led a team of 9. Planned weekly cover and improved customer service reporting.');
  await page.locator('#skills').fill('Excel, customer service');
  await confirmProfile(page);
  await page.locator('#profile-continue').click(); await tool(page, 2);
  await page.locator('#country').selectOption('GB');
  await page.locator('#minimumSalary').fill('40000');
  await page.locator('#workMode').selectOption('hybrid');
  await page.locator('#maxOfficeDays').selectOption('2');
  await page.locator('#sponsorship').selectOption('no');
  await page.locator('#preferences-form button[type=submit]').click();
  await tool(page, stopAtDirections ? 3 : 4);
}
async function fillVacancy(page) {
  await page.getByRole('button', { name: 'Add a vacancy', exact: true }).click();
  await page.locator('#job-title').fill('Synthetic service coordinator');
  await page.locator('#job-employer').fill('Fictional Test Employer');
  await page.locator('#job-url').fill('https://example.com/jobs/synthetic');
  await page.locator('#job-description').fill('Coordinate customer service, plan schedules and prepare Excel reports. This is a synthetic test vacancy.');
  await expand(page, '#job-extra-facts');
  await page.locator('#job-country').selectOption('GB');
  await page.locator('#job-min').fill('40000');
  await page.locator('#job-max').fill('46000');
  await page.locator('#job-mode').selectOption('hybrid');
  await page.locator('#job-office').selectOption('2');
  await page.locator('#job-location-fits').selectOption('yes');
  await page.locator('#job-essentials').selectOption('yes');
  await page.locator('#job-status').selectOption('open');
}

test('real-input journey, conservative comparison, edits and removal', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page); await completeProfile(page); await fillVacancy(page);
  await page.getByRole('button', { name: 'Save and compare' }).click();
  await expect(page.locator('.job-card .badge')).toHaveText('Consider');
  await expect(page.locator('#job-list')).toContainText('Synthetic service coordinator');
  await expand(page, '.summary');
  await page.getByRole('button', { name: 'Edit work preferences' }).click();
  await page.locator('#workMode').selectOption('remote');
  await page.locator('#preferences-form button[type=submit]').click();
  await tool(page, 4);
  await expect(page.locator('.job-card .badge')).toHaveText('Skip');
  await expect(page.locator('#action-list')).not.toContainText('Synthetic service coordinator');
  await page.getByRole('button', { name: 'Remove Synthetic service coordinator' }).click();
  await page.getByRole('button', { name: 'Remove vacancy', exact: true }).click();
  await expect(page.locator('.job-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('CV text never leaves the browser and storage requires explicit consent', async ({ page }) => {
  const requests = []; page.on('request', request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await begin(page);
  await page.locator('#cv-file').setInputFiles({ name: 'synthetic-cv.txt', mimeType: 'text/plain', buffer: Buffer.from('PRIVATE_RAW_CV_MARKER. Synthetic candidate with customer service, Excel and scheduling experience.') });
  await expect(page.locator('#cv-text')).toHaveValue(/PRIVATE_RAW_CV_MARKER/);
  await expect(page.locator('#skill-chips')).toContainText('Excel');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await completeProfile(page);
  await page.getByRole('button', { name: 'Save on this device', exact: true }).click();
  await page.getByRole('button', { name: 'Save my information', exact: true }).click();
  await expect(page.locator('#save-error')).toContainText('Please confirm');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await saveWorkspace(page);
  const saved = await page.evaluate(key => localStorage.getItem(key), storageKey);
  expect(saved).not.toContain('Synthetic Alex'); expect(saved).not.toContain('PRIVATE_RAW_CV_MARKER');
  const decrypted = await page.evaluate(async ({ key, password }) => { const { unseal } = await import('/src/vault.mjs'); return (await unseal(localStorage.getItem(key), password)).json; }, { key: storageKey, password });
  expect(decrypted).toContain('Synthetic Alex'); expect(decrypted).not.toContain('PRIVATE_RAW_CV_MARKER');
  await page.reload();
  await expect(page.locator('#name')).toHaveValue('');
  await unlock(page);
  await expect(page.locator('#name')).toHaveValue('Synthetic Alex');
  await expect(page.locator('#cv-text')).toHaveValue('');
  await privacyControl(page, 'clear-open');
  await page.getByRole('button', { name: 'Clear everything in this app', exact: true }).click();
  await expect(page.locator('.hero')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await expect(page.locator('#name')).toHaveValue('');
  expect(requests.every(request => request.url.startsWith('http://127.0.0.1:8771/') && request.method === 'GET' && !request.body)).toBeTruthy();
  expect(requests.some(request => request.url.includes('PRIVATE_RAW_CV_MARKER'))).toBeFalsy();
});

test('PDF reader extracts a synthetic CV without external requests', async ({ page, browser }) => {
  const generator = await browser.newPage();
  await generator.setContent('<html><body><h1>Synthetic CV</h1><p>Customer service team leader. Excel reporting and scheduling. Led a team of nine.</p></body></html>');
  const pdf = await generator.pdf(); await generator.close();
  const requests = []; page.on('request', request => requests.push(request.url()));
  await begin(page);
  await page.locator('#cv-file').setInputFiles({ name: 'synthetic-cv.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.locator('#cv-status')).toContainText('Read synthetic-cv.pdf', { timeout: 15000 });
  await expect(page.locator('#cv-text')).toHaveValue(/Customer service team leader/);
  expect(requests.every(url => url.startsWith('http://127.0.0.1:8771/'))).toBeTruthy();
});

test('DOCX reader extracts plain text and error cases have a usable fallback', async ({ page }) => {
  await begin(page);
  await page.locator('#cv-file').setInputFiles(fileURLToPath(new URL('../fixtures/synthetic-cv.docx', import.meta.url)));
  await expect(page.locator('#cv-status')).toContainText('Read synthetic-cv.docx');
  await expect(page.locator('#cv-status')).toHaveAttribute('data-upload-state', 'success');
  await expect(page.locator('#cv-text')).toHaveValue(/Synthetic candidate/);
  await page.locator('#cv-file').setInputFiles({ name: 'old-cv.doc', mimeType: 'application/msword', buffer: Buffer.from('Synthetic older document') });
  await expect(page.locator('#cv-status')).toContainText('exported as DOCX');
  await expect(page.locator('#cv-status')).toHaveAttribute('data-upload-state', 'error');
  await page.locator('#cv-file').setInputFiles({ name: 'too-large.txt', mimeType: 'text/plain', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 'a') });
  await expect(page.locator('#cv-status')).toContainText('smaller than 5 MB');
  await expect(page.locator('#cv-text')).toBeEnabled();
});

test('pasted content is text, unsafe links and inconsistent salary are rejected', async ({ page }) => {
  await begin(page); await completeProfile(page); await fillVacancy(page);
  await page.locator('#job-employer').fill('<img src=x onerror="window.xssExecuted=true">');
  await page.locator('#job-url').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Save and compare' }).click();
  await expect(page.locator('#job-error')).toContainText('HTTPS');
  await page.locator('#job-url').fill('https://example.com/jobs/synthetic');
  await page.locator('#job-min').fill('50000');
  await page.getByRole('button', { name: 'Save and compare' }).click();
  await expect(page.locator('#job-error')).toContainText('lower salary');
  await page.locator('#job-min').fill('40000');
  await page.locator('#job-essentials').selectOption('unknown');
  await page.getByRole('button', { name: 'Save and compare' }).click();
  await expect(page.locator('.job-card .badge')).toHaveText('Investigate');
  await expect(page.locator('.job-card img')).toHaveCount(0);
  expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
});

test('mobile journey has no overflow and can complete without a CV', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await begin(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await completeProfile(page); await fillVacancy(page);
  expect(await page.locator('#job-dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Save and compare' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.locator('.job-card')).toHaveCount(1);
});

test('project-subdirectory hosting resolves locally bundled scripts and CV readers', async ({ page }) => {
  await page.route('**/Role-Bridge/**', route => route.continue({ url: route.request().url().replace('/Role-Bridge/', '/') }));
  await begin(page, '/Role-Bridge/');
  await page.locator('#cv-file').setInputFiles(fileURLToPath(new URL('../fixtures/synthetic-cv.docx', import.meta.url)));
  await expect(page.locator('#cv-text')).toHaveValue(/Synthetic candidate/);
  await completeProfile(page);
  await expect(page.locator('#vacancies-title')).toBeVisible();
});

test('local role directions explain skills, prepare searches and never call an AI or job service', async ({ page, context }) => {
  const requests = [], errors = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method() }));
  page.on('pageerror', error => errors.push(error.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await begin(page); await completeProfile(page, { stopAtDirections: true });
  await expect(page.locator('#directions-title')).toBeVisible();
  await expect(page.locator('#step-3')).toContainText('Local library · no AI connection');
  const card = page.locator('[data-role-id="service-delivery-coordinator"]');
  await expect(card).toBeVisible();
  await expect(card.locator('.role-connections')).toContainText('customer service');
  await expect(card.locator('.role-connections')).toContainText('Excel');
  await card.getByRole('button', { name: 'Save this direction' }).click();
  await expect(page.locator('#saved-directions')).toContainText('Service delivery coordinator');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await card.locator('summary').click();
  await expect(card).toContainText('not recorded as matching labels');
  await card.getByRole('button', { name: 'Copy search phrases' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('service delivery coordinator hybrid UK');
  await tool(page, 4);
  await expect(page.locator('#action-list')).toContainText('Explore: Service delivery coordinator');
  expect(requests.every(request => request.url.startsWith('http://127.0.0.1:8771/') && request.method === 'GET')).toBeTruthy();
  expect(errors).toEqual([]);
});

test('saved directions survive encrypted saving and clear removes derived content', async ({ page }) => {
  await begin(page); await completeProfile(page, { stopAtDirections: true });
  await page.locator('[data-role-id="service-delivery-coordinator"]').getByRole('button', { name: 'Save this direction' }).click();
  await page.getByRole('button', { name: 'Save on this device', exact: true }).click();
  await saveWorkspace(page);
  await page.reload(); await unlock(page);
  await confirmProfile(page);
  await tool(page, 3);
  await expect(page.locator('#saved-directions')).toContainText('Service delivery coordinator');
  await page.locator('#role-view').selectOption('saved');
  await expect(page.locator('.role-card')).toHaveCount(1);
  await privacyControl(page, 'clear-open');
  await page.getByRole('button', { name: 'Clear everything in this app', exact: true }).click();
  await expect(page.locator('#role-list')).toBeEmpty();
  await expect(page.locator('#direction-evidence')).toBeEmpty();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('no-match state remains useful, browsing respects the save limit, and profile changes do not invent evidence', async ({ page }) => {
  await begin(page); await completeProfile(page, { stopAtDirections: true });
  await page.getByRole('button', { name: 'Review my confirmed skills' }).click();
  await page.locator('#skills').fill('I have no SQL, not Excel');
  await confirmProfile(page); await tool(page, 3);
  await expect(page.locator('.role-card')).toHaveCount(0);
  await expect(page.locator('#role-list')).toContainText('This says nothing about your employability');
  await page.getByRole('button', { name: 'Browse all directions', exact: true }).click();
  await expect(page.locator('.role-card')).toHaveCount(17);
  for (let i = 0; i < 5; i++) await page.locator('.role-card').nth(i).getByRole('button', { name: 'Save this direction' }).click();
  await page.locator('.role-card').nth(5).getByRole('button', { name: 'Save this direction' }).click();
  await expect(page.locator('#direction-feedback')).toContainText('saved five directions');
  await expect(page.locator('#saved-directions > li')).toHaveCount(5);
  await expect(page.locator('#saved-directions')).toContainText('not currently connected');
  await page.locator('#role-search').fill('reporting analyst');
  await expect(page.locator('.role-card')).toHaveCount(1);
  await page.locator('#role-view').selectOption('saved');
  await expect(page.locator('.role-card')).toHaveCount(0);
});

test('mobile directions and unavailable clipboard have an accessible fallback', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Permission denied'); } } }));
  await page.setViewportSize({ width: 390, height: 844 }); await begin(page);
  await completeProfile(page, { stopAtDirections: true });
  const card = page.locator('[data-role-id="service-delivery-coordinator"]');
  await card.locator('summary').click();
  await card.getByRole('button', { name: 'Copy search phrases' }).click();
  await expect(card).toContainText('Automatic copying is unavailable');
  await expect(card.locator('.search-phrases')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
