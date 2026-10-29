import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 740 }]) {
  test(`saved job goes to one next step, with interview prep optional at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/');
    await expect(page.locator('.journey-nav button')).toHaveCount(3);
    await page.locator('#diagnosis-start').click(); await page.locator('[data-goal="interviews"]').click();
    await page.locator('#currentRole').fill('Release Manager');
    await page.locator('#evidence').fill('Coordinated production releases and reviewed delivery readiness with several teams.');
    await page.locator('#profile-confirmed').check(); await page.locator('#profile-continue').click();
    await page.locator('#add-job').click();
    await page.locator('#job-title').fill('Release Manager'); await page.locator('#job-employer').fill('Example Ltd');
    await page.locator('#job-description').fill('Coordinate releases and communicate change risks to delivery teams.');
    await page.getByRole('button', { name: 'Save and compare' }).click();
    await expect(page.locator('#job-list .job-card')).toHaveCount(1);
    await page.locator('#job-list .job-card').getByRole('button', { name: 'See my next step' }).click();
    await expect(page.locator('#step-5')).toBeVisible();
    await expect(page.locator('#search-next-title')).toContainText('Decide your next move');
    const card = page.locator('#application-list article').first();
    await card.locator('.quick-outcome select').selectOption('applied');
    await expect(card.locator('.quick-dates')).toBeVisible();
    await card.locator('.quick-outcome input[type="date"]').first().fill('2026-10-28');
    await card.locator('.quick-outcome button[type="submit"]').click();
    await expect(page.locator('#dashboard-stats')).toContainText('1');
    await expect(page.locator('#step-10')).toBeHidden();
    const refreshed = page.locator('#application-list article').first();
    await refreshed.locator('.quick-outcome select').selectOption('booked');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await refreshed.locator('.quick-outcome input[type="date"]').last().fill(tomorrow);
    await refreshed.locator('.quick-outcome button[type="submit"]').click();
    await expect(page.locator('#search-next-title')).toContainText('Prepare for your Release Manager interview');
    await page.locator('#search-next-action').click();
    await expect(page.locator('#step-10')).toBeVisible();
    await expect(page.locator('#prep-job-title')).toHaveValue('Release Manager');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}
