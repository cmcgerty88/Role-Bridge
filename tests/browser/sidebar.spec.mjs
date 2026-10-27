import { test, expect } from '@playwright/test';
const nav = (page, step) => page.locator(`[data-sidebar-step="${step}"]`);

test('desktop left navigation maps to real steps and preserves unsaved inputs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#app-sidebar')).toBeInViewport();
  await expect(page.locator('#app-sidebar nav button')).toHaveCount(10);
  await nav(page, 1).click(); await expect(page.locator('#step-1')).toBeVisible();
  await page.locator('#currentRole').fill('Synthetic role');
  await nav(page, 10).click(); await expect(page.locator('#step-10')).toBeVisible();
  await page.locator('#prep-job-title').fill('Synthetic target');
  await nav(page, 1).click(); await expect(page.locator('#currentRole')).toHaveValue('Synthetic role');
  await nav(page, 10).click(); await expect(page.locator('#prep-job-title')).toHaveValue('Synthetic target');
  await page.locator('[data-sidebar-home]').click(); await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('#diagnosis-start')).toContainText('Continue my job search');
});

test('mobile drawer opens and closes with Escape, and links only to existing pages', async ({ page }) => {
  await page.setViewportSize({width:320,height:740}); await page.goto('/');
  await expect(page.locator('#sidebar-toggle')).toBeVisible();
  await page.locator('#sidebar-toggle').click(); await expect(page.locator('#app-sidebar')).toBeInViewport();
  await expect(page.locator('#sidebar-toggle')).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape'); await expect(page.locator('#sidebar-toggle')).toHaveAttribute('aria-expanded','false');
  await page.locator('#sidebar-toggle').click(); await nav(page,10).click();
  await expect(page.locator('#step-10')).toBeVisible();
  await expect(page.locator('#sidebar-toggle')).toHaveAttribute('aria-expanded','false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('sidebar does not bypass encrypted workspace unlock', async ({ page }) => {
  const password='Synthetic-sidebar-password!'; await page.goto('/');
  await page.locator('#open-workspace').click(); await page.locator('#password').fill(password);
  await page.locator('#password-confirm').fill(password); await page.locator('#workspace-consent').check();
  await page.locator('#create-workspace').click(); await expect(page.locator('#workspace')).toBeVisible();
  await page.reload(); await nav(page,10).click();
  await expect(page.locator('#workspace')).toBeHidden(); await expect(page.locator('#signup')).toBeVisible();
  await page.locator('#password').fill(password); await page.locator('#create-workspace').click();
  await expect(page.locator('#step-10')).toBeVisible();
});
