export async function expand(page, selector) {
  const details = page.locator(selector);
  if (!(await details.evaluate(el => el.open))) await details.locator(':scope > summary').click();
  if (selector === '#cv-reader') await expand(page, '#cv-tools');
}
export async function tool(page, step) {
  if (step === 4) {
    await tool(page, 8); await page.locator('#vacancies-continue').click();
  } else if ([1, 5, 8].includes(step)) {
    await page.locator(`.journey-nav [data-step="${step}"]`).click();
  } else {
    await expand(page, '#tool-menu');
    await page.locator(`.steps [data-step="${step}"]`).click();
  }
}
export async function chooseSituation(page) {
  if (await page.locator('#step-0').isVisible()) await page.locator('[data-goal="clarity"]').click();
}
export async function profileEditor(page) {
  if (!(await page.locator('#step-1').isVisible())) await tool(page, 1);
  await expand(page, '#profile-extras');
}
export async function confirmProfile(page) {
  await profileEditor(page);
  await page.locator('#profile-confirmed').check();
}
export async function privacyControl(page, id) {
  await expand(page, '#workspace-controls'); await page.locator(`#${id}`).click();
}
export async function tracker(page) {
  const details = page.locator('#application-list details').first();
  if (!(await details.evaluate(el => el.open))) await details.locator('summary').click();
}
