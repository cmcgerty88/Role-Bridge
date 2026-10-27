import { test, expect } from '@playwright/test';
import { tool } from './helpers.mjs';
const home = page => page.locator('.header-links [data-home]');
async function backAndResume(page, step) {
  await home(page).click();
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
  await expect(page.locator('#hero-title')).toBeVisible();
  await expect(page.locator('#diagnosis-start')).toHaveText('Continue my job search →');
  await page.locator('#diagnosis-start').click();
  await expect(page.locator(`#step-${step}`)).toBeVisible();
}

test('home is reachable from every workspace tool and preserves unsaved profile and current step', async ({ page }) => {
  let documents = 0; page.on('request', r => { if (r.isNavigationRequest()) documents++; });
  await page.goto('/'); await page.locator('#diagnosis-start').click();
  await backAndResume(page, 0);
  await page.locator('[data-goal="clarity"]').click();
  await page.locator('#currentRole').fill('Release Manager');
  await page.locator('#evidence').fill('Coordinated software releases across several teams.');
  await backAndResume(page, 1);
  await expect(page.locator('#evidence')).toHaveValue('Coordinated software releases across several teams.');
  await page.locator('#profile-confirmed').check();
  for (const step of [2, 3, 8, 4, 5, 10]) {
    await tool(page, step); await backAndResume(page, step);
  }
  await page.locator('.sidebar-brand').click(); await expect(page.locator('.hero')).toBeVisible();
  expect(documents).toBe(1); expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('home preserves unreviewed edits to an existing interview pack and its generated result', async ({ page }) => {
  await page.goto('/'); await page.locator('#interview-shortcut').click();
  await page.locator('#prep-role').fill('Release Manager');
  await page.locator('#prep-evidence').fill('Coordinated releases across several engineering teams.');
  await page.locator('#prep-job-title').fill('Release Manager');
  await page.locator('#prep-description').fill('Coordinate production releases and review rollback plans.');
  await page.locator('#prep-find-focus').click(); await page.locator('#prep-context-status').selectOption('none');
  await page.locator('#prep-reviewed').check(); await page.locator('#prep-create').click();
  await expect(page.locator('#prep-result')).toBeVisible();
  await backAndResume(page, 10); await expect(page.locator('#prep-result')).toBeVisible();
  await page.locator('#prep-edit').click();
  await page.locator('#prep-company-research').fill('Unreviewed research that must stay in this tab.');
  await page.locator('#prep-description').fill('Updated but unreviewed description of release responsibilities.');
  await page.locator('.sidebar-brand').click();
  await page.locator('#interview-shortcut').click();
  await expect(page.locator('#prep-company-research')).toHaveValue('Unreviewed research that must stay in this tab.');
  await expect(page.locator('#prep-description')).toHaveValue('Updated but unreviewed description of release responsibilities.');
  await expect(page.locator('#prep-reviewed')).not.toBeChecked();
});

test('home works before signup and never bypasses a locked workspace', async ({ page }) => {
  const password = 'Synthetic-home-password!';
  await page.goto('/'); await page.locator('#open-workspace').click();
  await home(page).click(); await expect(page.locator('#signup')).toBeHidden();
  await page.locator('#open-workspace').click();
  await page.locator('#password').fill(password); await page.locator('#password-confirm').fill(password);
  await page.locator('#workspace-consent').check(); await page.locator('#create-workspace').click();
  await backAndResume(page, 0);
  await page.reload(); await home(page).click();
  await page.locator('#diagnosis-start').click();
  await expect(page.locator('#workspace')).toBeHidden(); await expect(page.locator('#signup')).toBeVisible();
  await page.locator('#password').fill(password); await page.locator('#create-workspace').click();
  await expect(page.locator('#workspace')).toBeVisible();
});

test('mobile header Home stays visible at the bottom; feedback and demo link to the initial homepage', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/'); await page.locator('#interview-shortcut').click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(home(page)).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await home(page).click(); await expect(page.locator('.hero')).toBeVisible();
  for (const path of ['/feedback/', '/research/rolebridge-demo.html']) {
    await page.goto(path);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const link = page.locator('header').getByRole('link', { name: 'Home', exact: true });
    await expect(link).toBeInViewport(); await link.click();
    await expect(page.locator('.hero')).toBeVisible(); await expect(page.locator('#workspace')).toBeHidden();
  }
});
