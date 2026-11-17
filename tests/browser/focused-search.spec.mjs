import { test, expect } from '@playwright/test';

test('public journey focuses on jobs and keeps paused tools out of navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#interview-shortcut')).toBeHidden();
  await expect(page.locator('[data-sidebar-step="6"]')).toBeHidden();
  await expect(page.locator('[data-sidebar-step="10"]')).toBeHidden();
  await page.locator('#diagnosis-start').click();
  await expect(page.locator('[data-goal="offers"]')).toBeHidden();
  await page.locator('[data-goal="applications"]').click();
  await expect(page.locator('#step-1')).toBeVisible();
  await page.locator('#currentRole').fill('Release Manager');
  await page.locator('#evidence').fill('I coordinated release schedules across several delivery teams.');
  await page.locator('#profile-confirmed').check();
  await page.locator('#profile-form button[type="submit"]').click();
  await expect(page.locator('#step-8')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare for interview' })).toHaveCount(0);
  await page.evaluate(() => document.querySelector('[data-step="10"]').click());
  await expect(page.locator('#step-8')).toBeVisible();
  await expect(page.locator('#step-10')).toBeHidden();
  await page.evaluate(() => document.querySelector('[data-sidebar-step="6"]').click());
  await expect(page.locator('#step-8')).toBeVisible();
  await expect(page.locator('#step-6')).toBeHidden();
});

test('checking a job match opens saved jobs without exposing paused tools', async ({ page }) => {
  await page.goto('/');
  await page.locator('#diagnosis-start').click();
  await page.locator('[data-goal="interviews"]').click();
  await page.locator('#currentRole').fill('Release Manager');
  await page.locator('#evidence').fill('I coordinated release schedules across several delivery teams.');
  await page.locator('#profile-confirmed').check();
  await page.locator('#profile-form button[type="submit"]').click();
  await expect(page.locator('#step-4')).toBeVisible();
  await expect(page.locator('#add-job')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare for interview' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Build a CV for this job' })).toHaveCount(0);
});

test('mobile navigation shows the focused search without paused tools', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto('/');
  await page.locator('#sidebar-toggle').click();
  await expect(page.locator('[data-sidebar-step="6"]')).toBeHidden();
  await expect(page.locator('[data-sidebar-step="10"]')).toBeHidden();
  await expect(page.locator('[data-sidebar-step="8"]')).toBeVisible();
  await expect(page.locator('[data-sidebar-step="5"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
