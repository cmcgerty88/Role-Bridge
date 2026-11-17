import { test, expect } from '@playwright/test';
import { expand, privacyControl, tool } from './helpers.mjs';
const cv = `PRIVATE_RAW_MARKER private@example.test
Work experience
Release Manager | Example Employer | Jan 2023 - Present
Coordinated production releases across four teams.
Improved readiness checks with Jira.
Created rollback plans for critical services.
Skills
Release management, ITIL, Excel.
Education
PRIVATE_EDUCATION_MARKER`;
const upload = page => page.locator('#cv-file').setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from(cv) });
const key = 'rolebridge.encrypted-workspace.v1', password = 'Synthetic-intake-password!';
async function readSaved(page) {
  return page.evaluate(async ({ key, password }) => {
    const { unseal } = await import('/src/vault.mjs');
    return JSON.parse((await unseal(localStorage.getItem(key), password)).json);
  }, { key, password });
}

test('CV first journey needs only review; later uploads preserve edits and target choice', async ({ page }) => {
  const requests = []; page.on('request', request => requests.push(request));
  await page.goto('/'); await page.locator('#diagnosis-start').click(); await page.locator('[data-goal="clarity"]').click();
  await expect(page.locator('#cv-file')).toBeVisible();
  await expect(page.locator('#cv-text')).toBeHidden();
  await upload(page);
  await expect(page.locator('#cv-status')).toHaveAttribute('data-upload-state', 'success');
  await expect(page.locator('#currentRole')).toHaveValue('Release Manager');
  await expect(page.locator('#skills')).toHaveValue(/ITIL/);
  await expect(page.locator('#evidence')).toHaveValue(/Created rollback plans/);
  await expect(page.locator('#targetRole')).toHaveValue('');
  await expect(page.locator('#profile-confirmed')).not.toBeChecked();
  await page.locator('#profile-form button[type="submit"]').click();
  await expect(page.locator('#step-1')).toBeVisible();
  await page.locator('#profile-confirmed').check(); await page.locator('#profile-form button[type="submit"]').click();
  await expect(page.locator('#step-8')).toBeVisible();
  await expect(page.locator('#vacancy-target')).toHaveValue('Release Manager');
  await tool(page, 1);
  await page.locator('#currentRole').fill('My reviewed title');
  await page.locator('#targetRole').fill('My chosen next role');
  await page.locator('#skills').fill('My demonstrable skill');
  await page.locator('#evidence').fill('My own carefully edited example of work.');
  await upload(page); await expect(page.locator('#cv-status')).toContainText('Read synthetic.txt');
  await expect(page.locator('#currentRole')).toHaveValue('My reviewed title');
  await expect(page.locator('#targetRole')).toHaveValue('My chosen next role');
  await expect(page.locator('#skills')).toHaveValue('My demonstrable skill');
  await expect(page.locator('#evidence')).toHaveValue('My own carefully edited example of work.');
  expect(requests.every(r => r.url().startsWith('http://127.0.0.1:8771/') && r.method() === 'GET' && !r.postData())).toBeTruthy();
});

test('unreviewed CV drafts stay out of active autosave and encrypted backups, then save after review', async ({ page }) => {
  await page.goto('/'); await page.locator('#open-workspace').click();
  await page.locator('#password').fill(password); await page.locator('#password-confirm').fill(password);
  await page.locator('#workspace-consent').check(); await page.locator('#create-workspace').click();
  await page.locator('[data-goal="clarity"]').click(); await upload(page);
  await expect(page.locator('#evidence')).toHaveValue(/Coordinated production releases/);
  // Trigger and await a different autosaved field while the CV import is still unreviewed.
  await page.locator('#targetRole').fill('Technical delivery manager');
  await expect.poll(async () => (await readSaved(page)).profile.targetRole).toBe('Technical delivery manager');
  const saved = await readSaved(page);
  expect(saved.profile.currentRole).toBe(''); expect(saved.profile.skills).toBe(''); expect(saved.profile.evidence).toBe('');
  const downloading = page.waitForEvent('download'); await privacyControl(page, 'export-profile');
  const download = await downloading; const stream = await download.createReadStream(); const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backup = await page.evaluate(async ({ raw, password }) => {
    const { unseal } = await import('/src/vault.mjs'); return (await unseal(raw, password)).json;
  }, { raw: Buffer.concat(chunks).toString(), password });
  expect(backup).not.toContain('Coordinated production releases'); expect(backup).not.toContain('Release Manager');
  await page.locator('#evidence').fill('Reviewed: coordinated production releases across four teams.');
  await page.locator('#profile-confirmed').check();
  await expect.poll(async () => (await readSaved(page)).profile.currentRole).toBe('Release Manager');
  const reviewed = JSON.stringify(await readSaved(page));
  expect(reviewed).toContain('Reviewed: coordinated');
  for (const marker of ['PRIVATE_RAW_MARKER', 'private@example.test', 'PRIVATE_EDUCATION_MARKER', 'Example Employer', 'Improved readiness checks']) expect(reviewed).not.toContain(marker);
});

test('manual fallback and pasted CV both work on a narrow screen without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: '/tmp/rolebridge-home-mobile.png', fullPage: true });
  await page.locator('#diagnosis-start').click(); await page.locator('[data-goal="interviews"]').click();
  await page.locator('#manual-profile').click();
  await expect(page.locator('#currentRole')).toBeFocused(); await expect(page.locator('#cv-file')).toBeHidden();
  await expand(page, '#cv-reader'); await page.locator('#cv-text').fill(cv); await page.locator('#fill-from-cv').click();
  await expect(page.locator('#currentRole')).toHaveValue('Release Manager');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator('#cv-tools > summary').click();
  await page.screenshot({ path: '/tmp/rolebridge-profile-mobile.png', fullPage: true });
});
