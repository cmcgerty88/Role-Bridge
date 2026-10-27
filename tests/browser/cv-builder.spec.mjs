import { test, expect } from '@playwright/test';

test('CV builder collects a full vacancy and reviewed career details, then downloads four editable/shareable files', async ({ page }) => {
  const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/'); await page.locator('[data-sidebar-step="6"]').click();
  await expect(page.locator('#step-6')).toBeVisible();
  await page.locator('#pack-new-title').fill('Release Manager');
  await page.locator('#pack-new-company').fill('Example Technology');
  await page.locator('#pack-new-description').fill('Coordinate the release calendar, assess readiness with delivery teams, manage change risks and communicate deployment plans to service owners. The role needs release governance, stakeholder communication and accurate reporting.');
  await page.locator('#pack-new-job button[type="submit"]').click();
  await expect(page.locator('#pack-job')).toHaveValue(/.+/);
  await page.locator('#pack-create').click(); await expect(page.locator('#pack-editor')).toBeVisible();
  await page.locator('#cv-fullName').fill('Casey Example'); await page.locator('#cv-email').fill('casey@example.test');
  await page.locator('#cv-history').fill('Release Coordinator, Example Ltd, 2022–2025\nCoordinated monthly release calendar and risk reviews with delivery teams.');
  await page.locator('#draft-summary').fill('Release coordinator with experience in calendar planning and change risk reviews.');
  await page.locator('#draft-highlights').fill('Coordinated monthly release calendar and risk reviews.');
  await page.locator('#cv-reviewed').check();
  for (const ext of ['docx', 'pdf']) {
    const download = page.waitForEvent('download'); await page.locator(`#download-cv-${ext}`).click();
    expect((await download).suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`));
  }
  await page.locator('#cv-company-notes').fill('Example Technology publishes software for business customers.');
  await page.locator('#letter-interest').fill('The work brings together release coordination and clear communication, which I enjoy.');
  await page.locator('#letter-evidence').fill('I coordinated monthly release calendar reviews with delivery teams.\nI supported risk reviews and shared updates with service owners.');
  await page.locator('#letter-create').click();
  await expect(page.locator('#letter-draft')).toHaveValue(/I coordinated monthly release calendar reviews/);
  await page.locator('#letter-reviewed').check();
  for (const ext of ['docx', 'pdf']) {
    const download = page.waitForEvent('download'); await page.locator(`#download-letter-${ext}`).click();
    expect((await download).suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`));
  }
  expect(pageErrors).toEqual([]);
});

test('uploaded master CV is previewed locally and only chosen details enter the CV draft', async ({ page }) => {
  await page.goto('/'); await page.locator('[data-sidebar-step="6"]').click();
  await page.locator('#pack-new-title').fill('Release Manager');
  await page.locator('#pack-new-company').fill('Example Technology');
  await page.locator('#pack-new-description').fill('Coordinate the release calendar, assess readiness with delivery teams, manage change risks and communicate deployment plans to service owners. The role needs release governance, stakeholder communication and accurate reporting.');
  await page.locator('#pack-new-job button[type="submit"]').click(); await page.locator('#pack-create').click();
  await page.locator('#application-cv-file').setInputFiles({ name: 'master.txt', mimeType: 'text/plain', buffer: Buffer.from('Alex Example\nalex@example.test\nProfessional summary\nRelease manager coordinating production changes.\nWork experience\nRelease Manager | Example employer | Jan 2023 - Present\nCoordinated releases across four teams.\nReferences\nREFEREE_SECRET') });
  await expect(page.locator('#application-cv-review')).toBeVisible();
  await expect(page.locator('#application-cv-fields')).not.toContainText('REFEREE_SECRET');
  await expect(page.locator('#cv-fullName')).toHaveValue('');
  await page.locator('[data-import-field="fullName"]').check();
  await page.locator('#application-cv-confirmed').check(); await page.locator('#application-cv-apply').click();
  await expect(page.locator('#cv-fullName')).toHaveValue('Alex Example');
  await expect(page.locator('#cv-history')).toHaveValue(/Coordinated releases across four teams/);
  await expect(page.locator('#application-cv-review')).toBeHidden();
});
