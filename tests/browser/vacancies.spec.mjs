import { test, expect } from '@playwright/test';
import { tool, expand, confirmProfile } from './helpers.mjs';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { window.__rolebridgePreviewTools = true; }); });
const key = 'rolebridge.encrypted-workspace.v1';
const item = (id, title, location, description = 'Customer service and Excel reporting with scheduling responsibilities.') => ({ id: `reed-${id}`, title, employer: 'Synthetic employer', location, description, url: `https://www.reed.co.uk/jobs/synthetic/${id}`, expiresAt: '' });
const sample = () => ({ version: 1, provider: 'reed', status: 'ready', fetchedAt: new Date().toISOString(), partial: false, jobs: [item(1, 'Operations manager', 'Belfast'), item(2, 'Operations manager', 'London'), item(3, 'Software developer', 'Belfast')] });
async function begin(page, prefix = '/') {
  await page.goto(prefix); await page.locator('#diagnosis-start').click(); await page.locator('[data-goal="clarity"]').click();
  await page.locator('#currentRole').fill('Synthetic service coordinator');
  await page.locator('#targetRole').fill('Operations manager');
  await page.locator('#evidence').fill('Prepared weekly reports and planned customer service schedules.');
  await page.locator('#skills').fill('Excel, customer service, scheduling');
  await page.locator('#profile-confirmed').check(); await page.locator('#profile-form button[type="submit"]').click();
  await expect(page.locator('#step-8')).toBeVisible();
}
async function filter(page, target, location = '') {
  await page.locator('#vacancy-target').fill(target); await page.locator('#vacancy-location').fill(location);
  await page.getByRole('button', { name: 'Find suggestions', exact: true }).click();
}

test('suggestions use target role, confirmed skills and Belfast location locally; one click imports safely through to interview preparation', async ({ page }) => {
  const requests = [], errors = [];
  page.on('request', r => requests.push({ url: r.url(), method: r.method(), body: r.postData() })); page.on('pageerror', e => errors.push(e.message));
  await page.route('**/data/vacancies.json', route => route.fulfill({ json: sample() }));
  await begin(page); await expect(page.locator('.vacancy-suggestion')).toHaveCount(2);
  await filter(page, 'Operations manager', 'Belfast');
  await expect(page.locator('.vacancy-suggestion')).toHaveCount(1);
  await expect(page.locator('.vacancy-suggestion')).toContainText('Excel');
  await page.getByRole('button', { name: 'Add to my shortlist', exact: true }).click();
  await expect(page.getByRole('button', { name: 'In my shortlist', exact: true })).toBeDisabled();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  await page.locator('#step-8').getByRole('button', { name: 'My saved jobs', exact: true }).click();
  await expect(page.locator('#job-list .job-card')).toHaveCount(1);
  await expect(page.locator('#job-list')).toContainText('Imported from a Reed summary');
  await expect(page.locator('#job-list .badge')).toHaveText('Investigate');
  await expect(page.locator('#job-list')).toContainText('not been checked');
  await page.getByRole('button', { name: 'Edit Operations manager', exact: true }).click();
  await expect(page.locator('#job-country')).toHaveValue('unknown'); await expect(page.locator('#job-essentials')).toHaveValue('unknown');
  await expect(page.locator('#job-min')).toHaveValue(''); await expect(page.locator('#job-description')).toHaveValue(/customer service/i);
  await page.getByRole('button', { name: 'Save and compare' }).click();
  await expect(page.locator('#job-list')).toContainText('Imported from a Reed summary');
  await page.getByRole('button', { name: 'Prepare for interview', exact: true }).click();
  await expect(page.locator('#prep-job-status')).toContainText('short Reed summary');
  await expect(page.locator('#prep-description')).toBeEditable();
  await expect(page.locator('#prep-job-title')).toHaveValue('Operations manager');
  expect(requests.every(r => r.url.startsWith('http://127.0.0.1:8771/') && r.method === 'GET' && !r.body)).toBeTruthy();
  const feedRequests = requests.filter(r => r.url.includes('vacancies.json'));
  expect(feedRequests.length).toBe(1); expect(feedRequests[0].url).toBe('http://127.0.0.1:8771/data/vacancies.json');
  expect(errors).toEqual([]);
});

test('target and imported shortlist persist encrypted; changing searches never replaces a saved application', async ({ page }) => {
  await page.route('**/data/vacancies.json', route => route.fulfill({ json: sample() }));
  await begin(page); await filter(page, 'Operations manager', 'Belfast');
  await page.getByRole('button', { name: 'Add to my shortlist', exact: true }).click();
  await page.locator('#save-open').click();
  const password = 'Synthetic-vacancy-password!';
  await page.locator('#save-password').fill(password); await page.locator('#save-password-confirm').fill(password);
  await page.locator('#save-consent').check(); await page.locator('#save-confirm').click(); await expect(page.locator('#save-dialog')).toBeHidden();
  const raw = await page.evaluate(k => localStorage.getItem(k), key); expect(raw).not.toContain('Operations manager'); expect(raw).not.toContain('Belfast');
  await page.reload(); await page.locator('#password').fill(password); await page.locator('#create-workspace').click();
  await expect(page.locator('#step-5')).toBeVisible();
  await confirmProfile(page); await tool(page, 8);
  await expect(page.locator('#vacancy-target')).toHaveValue('Operations manager'); await expect(page.locator('#vacancy-location')).toHaveValue('Belfast');
  await expect(page.getByRole('button', { name: 'In my shortlist', exact: true })).toBeDisabled();
  await filter(page, 'Software developer', 'Belfast'); await expect(page.locator('.vacancy-suggestion')).toHaveCount(1);
  await tool(page, 4); await expect(page.locator('#job-list .job-card')).toHaveCount(1); await expect(page.locator('#job-list')).toContainText('Operations manager');
});

test('unconfigured feed, stale feed, expired jobs and errors show honest states without fake vacancies', async ({ page }) => {
  await begin(page); await expect(page.locator('#vacancy-pool-status')).toContainText('not connected yet');
  await expect(page.locator('.vacancy-suggestion')).toHaveCount(0);
  let data = { ...sample(), fetchedAt: new Date(Date.now() - 4 * 86400000).toISOString() };
  await page.route('**/data/vacancies.json', route => route.fulfill({ json: data }));
  await page.locator('#vacancy-refresh').click(); await expect(page.locator('#vacancy-pool-status')).toContainText('Older suggestions are hidden');
  data = sample(); data.jobs[0].expiresAt = new Date(Date.now() - 86400000).toISOString();
  await page.locator('#vacancy-refresh').click(); await expect(page.locator('.vacancy-suggestion')).toHaveCount(1);
  await expect(page.locator('.vacancy-suggestion')).toContainText('London');
  await filter(page, 'Neurosurgeon'); await expect(page.locator('#vacancy-suggestions')).toContainText('nothing about your employability');
  await page.unroute('**/data/vacancies.json'); await page.route('**/data/vacancies.json', route => route.abort());
  await page.locator('#vacancy-refresh').click(); await expect(page.locator('#vacancy-pool-status')).toContainText('could not be loaded');
  await expect(page.locator('.vacancy-suggestion')).toHaveCount(0);
});

test('pool hosting in project path, mobile layout and provider text are safe', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/Role-Bridge/**', route => route.continue({ url: route.request().url().replace('/Role-Bridge/', '/') }));
  const data = sample(); data.partial = true; data.jobs[0].employer = '<img src=x onerror="window.unsafe=true">';
  await page.route('**/data/vacancies.json', route => route.fulfill({ json: data }));
  await begin(page, '/Role-Bridge/');
  await expect(page.locator('#vacancy-pool-status')).toContainText('coverage is reduced');
  await expect(page.locator('.vacancy-suggestion img')).toHaveCount(0);
  expect(await page.evaluate(() => window.unsafe)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('empty matches explain location exclusions and allow temporary browsing without changing preferences', async ({ page }) => {
  const requests = []; page.on('request', request => requests.push(request.url()));
  await page.route('**/data/vacancies.json', route => route.fulfill({ json: sample() }));
  await begin(page);
  await filter(page, 'Operations manager', 'Northern Ireland');
  await expect(page.locator('.vacancy-suggestion')).toHaveCount(0);
  await expect(page.locator('#vacancy-suggestions')).toContainText('2 role or skill matches');
  await page.getByRole('button', { name: 'Show 2 matches across all locations', exact: true }).click();
  await expect(page.locator('.vacancy-suggestion')).toHaveCount(2);
  await expect(page.locator('#vacancy-pool-status')).toContainText('across all listed locations');
  await expect(page.locator('#vacancy-location')).toHaveValue('Northern Ireland');
  await page.getByRole('button', { name: 'Back to my matches', exact: true }).click();
  await expect(page.locator('.vacancy-suggestion')).toHaveCount(0);
  await filter(page, 'Neurosurgeon', 'Northern Ireland');
  await expect(page.locator('#vacancy-suggestions')).toContainText('title filter requires');
  await page.getByRole('button', { name: 'Browse all 3 listings', exact: true }).click();
  await expect(page.locator('.vacancy-suggestion')).toHaveCount(3);
  await expect(page.locator('#vacancy-pool-status')).toContainText('not personalised suggestions');
  await expect(page.locator('.vacancy-suggestion').first()).toContainText('Unfiltered listing');
  await page.locator('.vacancy-suggestion').first().getByRole('button', { name: 'Add to my shortlist', exact: true }).click();
  await page.getByRole('button', { name: 'Back to my matches', exact: true }).click();
  await tool(page, 1);
  await expect(page.locator('#targetRole')).toHaveValue('Neurosurgeon');
  await tool(page, 2); await expect(page.locator('#locations')).toHaveValue('Northern Ireland');
  await tool(page, 4); await expect(page.locator('#job-list .job-card')).toHaveCount(1);
  expect(requests.filter(url => url.includes('vacancies.json'))).toEqual(Array(2).fill('http://127.0.0.1:8771/data/vacancies.json'));
  expect(requests.every(url => url.startsWith('http://127.0.0.1:8771/'))).toBeTruthy();
});

test('a genuinely empty feed does not offer ineffective broader searches', async ({ page }) => {
  await page.route('**/data/vacancies.json', route => route.fulfill({ json: { ...sample(), jobs: [] } }));
  await begin(page);
  await expect(page.locator('#vacancy-suggestions')).toContainText('no usable, unexpired listings');
  await expect(page.getByRole('button', { name: /Browse all|matches across all locations/ })).toHaveCount(0);
});

test('manual vacancy entry is retained alongside popular-site searches and related titles without automatic external requests', async ({ page, context }) => {
  const requests = []; context.on('request', r => requests.push({ url: r.url(), referrer: r.headers().referer }));
  await begin(page);
  await expect(page.locator('#vacancy-pool-status')).toContainText('not connected yet');
  await expect(page.locator('#jobsite-title')).toHaveText('Search UK & Northern Ireland job sites');
  await page.locator('#vacancy-target').fill('Customer support coordinator');
  await expect(page.locator('#jobsite-role option')).toHaveCount(3);
  await page.locator('#vacancy-location').fill('Belfast');
  const linkedin = page.getByRole('link', { name: 'Search LinkedIn', exact: true });
  const url = new URL(await linkedin.getAttribute('href'));
  expect(url.searchParams.get('keywords')).toBe('Customer support coordinator'); expect(url.searchParams.get('location')).toBe('Belfast');
  const cvLibrary = page.getByRole('link', { name: 'Search CV-Library', exact: true });
  const cvLibraryUrl = new URL(await cvLibrary.getAttribute('href'));
  expect(cvLibraryUrl.searchParams.get('q')).toBe('Customer support coordinator');
  expect(cvLibraryUrl.searchParams.get('geo')).toBe('Belfast');
  await expect(page.getByRole('link', { name: 'Search NIJobs', exact: true })).toHaveAttribute('href', 'https://www.nijobs.com/jobs/customer-support-coordinator/in-belfast');
  const finder = page.getByRole('link', { name: 'Search nijobfinder', exact: true });
  await expect(finder).toHaveAttribute('href', 'https://www.nijobfinder.co.uk/jobs/?Keywords=Customer+support+coordinator#browsing');
  await page.locator('#jobsite-role').selectOption({ index: 1 });
  await expect(page.locator('#jobsite-search-summary')).toContainText('Related title');
  const related = await page.locator('#jobsite-role').inputValue();
  expect(new URL(await linkedin.getAttribute('href')).searchParams.get('keywords')).toBe(related);
  expect(new URL(await cvLibrary.getAttribute('href')).searchParams.get('q')).toBe(related);
  expect(new URL(await finder.getAttribute('href')).searchParams.get('Keywords')).toBe(related);
  await expect(page.getByRole('button', { name: 'Copy role for nijobfinder', exact: true })).toHaveCount(0);
  expect(requests.every(r => r.url.startsWith('http://127.0.0.1:8771/'))).toBeTruthy();
  await context.route('https://www.linkedin.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Synthetic search destination</title>' }));
  const popupPromise = page.waitForEvent('popup'); await linkedin.click(); const popup = await popupPromise; await popup.waitForLoadState();
  const external = requests.find(r => r.url.startsWith('https://www.linkedin.com/'));
  expect(external.referrer).toBeUndefined(); expect(external.url).not.toContain('Excel'); expect(external.url).not.toContain('Synthetic');
  await popup.close();
  await page.locator('#suggestions-add-manual').click(); await expect(page.locator('#job-dialog')).toBeVisible();
  await page.locator('#job-title').fill('Synthetic LinkedIn vacancy'); await page.locator('#job-employer').fill('Synthetic employer');
  await page.locator('#job-url').fill('https://www.linkedin.com/jobs/view/123456789');
  await page.locator('#job-description').fill('Synthetic example: prepare reports and coordinate customer service.');
  await page.getByRole('button', { name: 'Save and compare', exact: true }).click();
  await expect(page.locator('#job-list')).toContainText('Synthetic LinkedIn vacancy');
  await expect(page.getByRole('button', { name: 'Add a vacancy', exact: true })).toBeVisible();
});
