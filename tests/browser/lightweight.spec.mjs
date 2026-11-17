import { test, expect } from '@playwright/test';
import { expand, tool } from './helpers.mjs';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { window.__rolebridgePreviewTools = true; }); });
const key = 'rolebridge.encrypted-workspace.v1';
async function begin(page, goal = 'clarity') {
  await page.goto('/'); await page.locator('#diagnosis-start').click();
  await expect(page.locator('#step-0')).toBeVisible();
  await page.locator(`[data-goal="${goal}"]`).click();
}
async function experience(page) {
  await page.locator('#currentRole').fill('Release Manager');
  await page.locator('#targetRole').fill('Release Manager');
  await page.locator('#locations').fill('Belfast');
  await page.locator('#evidence').fill('Coordinated production releases and improved release readiness checks.');
  await page.locator('#skills').fill('Release management, Jira');
  await page.locator('#profile-confirmed').check(); await page.locator('#profile-continue').click();
}
for (const [goal, step] of [['clarity', 8], ['interviews', 4], ['offers', 10]]) {
  test(`${goal}: routes directly to the relevant workflow with no signup or personal-data submission`, async ({ page }) => {
    const requests = [], errors = [];
    page.on('request', r => requests.push(r)); page.on('pageerror', e => errors.push(e.message));
    await begin(page, goal);
    if (goal !== 'offers') {
      await expect(page.locator('#step-1')).toBeVisible();
      await page.locator('#profile-continue').click(); await expect(page.locator('#step-1')).toBeVisible();
      await experience(page);
    }
    await expect(page.locator(`#step-${step}`)).toBeVisible();
    if (goal === 'clarity') {
      await expect(page.locator('#vacancy-target')).toHaveValue('Release Manager');
      await expect(page.locator('#vacancy-location')).toHaveValue('Belfast');
    }
    if (goal === 'offers') await expect(page.locator('#prep-cv-file')).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    expect(requests.every(r => r.url().startsWith('http://127.0.0.1:8771/') && r.method() === 'GET' && !r.postData())).toBeTruthy();
    expect(errors).toEqual([]);
  });
}

test('switching focus preserves reviewed experience and takes an existing profile straight to its destination', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await begin(page); await experience(page);
  await page.getByRole('button', { name: 'Change my focus', exact: true }).click();
  await page.locator('[data-goal="interviews"]').click(); await expect(page.locator('#step-4')).toBeVisible();
  await page.getByRole('button', { name: 'Change my focus', exact: true }).click();
  await page.locator('[data-goal="offers"]').click(); await expect(page.locator('#step-10')).toBeVisible();
  await expect(page.locator('#prep-evidence')).toHaveValue(/Coordinated production releases/);
  await tool(page, 1); await expect(page.locator('#currentRole')).toHaveValue('Release Manager');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('quick start protects older saved data and works with browser storage unavailable', async ({ page, context }) => {
  await page.goto('/');
  const legacyKey = 'rolebridge.private-profile.v1';
  const old = JSON.stringify({ version: 1, profile: { currentRole: 'Synthetic previous role' } });
  await page.evaluate(({ legacyKey, old }) => localStorage.setItem(legacyKey, old), { legacyKey, old });
  await page.reload(); await page.locator('#diagnosis-start').click();
  await expect(page.locator('#workspace')).toBeHidden(); await expect(page.locator('#load-saved')).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), legacyKey)).toBe(old);
  const other = await context.newPage();
  await other.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('blocked', 'SecurityError'); }; });
  await begin(other, 'interviews'); await experience(other); await expect(other.locator('#step-4')).toBeVisible(); await other.close();
});

test('navigation cannot bypass missing profile fields by checking review alone; direct interview shortcut needs no profile', async ({ page }) => {
  await begin(page); await page.locator('#profile-confirmed').check();
  await tool(page, 8); await expect(page.locator('#step-1')).toBeVisible();
  await page.goto('/'); await page.locator('#interview-shortcut').click();
  await expect(page.locator('#step-10')).toBeVisible();
  await expect(page.locator('#prep-cv-file')).toBeVisible();
});

test('outcome observations appear only after three valid applications; job actions preserve the selected job', async ({ page }) => {
  await begin(page, 'interviews'); await experience(page);
  for (const title of ['Release Manager', 'Change Manager', 'Delivery Manager']) {
    await tool(page, 4); await page.locator('#add-job').click();
    await page.locator('#job-title').fill(title); await page.locator('#job-employer').fill('Synthetic employer');
    await page.locator('#job-description').fill(`Manage delivery and coordinate releases for the ${title} role.`);
    await page.getByRole('button', { name: 'Save and compare' }).click();
  }
  await tool(page, 5);
  const cards = page.locator('#application-list > article');
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('#search-observation')).toBeHidden();
    const card = cards.nth(i); await card.locator('summary').click();
    await card.locator('[name=stage]').selectOption('applied'); await card.locator('[name=appliedAt]').fill(today);
    await card.getByRole('button', { name: 'Update outcome' }).click();
  }
  await expect(page.locator('#search-observation')).toBeVisible();
  await expand(page, '#search-observation'); await expect(page.locator('#diagnosis-caveat')).toContainText('not enough evidence');
  await cards.nth(1).getByRole('button', { name: 'Prepare for interview' }).click();
  await expect(page.locator('#prep-job-title')).toHaveValue('Change Manager');
});
