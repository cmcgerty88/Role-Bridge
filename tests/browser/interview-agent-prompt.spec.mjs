import { test, expect } from '@playwright/test';

for (const width of [1280, 390]) {
  test(`interview agent prompt stays local and excludes CV by default at ${width}px`, async ({ page }) => {
    const requests = []; page.on('request', request => requests.push(request));
    await page.setViewportSize({ width, height: 740 }); await page.goto('/');
    await page.locator('#interview-shortcut').click(); await expect(page.locator('#step-10')).toBeVisible();
    await page.locator('#prep-employer').fill('Example Ltd'); await page.locator('#prep-job-title').fill('Release Manager');
    await page.locator('#prep-company-url').fill('https://example.com/');
    await page.locator('#prep-description').fill('Coordinate production releases and manage risk across several teams.');
    await page.locator('#prep-agent-tool summary').click();
    await page.locator('#prep-agent-stage').selectOption('Hiring manager');
    await page.locator('#prep-agent-format').selectOption('Video');
    await page.locator('#prep-agent-cv').fill('PRIVATE_CV_STORY');
    await page.locator('#prep-agent-create').click();
    await expect(page.locator('#prep-agent-output')).toHaveValue(/Hiring manager/);
    await expect(page.locator('#prep-agent-output')).not.toHaveValue(/PRIVATE_CV_STORY/);
    await page.locator('#prep-agent-include-cv').check(); await page.locator('#prep-agent-create').click();
    await expect(page.locator('#prep-agent-output')).toHaveValue(/PRIVATE_CV_STORY/);
    await page.locator('#prep-agent-include-cv').uncheck();
    await expect(page.locator('#prep-agent-output')).toHaveValue('');
    await page.locator('.journey-nav [data-step="5"]').click();
    await expect(page.locator('#prep-agent-output')).toHaveValue('');
    await expect(page.locator('#prep-agent-cv')).toHaveValue('');
    expect(requests.every(request => request.url().startsWith('http://127.0.0.1:8771/') && request.method() === 'GET' && !request.postData())).toBeTruthy();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}
