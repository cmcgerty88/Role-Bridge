import { test, expect } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
import { readFile, writeFile } from 'node:fs/promises';
const compact = text => text.replace(/\s/g, '');
async function download(page, id) { const event = page.waitForEvent('download'); await page.locator('#' + id).click(); return readFile(await (await event).path()); }
async function prepare(page) {
  await page.goto('/'); await page.locator('#interview-shortcut').click();
  await page.locator('#prep-role').fill('Release Manager'); await page.locator('#prep-skills').fill('Release management, Jira');
  await page.locator('#prep-evidence').fill('Coordinated production releases across four teams.\nImproved release readiness checks using Jira.');
  await page.locator('#prep-job-title').fill('Release Manager'); await page.locator('#prep-employer').fill('Example employer');
  await page.locator('#prep-description').fill('Coordinate production releases using Jira. Review release readiness and rollback plans.');
  await page.locator('#prep-find-focus').click(); await page.locator('#prep-context-status').selectOption('provided');
  await page.locator('#prep-company').fill('Screening call: the team wants clearer release ownership.');
  await page.locator('#prep-process').fill('A 45-minute panel with the delivery lead.');
  await page.locator('#prep-company-url').fill('https://example.com/about');
  await page.locator('#prep-company-research').fill('Creates scheduling tools for clinics. The website describes reliable service as a priority.');
  await page.locator('#prep-reviewed').check(); await page.locator('#prep-create').click();
  await expect(page.locator('#prep-result')).toBeVisible();
}
test('PDF and Word contain the same plan, samples, evidence, context and user notes; cheat sheets are two readable pages', async ({ page }) => {
  await prepare(page); await page.locator('#prep-notes').click();
  await page.locator('#prep-questions details').first().locator('summary').click(); await page.locator('#prep-answer-introduction').fill('My personal rehearsal note, kept separate from the sample.');
  await expect(page.locator('#prep-preview')).toContainText('My personal rehearsal note');
  const full = await download(page, 'prep-download-full'), word = await download(page, 'prep-download-word'), cheats = await download(page, 'prep-download-cheat'), text = await download(page, 'prep-download-text');
  const xml = strFromU8(unzipSync(word)['word/document.xml']);
  const wordText = await page.evaluate(xml => [...new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('w:t')].map(n => n.textContent).join('\n'), xml);
  expect(compact(wordText)).toBe(compact(text.toString()));
  const pdfs = await page.evaluate(async ({ full, cheats }) => {
    const pdfjs = await import('/vendor/pdfjs/pdf.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
    const out = [];
    for (const data of [full, cheats]) {
      const task = pdfjs.getDocument({ data: Uint8Array.from(data), isEvalSupported: false }); const pdf = await task.promise; const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i), content = await page.getTextContent();
        const body = content.items.filter(n => n.str && n.transform[5] !== 30);
        pages.push({ text: body.map(n => n.str).join(' '), bounded: body.every(n => n.transform[4] >= 49 && n.transform[5] >= 49 && n.transform[4] + n.width <= 547 && n.transform[5] <= 793), readable: body.every(n => n.height >= 9.4) });
      }
      out.push(pages); await task.destroy();
    }
    return out;
  }, { full: [...full], cheats: [...cheats] });
  expect(compact(pdfs[0].map(p => p.text).join(' '))).toBe(compact(wordText));
  expect(pdfs[0].every(p => p.bounded)).toBeTruthy(); expect(pdfs[1]).toHaveLength(2); expect(pdfs[1].every(p => p.bounded && p.readable)).toBeTruthy();
  expect(pdfs[1][0].text).toContain('Pre-interview checklist'); expect(pdfs[1][1].text).toContain('Interview-day cheat sheet');
  for (const phrase of ['https://example.com/about', 'Creates scheduling tools for clinics.', 'Know the company', 'What do you know about Example employer', 'has not visited this website']) expect(wordText).toContain(phrase);
  expect(pdfs[1][0].text).toContain('example.com');
  expect(pdfs[1][1].text).toContain('example.com');
  expect(wordText).toContain('go/no-go'); expect(wordText).toContain('Fictional worked example'); expect(wordText).toContain('My personal rehearsal note');
  await writeFile('/tmp/rolebridge-interview-full.pdf', full); await writeFile('/tmp/rolebridge-interview-cheats.pdf', cheats);
});
test('optional CV builder stays out of interview prep; users can reopen and delete an interview pack without losing its job', async ({ page }) => {
  await prepare(page); await expect(page.locator('#step-6')).toBeHidden(); await expect(page.locator('#prep-result')).toBeVisible();
  await page.locator('#plan-home').click(); await page.locator('#application-list').getByRole('button', { name: 'Prepare for interview', exact: true }).click();
  await expect(page.locator('#prep-result')).toBeVisible(); await expect(page.locator('#prep-form')).toBeHidden();
  await page.getByText('Manage this saved preparation', { exact: true }).click(); page.once('dialog', d => d.accept()); await page.locator('#prep-delete').click();
  await expect(page.locator('#prep-form')).toBeVisible(); await expect(page.locator('#prep-result')).toBeHidden();
  await expect(page.locator('#prep-evidence')).toHaveValue(''); await expect(page.locator('#prep-company')).toHaveValue('');
  await expect(page.locator('#prep-company-url')).toHaveValue(''); await expect(page.locator('#prep-company-research')).toHaveValue('');
  await page.locator('#plan-home').click(); await expect(page.locator('#application-list > article')).toHaveCount(1);
});
