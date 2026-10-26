import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { tool } from './helpers.mjs';
const cv = `PRIVATE_RAW_CV_MARKER private-contact@example.test
Work Experience
Release Manager | Private Previous Employer | Jan 2023 - Present
Coordinated production releases across four teams using Jira.
Improved readiness checks before each production release.
Created rollback plans for critical services.
Skills
Release management, Jira, ITIL.
Education
PRIVATE_EDUCATION_MARKER`;
const description = 'Coordinate production releases using Jira.\nManage release readiness and rollback plans.\nMust have SQL database administration experience.';
const password = 'Synthetic-interview-password!';
async function begin(page, encrypted = false) {
  await page.goto('/');
  if (encrypted) {
    await page.locator('#open-workspace').click(); await page.locator('#password').fill(password); await page.locator('#password-confirm').fill(password);
    await page.locator('#workspace-consent').check(); await page.locator('#create-workspace').click();
  } else await page.locator('#diagnosis-start').click();
  await page.locator('[data-goal="offers"]').click(); await tool(page, 10);
}
async function source(page) {
  await page.locator('#prep-cv-file').setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from(cv) });
  await expect(page.locator('#prep-role')).toHaveValue('Release Manager');
  await page.locator('#prep-job-title').fill('Release Manager'); await page.locator('#prep-employer').fill('Synthetic Target Employer');
  await page.locator('#prep-description').fill(description); await page.locator('#prep-find-focus').click();
}
async function create(page) { if (!(await page.locator('#prep-context-status').inputValue())) await page.locator('#prep-context-status').selectOption('none'); await page.locator('#prep-reviewed').check(); await page.locator('#prep-create').click(); await expect(page.locator('#prep-result')).toBeVisible(); }
async function download(page, id) {
  const receiving = page.waitForEvent('download'); await page.locator('#' + id).click(); const file = await receiving;
  return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) };
}
async function pdfInfo(page, bytes, screenshot = false) {
  return page.evaluate(async ({ data, screenshot }) => {
    const pdfjs = await import('/vendor/pdfjs/pdf.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
    const task = pdfjs.getDocument({ data: Uint8Array.from(data), isEvalSupported: false });
    try {
      const pdf = await task.promise, pages = []; let png;
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n), content = await page.getTextContent(), viewport = page.getViewport({ scale: 1 });
        const footer = content.items.filter(i => i.transform[5] === 30).map(i => i.str).join('').replace(/\s+/g, ' ').trim();
        if (!/^RoleBridge \| \d+ \/ \d+$/.test(footer)) throw new Error('Invalid page footer: ' + footer);
        pages.push({ text: content.items.map(i => i.str).join(' '), width: viewport.width, height: viewport.height,
          bounded: content.items.every(i => !i.str || i.transform[5] === 30 || i.transform[4] >= 49 && i.transform[5] >= 49 && i.transform[4] + i.width <= 547 && i.transform[5] <= 793),
          readable: content.items.every(i => !i.str || i.transform[5] === 30 || i.height >= 9.4) });
        if (screenshot && n === 1) { const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; png = canvas.toDataURL(); }
      }
      return { pages, png };
    } finally { await task.destroy(); }
  }, { data: [...bytes], screenshot });
}
async function saved(page) {
  return page.evaluate(async password => { const { unseal } = await import('/src/vault.mjs'); return JSON.parse((await unseal(localStorage.getItem('rolebridge.encrypted-workspace.v1'), password)).json); }, password);
}

test('uploaded CV and pasted advert produce a tailored printable pack and two-page cheat sheets locally', async ({ page }) => {
  const requests = [], errors = []; page.on('request', r => requests.push(r)); page.on('pageerror', e => errors.push(e.message));
  await begin(page); await page.locator('#prep-create').click(); await expect(page.locator('#prep-result')).toBeHidden();
  await source(page); await page.locator('#prep-create').click(); await expect(page.locator('#prep-reviewed')).not.toBeChecked(); await expect(page.locator('#prep-result')).toBeHidden();
  await create(page);
  const full = await download(page, 'prep-download-full'), sheet = await download(page, 'prep-download-cheat');
  expect(full.name).toBe('rolebridge-interview-release-manager.pdf'); expect(sheet.name).toBe('rolebridge-interview-cheat-sheet-release-manager.pdf');
  const fullPdf = await pdfInfo(page, full.bytes), shortPdf = await pdfInfo(page, sheet.bytes, true);
  const text = fullPdf.pages.map(p => p.text).join(' ');
  for (const phrase of ['Release Manager', 'Synthetic Target Employer', 'Coordinated production releases', 'No clear wording connection', 'whether a release is ready', 'Situation / Task:', 'Final checks']) expect(text).toContain(phrase);
  for (const phrase of ['PRIVATE_RAW_CV_MARKER', 'private-contact@example.test', 'Private Previous Employer', 'PRIVATE_EDUCATION_MARKER']) expect(text).not.toContain(phrase);
  expect(fullPdf.pages.every(p => p.bounded)).toBeTruthy(); expect(shortPdf.pages).toHaveLength(2); expect(shortPdf.pages[0].bounded).toBeTruthy(); expect(shortPdf.pages[0].readable).toBeTruthy();
  expect(shortPdf.pages[1].text).toContain('first 90-day priorities');
  await writeFile('/tmp/interview-cheat-sheet.png', Buffer.from(shortPdf.png.split(',')[1], 'base64'));
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await tool(page, 1); await expect(page.locator('#currentRole')).toHaveValue('');
  expect(requests.every(r => r.url().startsWith('http://127.0.0.1:8771/') && r.method() === 'GET' && !r.postData())).toBeTruthy(); expect(errors).toEqual([]);
});

test('reviewed interview inputs alone persist; saved sources restore and practice notes are protected', async ({ page }) => {
  await begin(page, true); await source(page);
  const before = JSON.stringify(await saved(page)); expect(before).not.toContain('Coordinated production'); expect(before).not.toContain('Synthetic Target Employer');
  await create(page);
  await expect.poll(async () => (await saved(page)).packs.length).toBe(1);
  const state = await saved(page); expect(state.profile.currentRole).toBe(''); expect(state.packs[0].prep.role).toBe('Release Manager');
  for (const marker of ['PRIVATE_RAW_CV_MARKER', 'private-contact@example.test', 'PRIVATE_EDUCATION_MARKER']) expect(JSON.stringify(state)).not.toContain(marker);
  await page.locator('#prep-notes').click(); await expect(page.locator('#prep-practice')).toBeVisible();
  await page.locator('#prep-questions details').first().locator('summary').click(); await page.locator('#prep-answer-introduction').fill('My interview notes to keep.');
  await expect(page.locator('#save-status')).toContainText('Saved encrypted');
  await page.reload(); await page.locator('#password').fill(password); await page.locator('#create-workspace').click(); await tool(page, 10);
  await expect(page.locator('#prep-role')).toHaveValue('Release Manager'); await expect(page.locator('#prep-description')).toHaveValue(description);
  await expect(page.locator('#prep-description')).toBeEditable();
  await page.locator('#prep-evidence').fill('Reviewed new example: coordinated production releases using Jira.'); await create(page);
  const after = await saved(page); // Poll below also waits for the new snapshot to save.
  expect(after.packs[0].summary).toBe('');
  await expect.poll(async () => (await saved(page)).packs[0].prep.evidence).toContain('Reviewed new example');
  expect((await saved(page)).packs[0].answers[0].answer).toBe('My interview notes to keep.');
  await page.locator('#prep-edit').click(); await page.locator('#prep-focus').fill('Manage project dependencies and risks.'); await page.locator('#prep-reviewed').check();
  page.once('dialog', d => d.dismiss()); await page.locator('#prep-create').click(); await expect(page.locator('#prep-result')).toBeHidden();
  expect((await saved(page)).packs[0].answers).toHaveLength(1);
  page.once('dialog', d => d.accept()); await page.locator('#prep-create').click(); await expect(page.locator('#prep-result')).toBeVisible();
  await expect.poll(async () => (await saved(page)).packs[0].answers.length).toBe(0);
  expect((await saved(page)).jobs).toHaveLength(1);
  await page.locator('#prep-notes').click(); const sheet = await download(page, 'prep-download-cheat'); expect((await pdfInfo(page, sheet.bytes)).pages).toHaveLength(2);
});

test('each cheat sheet handles maximum-width content without shrinking text or losing final reminders', async ({ page }) => {
  await page.goto('/');
  const bytes = await page.evaluate(async () => {
    const { preInterviewSheetBlocks, interviewDaySheetBlocks } = await import('/src/interview-prep-content.mjs'); const { makeCheatSheetsPdf } = await import('/src/document-export.mjs');
    const { cleanPack } = await import('/src/application-data.mjs');
    const pack = cleanPack({ prep: { role: 'W'.repeat(160), skills: 'W'.repeat(2000), evidence: Array(3).fill('W'.repeat(1300)).join('\n') }, companyResearch: { url: 'https://example.com/' + 'W'.repeat(900), notes: 'W'.repeat(4000) }, focus: Array(3).fill('W'.repeat(280)).join('\n'), roleId: 'release-manager', interviewContext: { status: 'provided', company: 'W'.repeat(2000), process: 'W'.repeat(2000) }, answers: [{ id: 'introduction', answer: 'W'.repeat(1000) }] });
    const job = { title: 'W'.repeat(180), employer: 'W'.repeat(180) }; return [...await makeCheatSheetsPdf([preInterviewSheetBlocks(job, pack), interviewDaySheetBlocks(job, pack)])];
  });
  const { pages } = await pdfInfo(page, Buffer.from(bytes)); expect(pages).toHaveLength(2); expect(pages[0].bounded).toBeTruthy(); expect(pages[0].readable).toBeTruthy();
  expect(pages[0].width).toBeCloseTo(595.28, 1); expect(pages[0].height).toBeCloseTo(841.89, 1);
  expect(pages[0].text).toContain('…'); expect(pages[1].text).toContain('Excerpts may be shortened'); expect(pages[1].text).toContain('first 90-day priorities');
});

test('mobile manual fallback handles unsupported CVs and input edits require review again', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 }); await begin(page);
  await page.locator('#prep-cv-file').setInputFiles({ name: 'old.doc', mimeType: 'application/msword', buffer: Buffer.from('unsupported') });
  await expect(page.locator('#prep-upload-status')).toContainText('DOCX');
  await page.locator('#prep-role').fill('Project manager'); await page.locator('#prep-evidence').fill('Delivered a project with several teams and reviewed risks weekly.');
  await page.locator('#prep-job-title').fill('Project manager'); await page.locator('#prep-description').fill('Manage project dependencies and risks.'); await page.locator('#prep-find-focus').click();
  await page.locator('#prep-reviewed').check(); await page.locator('#prep-role').fill('Senior project manager'); await expect(page.locator('#prep-reviewed')).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: '/tmp/interview-prep-mobile.png', fullPage: true });
  await create(page); const file = await download(page, 'prep-download-cheat'); expect((await pdfInfo(page, file.bytes)).pages).toHaveLength(2);
});

test('third input is required, reviewed context reaches both PDFs and is isolated per vacancy', async ({ page }) => {
  await begin(page, true); await source(page);
  await page.locator('#prep-reviewed').check(); await page.locator('#prep-create').click(); await expect(page.locator('#prep-result')).toBeHidden();
  await expect(page.locator('#prep-context-status')).toBeFocused();
  await page.locator('#prep-context-status').selectOption('provided'); await page.locator('#prep-reviewed').check(); await page.locator('#prep-create').click();
  await expect(page.locator('#prep-error')).toContainText('Add company or interview-process notes');
  const company = 'The team is improving release reliability.';
  const process = 'Screening call: 45-minute technical panel; prepare a short presentation.';
  await page.locator('#prep-company').fill(company); await page.locator('#prep-process').fill(process);
  await expect(page.locator('#prep-reviewed')).not.toBeChecked();
  expect(JSON.stringify(await saved(page))).not.toContain('release reliability');
  await create(page); await expect.poll(async () => (await saved(page)).packs[0]?.interviewContext.process).toBe(process);
  const full = await download(page, 'prep-download-full'), cheat = await download(page, 'prep-download-cheat');
  const fullText = (await pdfInfo(page, full.bytes)).pages.map(p => p.text).join(' '), sheet = await pdfInfo(page, cheat.bytes);
  for (const text of [fullText, sheet.pages[0].text]) { expect(text).toContain('release reliability'); expect(text).toContain('45-minute technical panel'); }
  expect(fullText).toContain('How will you prepare for the interview process'); expect(sheet.pages).toHaveLength(2); expect(sheet.pages[0].bounded).toBeTruthy();
  await page.locator('#prep-notes').click();
  await page.locator('#prep-answer-context-company').locator('..').locator('summary').click();
  await page.locator('#prep-answer-context-company').fill('Company-specific practice answer to remove only with confirmation.');
  await page.locator('#prep-answer-introduction').locator('..').locator('summary').click(); await page.locator('#prep-answer-introduction').fill('Introduction notes to keep.');
  await expect.poll(async () => (await saved(page)).packs[0].answers.length).toBe(2);
  await page.reload(); await page.locator('#password').fill(password); await page.locator('#create-workspace').click(); await tool(page, 10);
  await expect(page.locator('#prep-company')).toHaveValue(company); await expect(page.locator('#prep-process')).toHaveValue(process);
  await page.locator('#prep-company').fill('An unreviewed change'); expect((await saved(page)).packs[0].interviewContext.company).toBe(company);
  await page.locator('#prep-job').selectOption(''); await expect(page.locator('#prep-context-status')).toHaveValue(''); await expect(page.locator('#prep-company')).toHaveValue('');
  const originalId = (await saved(page)).jobs[0].id;
  await page.locator('#prep-job').selectOption(originalId); await expect(page.locator('#prep-company')).toHaveValue(company);
  await page.locator('#prep-context-status').selectOption('none'); await page.locator('#prep-reviewed').check();
  page.once('dialog', dialog => dialog.dismiss()); await page.locator('#prep-create').click();
  await expect(page.locator('#prep-result')).toBeHidden(); expect((await saved(page)).packs[0].interviewContext.status).toBe('provided');
  page.once('dialog', dialog => dialog.accept()); await create(page);
  await expect.poll(async () => (await saved(page)).packs[0].interviewContext.status).toBe('none');
  expect((await saved(page)).packs[0].interviewContext.company).toBe('');
  expect((await saved(page)).packs[0].answers).toEqual([{ id: 'introduction', answer: 'Introduction notes to keep.' }]);
  const none = await download(page, 'prep-download-text'); expect(none.bytes.toString()).toContain('no extra information yet'); expect(none.bytes.toString()).not.toContain(company);
});

test('company website research requires review, survives encrypted restore and stays with its vacancy without any fetch', async ({ page }) => {
  const requests = []; page.on('request', r => requests.push(r));
  await begin(page, true); await source(page);
  await page.locator('#prep-context-status').selectOption('none');
  for (const url of ['javascript:alert(1)', 'https://example.com/?token=private', 'https://user:password@example.com']) {
    await page.locator('#prep-company-url').fill(url); await page.locator('#prep-reviewed').check(); await page.locator('#prep-create').click();
    await expect(page.locator('#prep-result')).toBeHidden(); await expect(page.locator('#prep-company-link')).toBeHidden();
    await expect(page.locator('#prep-company-url')).toBeFocused();
  }
  const url = 'https://example.com/about', notes = 'Builds appointment tools for clinics. Public priority: reliable services.';
  await page.locator('#prep-company-url').fill(url);
  await expect(page.locator('#prep-company-link')).toHaveAttribute('href', url);
  await expect(page.locator('#prep-company-link')).toHaveAttribute('rel', 'noopener noreferrer');
  await page.locator('#prep-reviewed').check(); await page.locator('#prep-company-research').fill(notes);
  await expect(page.locator('#prep-reviewed')).not.toBeChecked();
  expect(JSON.stringify(await saved(page))).not.toContain(notes); expect(JSON.stringify(await saved(page))).not.toContain(url);
  await create(page);
  await expect.poll(async () => (await saved(page)).packs[0]?.companyResearch).toEqual({ url, notes });
  const text = (await download(page, 'prep-download-text')).bytes.toString();
  expect(text).toContain(url); expect(text).toContain(notes);
  await page.locator('#prep-notes').click();
  await page.locator('#prep-answer-company-knowledge').locator('..').locator('summary').click();
  await page.locator('#prep-answer-company-knowledge').fill('My company research practice answer.');
  await page.locator('#prep-answer-introduction').locator('..').locator('summary').click();
  await page.locator('#prep-answer-introduction').fill('Introduction note to preserve.');
  await expect.poll(async () => (await saved(page)).packs[0].answers.length).toBe(2);
  await page.reload(); await page.locator('#password').fill(password); await page.locator('#create-workspace').click(); await tool(page, 10);
  await expect(page.locator('#prep-company-url')).toHaveValue(url); await expect(page.locator('#prep-company-research')).toHaveValue(notes);
  const originalId = (await saved(page)).jobs[0].id;
  await page.locator('#prep-job').selectOption('');
  await expect(page.locator('#prep-company-url')).toHaveValue(''); await expect(page.locator('#prep-company-research')).toHaveValue('');
  await expect(page.locator('#prep-company-link')).toBeHidden();
  await page.locator('#prep-job').selectOption(originalId);
  await expect(page.locator('#prep-company-research')).toHaveValue(notes);
  await page.locator('#prep-company-url').fill(''); await page.locator('#prep-company-research').fill('');
  await page.locator('#prep-reviewed').check(); page.once('dialog', d => d.dismiss()); await page.locator('#prep-create').click();
  expect((await saved(page)).packs[0].companyResearch.notes).toBe(notes);
  page.once('dialog', d => d.accept()); await create(page);
  await expect.poll(async () => (await saved(page)).packs[0].companyResearch.notes).toBe('');
  expect((await saved(page)).packs[0].answers).toEqual([{ id: 'introduction', answer: 'Introduction note to preserve.' }]);
  expect(requests.every(r => r.url().startsWith('http://127.0.0.1:8771/') && r.method() === 'GET' && !r.postData())).toBeTruthy();
});
