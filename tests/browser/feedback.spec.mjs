import { test, expect } from '@playwright/test';
const endpoint = 'https://formspree.io/f/testform';
async function configure(context, enabled = true) {
  await context.route('**/src/feedback-config.mjs', route => route.fulfill({ contentType: 'text/javascript', body: `export const FEEDBACK_ENDPOINT = '${enabled ? endpoint : ''}';` }));
}
async function fill(page) {
  for (const [name, value] of Object.entries({ task: 'interview', start: 'quite-easy', completion: 'alone', usefulness: 'very', return: 'very-likely' })) await page.locator(`input[name="${name}"][value="${value}"]`).check();
  await page.locator('#feedback-improvement').fill('Clearer next steps');
  await page.locator('#feedback-consent').check();
}
async function intercept(context, handler) {
  await context.route('https://formspree.io/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
    return handler(route);
  });
}
const response = (route, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"recipient":"private-recipient@example.test"}' });

test('unconfigured feedback is reachable and editable, but cannot send or silently save answers', async ({ page, context }) => {
  await configure(context, false);
  const requests = []; await intercept(context, route => { requests.push(route.request()); return response(route); });
  await page.goto('/');
  await expect(page.locator('[data-feedback-link]').first()).toBeVisible();
  await expect(page.locator('footer [data-feedback-link]')).toBeVisible();
  const popupPromise = context.waitForEvent('page');
  await page.locator('[data-feedback-link]').first().click();
  const feedback = await popupPromise;
  await expect(feedback).toHaveURL(/\/feedback\/$/);
  await expect(feedback.locator('.feedback-question')).toHaveCount(7);
  await expect(feedback.locator('#feedback-unavailable')).toContainText('Preview only');
  await expect(feedback.locator('#feedback-send')).toBeDisabled();
  await fill(feedback);
  await expect(feedback.locator('input[name="task"][value="interview"]')).toBeChecked();
  await expect(feedback.locator('#feedback-improvement')).toHaveValue('Clearer next steps');
  await feedback.locator('#feedback-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
  await expect(feedback.locator('#feedback-success')).toBeHidden();
  expect(requests).toHaveLength(0);
  feedback.once('dialog', dialog => dialog.accept()); await feedback.locator('#feedback-clear').click();
  await expect(feedback.locator('#feedback-improvement')).toHaveValue('');
  await expect(feedback.locator('input[name="task"][value="interview"]')).not.toBeChecked();
  await fill(feedback);
  feedback.once('dialog', dialog => dialog.accept()); await feedback.reload();
  await expect(feedback.locator('#feedback-improvement')).toHaveValue('');
  await expect(feedback.locator('#feedback-consent')).not.toBeChecked();
  expect(await feedback.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(requests).toHaveLength(0);
});

test('only explicit feedback is sent; no workspace storage is accessed and success clears answers', async ({ page, context }) => {
  await configure(context);
  await page.addInitScript(() => {
    localStorage.setItem('synthetic-private-cv', 'PRIVATE_CV_MARKER');
    Storage.prototype.getItem = () => { throw Error('Feedback must not read storage'); };
    Storage.prototype.setItem = () => { throw Error('Feedback must not write storage'); };
  });
  const errors = [], requests = []; page.on('pageerror', error => errors.push(error.message));
  await intercept(context, route => { requests.push(route.request()); return response(route); });
  await page.goto('/feedback/'); await expect(page.locator('#feedback-send')).toBeEnabled();
  await page.locator('#feedback-send').click(); expect(requests).toHaveLength(0);
  await fill(page);
  await page.locator('#feedback-consent').uncheck(); await page.locator('#feedback-send').click(); expect(requests).toHaveLength(0);
  await page.locator('#feedback-consent').check(); await page.locator('#feedback-send').click();
  await expect(page.locator('#feedback-success')).toBeVisible();
  expect(requests).toHaveLength(1);
  const request = requests[0];
  expect(Object.keys(request.postDataJSON())).toHaveLength(10);
  expect(request.postData()).not.toMatch(/PRIVATE_CV_MARKER|synthetic-private-cv/);
  expect(request.headers().referer).toBeUndefined(); expect(request.headers().cookie).toBeUndefined();
  await expect(page.locator('#feedback-improvement')).toHaveValue('');
  await expect(page.locator('#feedback-consent')).not.toBeChecked();
  await expect(page.locator('body')).not.toContainText('private-recipient@example.test');
  expect(errors).toEqual([]);
});

for (const status of [422, 429, 503, 'network']) {
  test(`failed submission (${status}) retains answers without claiming success or exposing provider details`, async ({ page, context }) => {
    await configure(context);
    await intercept(context, route => status === 'network' ? route.abort() : response(route, status));
    await page.goto('/feedback/'); await fill(page); await page.locator('#feedback-send').click();
    await expect(page.locator('#feedback-status')).toContainText('answers are still here');
    await expect(page.locator('#feedback-success')).toBeHidden();
    await expect(page.locator('#feedback-improvement')).toHaveValue('Clearer next steps');
    await expect(page.locator('#feedback-send')).toBeEnabled();
    await expect(page.locator('body')).not.toContainText('private-recipient@example.test');
  });
}

test('pending submission cannot be duplicated; clear removes answers without sending; mobile fits', async ({ page, context }) => {
  await configure(context); await page.setViewportSize({ width: 320, height: 740 });
  let release; const gate = new Promise(resolve => { release = resolve; });
  let count = 0; await intercept(context, async route => { count++; await gate; return response(route); });
  await page.goto('/feedback/'); await fill(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  page.once('dialog', dialog => dialog.accept()); await page.locator('#feedback-clear').click();
  await expect(page.locator('#feedback-improvement')).toHaveValue(''); expect(count).toBe(0);
  await fill(page); await page.locator('#feedback-send').click();
  await expect(page.locator('#feedback-send')).toBeDisabled();
  await page.locator('#feedback-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
  await expect.poll(() => count).toBe(1); release();
  await expect(page.locator('#feedback-success')).toBeVisible(); expect(count).toBe(1);
});

test('main-site link opens a separate tab and preserves the unsaved profile', async ({ page, context }) => {
  await configure(context); await intercept(context, route => response(route));
  await page.goto('/'); await page.locator('#diagnosis-start').click(); await page.locator('[data-goal="clarity"]').click();
  await page.locator('#currentRole').fill('Synthetic unsaved role');
  const popupPromise = context.waitForEvent('page');
  await page.locator('footer [data-feedback-link]').click(); const popup = await popupPromise;
  await expect(popup.locator('#feedback-send')).toBeEnabled();
  await expect(page.locator('#currentRole')).toHaveValue('Synthetic unsaved role');
  await popup.close();
});
