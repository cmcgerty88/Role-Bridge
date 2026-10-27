import { initApplicationCvImport } from './cv-application-ui.mjs';
import { cleanCv, cleanPack } from './application-data.mjs';
import { createPack, sourceKey, cvIssues, cvBlocks, interviewBlocks, keywordReview, plainText } from './application-content.mjs';
import { interviewQuestions } from './interviews.mjs';
import { cheatSheetBlocks } from './interview-prep-content.mjs';
import { cleanInterviewContext } from './interview-context.mjs';
import { ROLE_CATALOGUE } from './roles.mjs';
import { assessJob } from './matching.mjs';
import { makePdf, makeDocx, downloadDocument } from './document-export.mjs';
import { cleanJob } from './model.mjs';
import { cleanCompanyResearch } from './company-research.mjs';
import { letterDraft, letterBlocks, letterWordCount } from './cover-letter.mjs';
import { readCv } from './cv.mjs';
const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
export function initApplicationPack({ getState, changed, announce, prepareInterview, trackJob, editJob, getCvSource }) {
  let selectedId = '', generation = 0;
  const baseForm = $('cv-base-form'), draftForm = $('cv-draft-form');
  baseForm.reset(); draftForm.reset(); $('cv-reviewed').checked = false; $('interview-focus').value = '';
  const getJob = () => getState().jobs.find(j => j.id === selectedId);
  const getPack = () => getState().packs.find(p => p.jobId === selectedId);
  const cvImport = initApplicationCvImport({ getState, getPack, getSource: getCvSource,
    apply: values => {
      const state = getState(), pack = getPack(); if (!pack) return;
      state.cv = cleanCv({ ...state.cv, ...values.cv });
      Object.assign(pack, cleanPack({ ...pack, ...values.pack }));
      for (const [field, value] of Object.entries(values.cv)) baseForm.elements.namedItem(field).value = value;
      for (const [field, value] of Object.entries(values.pack)) draftForm.elements.namedItem(field).value = value;
      invalidateReview(); changed(); renderPreview();
    }
  });
  $('pack-track').addEventListener('click', () => trackJob(selectedId));
  $('interview-context-open').addEventListener('click', () => prepareInterview(selectedId));
  const option = (value, label) => { const el = node('option', label); el.value = value; return el; };
  $('interview-role').append(option('', 'General / another role'), ...ROLE_CATALOGUE.map(r => option(r.id, r.title)));
  function invalidateReview() { $('cv-reviewed').checked = false; $('cv-export-status').textContent = ''; }
  function renderChoices() {
    const pack = getPack(); if (!pack) return;
    const map = { 'cv-application-route': pack.cvPreferences.route, 'cv-keep': pack.cvPreferences.keep, 'cv-remove': pack.cvPreferences.remove, 'cv-new': pack.cvPreferences.newInfo,
      'cv-company-url': pack.companyResearch.url, 'cv-company-notes': pack.companyResearch.notes,
      'letter-interest': pack.letter.interest, 'letter-evidence': pack.letter.evidence, 'letter-manager': pack.letter.manager, 'letter-draft': pack.letter.draft };
    for (const [id, value] of Object.entries(map)) $(id).value = value || '';
    $('cv-company-status').textContent = '';
    $('letter-reviewed').checked = false; $('letter-export-status').textContent = '';
    $('letter-word-count').textContent = `Letter length: ${letterWordCount(pack.letter.draft)} words. Aim for about 300–450 after editing.`;
  }
  function renderPreview() {
    const state = getState(), job = getJob(), pack = getPack(); if (!job || !pack) return;
    const preview = $('cv-preview'); preview.replaceChildren();
    for (const b of cvBlocks(state.cv, pack, job)) preview.append(node(b.style === 'title' ? 'h3' : b.style === 'heading' ? 'h4' : 'p', b.text, b.style === 'subtitle' ? 'cv-subtitle' : ''));
    const issues = cvIssues(state.cv, pack), comparison = assessJob(state.profile, job);
    const checks = [
      issues.length ? 'CV details to complete: ' + issues.join(' ') : 'Core CV sections are present. Review their accuracy before downloading.',
      comparison.failures.length ? 'Resolve this vacancy conflict: ' + comparison.failures[0] : comparison.questions.length ? 'Check the advert: ' + comparison.questions[0] : 'The entered working requirements fit; this does not confirm eligibility.',
      'Check dates and list experience most recent first. Keep only relevant, truthful information.'
    ];
    $('pack-checklist').replaceChildren(...checks.map(s => node('li', s)));
    const review = keywordReview(job, pack);
    $('keyword-review').replaceChildren(node('p', review.included.length ? 'Recognised advert terms in this draft: ' + review.included.join(', ') + '.' : 'No terms from the small skill dictionary are shared yet. This is not a judgement of your suitability.'));
    if (review.check.length) $('keyword-review').append(node('p', 'Check these advert terms: ' + review.check.join(', ') + '. Add them only if accurate and supported by your experience. This limited word check is not an ATS score.'));
  }
  function renderQuestions() {
    const job = getJob(), pack = getPack(); if (!job || !pack) return;
    const list = $('interview-questions'); list.replaceChildren();
    interviewQuestions(job, pack).forEach((q, i) => {
      const section = node('details', undefined, 'interview-question'); section.open = i === 0 || Boolean(pack.answers.find(a => a.id === q.id)?.answer.trim()); section.append(node('summary', `${i + 1}. ${q.question}`), node('p', q.guidance, 'small muted'));
      const id = `answer-${q.id}`, label = node('label', 'Your practice notes (optional)'); label.htmlFor = id;
      const input = node('textarea'); input.id = id; input.rows = 4; input.maxLength = 1000; input.spellcheck = false; input.autocomplete = 'off';
      input.placeholder = 'Situation / task → what I did → result I can support → what I learned. Avoid confidential or sensitive details.';
      input.value = pack.answers.find(a => a.id === q.id)?.answer || '';
      input.addEventListener('input', () => {
        pack.answers = pack.answers.filter(a => a.id !== q.id);
        if (input.value.trim()) pack.answers.push({ id: q.id, answer: input.value });
        $('interview-export-status').textContent = ''; changed(); renderPreview();
      });
      section.append(label, input); list.append(section);
    });
  }
  async function render(jobId) {
    cvImport.clear();
    const state = getState(), token = ++generation;
    if (!state.jobs.length) $('pack-new-job-panel').open = true;
    selectedId = state.jobs.some(j => j.id === jobId) ? jobId : state.jobs.some(j => j.id === selectedId) ? selectedId : state.jobs[0]?.id || '';
    $('pack-job').replaceChildren(...state.jobs.map(j => option(j.id, `${j.title} — ${j.employer}`)));
    $('pack-job').value = selectedId; $('pack-job').disabled = !state.jobs.length;
    const job = getJob(), pack = getPack();
    const match = $('pack-match'); match.replaceChildren();
    if (job) {
      const result = assessJob(state.profile, job);
      match.append(node('p', 'First · Check this job', 'eyebrow'), node('h3', `${job.title} — ${job.employer}`));
      match.append(node('p', result.skills.length ? 'Experience to emphasise: ' + result.skills.join(', ') + '. Use concrete examples to support these shared skill mentions.' : 'Compare the essential requirements with your work examples below. No shared terms were recognised by the limited skill dictionary.'));
      const checks = [...result.failures, ...result.questions];
      if (checks.length) {
        const detail = node('details'); detail.append(node('summary', `${checks.length} requirements or facts to check`));
        const list = node('ul'); checks.forEach(text => list.append(node('li', text))); detail.append(list); match.append(detail);
      }
      if (result.failures.length) match.append(node('p', result.failures[0], 'notice'));
      if (job.source?.summaryOnly) match.append(node('p', 'This is a short provider summary. Add the full job description before relying on the CV or interview preparation.', 'hint'));
      const edit = node('button', 'Review or update job description', 'text-button'); edit.type = 'button'; edit.addEventListener('click', () => editJob(job)); match.append(edit);
      const interview = node('button', 'Already have an interview for this job?', 'text-button'); interview.type = 'button'; interview.addEventListener('click', () => prepareInterview(job.id)); match.append(interview);
    }
    $('pack-empty').hidden = Boolean(job); $('pack-create').hidden = Boolean(pack); $('pack-create').disabled = !job;
    $('pack-delete').hidden = !pack; $('pack-editor').hidden = !pack; $('pack-stale').hidden = true;
    $('pack-status').textContent = pack ? 'This draft belongs to the selected vacancy. Review and edit it before use.' : job ? 'Start a draft, then import your CV or enter career details manually.' : '';
    if (job?.source?.summaryOnly) $('pack-status').textContent += ' This vacancy was imported from a short Reed summary. Check the full advert and update any missing requirements before relying on this pack.';
    $('cv-export-status').textContent = ''; $('interview-export-status').textContent = ''; invalidateReview();
    if (!pack) { $('cv-preview').replaceChildren(); $('interview-questions').replaceChildren(); baseForm.reset(); draftForm.reset(); return; }
    for (const [key, value] of Object.entries(state.cv)) { const input = baseForm.elements.namedItem(key); if (input) { if (input.type === 'checkbox') input.checked = value; else input.value = value; } }
    for (const key of ['summary', 'skills', 'highlights']) draftForm.elements.namedItem(key).value = pack[key];
    renderChoices();
    $('interview-role').value = pack.roleId; $('interview-focus').value = pack.focus;
    const link = $('pack-vacancy-link'); link.hidden = !job.url; if (job.url) link.href = job.url; else link.removeAttribute('href');
    renderPreview(); renderQuestions();
    const currentKey = await sourceKey(state.profile, job);
    if (token === generation) $('pack-stale').hidden = currentKey === pack.sourceKey;
  }
  $('pack-job').addEventListener('change', () => { render($('pack-job').value).catch(() => announce('Could not open the pack. Please try again.')); });
  $('pack-new-description-file').addEventListener('change', async event => {
    const file = event.target.files?.[0], status = $('pack-new-status'); if (!file) return;
    status.textContent = 'Reading the job description on this device…';
    try {
      const content = await readCv(file);
      if (event.target.files?.[0] !== file) return;
      if (content.length > 20000) { status.textContent = 'This advert is too long. Paste the relevant full description below, up to 20,000 characters.'; return; }
      $('pack-new-description').value = content;
      status.textContent = 'Job description added below. Check that all requirements were captured before saving.';
    } catch (error) { status.textContent = error.message || 'Could not read the file. Paste the description instead.'; }
    finally { event.target.value = ''; }
  });
  $('pack-new-job').addEventListener('submit', async event => {
    event.preventDefault();
    const state = getState(), status = $('pack-new-status'); status.textContent = '';
    if (!event.currentTarget.reportValidity()) return;
    if (state.jobs.length >= 30) { status.textContent = 'Your shortlist holds 30 jobs. Remove an older one before adding this vacancy.'; return; }
    const job = cleanJob({ id: crypto.randomUUID(), title: $('pack-new-title').value, employer: $('pack-new-company').value, description: $('pack-new-description').value });
    if (!job.title || !job.employer || !job.description) { status.textContent = 'Add the role, company and full job description.'; return; }
    state.jobs.push(job); changed(); event.currentTarget.reset();
    await render(job.id); $('pack-new-job-panel').open = false; status.textContent = 'Vacancy saved. Start a CV draft for it below.'; $('pack-create').focus();
  });
  $('pack-create').addEventListener('click', async () => {
    const state = getState(), job = getJob(); if (!job) return;
    if (state.packs.length >= 5) { $('pack-status').textContent = 'Five packs are already saved. Select an older pack and delete it before creating another.'; return; }
    $('pack-create').disabled = true;
    try {
      const pack = await createPack(state.profile, job);
      if (!state.jobs.some(j => j.id === job.id) || state.packs.some(p => p.jobId === job.id)) return;
      state.packs.push(pack);
      if (!state.cv.fullName) state.cv.fullName = state.profile.name;
      changed(); await render(job.id); $('cv-fullName').focus();
    } catch { $('pack-status').textContent = 'The draft could not be created. Please try again in a current browser over HTTPS.'; }
    finally { $('pack-create').disabled = false; }
  });
  $('pack-delete').addEventListener('click', () => {
    if (!getPack() || !confirm('Delete this vacancy’s CV draft and interview notes? Shared career details and downloaded files will remain.')) return;
    getState().packs = getState().packs.filter(p => p.jobId !== selectedId); changed(); render();
  });
  $('pack-refresh').addEventListener('click', async () => {
    const state = getState(), job = getJob(), pack = getPack();
    if (!job || !pack || !confirm('Replace this CV summary, skills and achievements with a fresh draft from your current profile? Your career details and interview notes will stay.')) return;
    $('pack-refresh').disabled = true;
    try { const fresh = await createPack(state.profile, job); Object.assign(pack, { summary: fresh.summary, skills: fresh.skills, highlights: fresh.highlights, sourceKey: fresh.sourceKey }); changed(); await render(job.id); }
    catch { $('cv-export-status').textContent = 'The draft could not be refreshed. Your existing text is still available.'; }
    finally { $('pack-refresh').disabled = false; }
  });
  for (const form of [baseForm, draftForm]) form.addEventListener('submit', event => event.preventDefault());
  baseForm.addEventListener('input', () => {
    getState().cv = cleanCv({ ...Object.fromEntries(new FormData(baseForm)), anonymous: $('cv-anonymous').checked });
    invalidateReview(); changed(); renderPreview();
  });
  draftForm.addEventListener('input', () => {
    const pack = getPack(); if (!pack) return;
    Object.assign(pack, cleanPack({ ...pack, ...Object.fromEntries(new FormData(draftForm)) })); invalidateReview(); changed(); renderPreview();
  });
  for (const id of ['cv-application-route', 'cv-keep', 'cv-remove', 'cv-new', 'cv-company-url', 'cv-company-notes']) $(id).addEventListener('input', () => {
    const pack = getPack(); if (!pack) return;
    pack.cvPreferences = { route: $('cv-application-route').value, keep: $('cv-keep').value, remove: $('cv-remove').value, newInfo: $('cv-new').value };
    pack.companyResearch = cleanCompanyResearch({ url: $('cv-company-url').value, notes: $('cv-company-notes').value });
    $('cv-company-status').textContent = $('cv-company-url').value.trim() && !pack.companyResearch.url ? 'Use the public HTTPS company homepage without a search query or login details.' : '';
    $('letter-reviewed').checked = false; changed();
  });
  for (const id of ['letter-interest', 'letter-evidence', 'letter-manager', 'letter-draft']) $(id).addEventListener('input', () => {
    const pack = getPack(); if (!pack) return;
    pack.letter = cleanPack({ ...pack, letter: { interest: $('letter-interest').value, evidence: $('letter-evidence').value, manager: $('letter-manager').value, draft: $('letter-draft').value } }).letter;
    $('letter-reviewed').checked = false; $('letter-export-status').textContent = '';
    $('letter-word-count').textContent = `Letter length: ${letterWordCount(pack.letter.draft)} words. Aim for about 300–450 after editing.`;
    changed();
  });
  $('letter-create').addEventListener('click', () => {
    const job = getJob(), pack = getPack(); if (!job || !pack) return;
    const draft = letterDraft({ name: getState().cv.fullName || getState().profile.name || '[Your name]', role: job.title, company: job.employer,
      manager: $('letter-manager').value, interest: $('letter-interest').value, evidence: $('letter-evidence').value, companyNotes: $('cv-company-notes').value });
    if (!draft) { $('letter-export-status').textContent = 'Add why this role interests you and at least two real work examples on separate lines.'; return; }
    $('letter-draft').value = draft; $('letter-draft').dispatchEvent(new Event('input', { bubbles: true }));
    $('letter-export-status').textContent = 'Starting letter created. Edit it for your voice, check every claim and confirm before downloading.';
    $('letter-draft').focus();
  });
  for (const format of ['docx', 'pdf']) $(`download-letter-${format}`).addEventListener('click', async () => {
    const job = getJob(), pack = getPack(), status = $('letter-export-status'); if (!job || !pack) return;
    if (job.description.trim().length < 100 || job.source?.summaryOnly) { status.textContent = 'Add and review the full job description before downloading a tailored letter.'; return; }
    if (!(getState().cv.fullName || getState().profile.name || '').trim()) { status.textContent = 'Add your name in the career details before downloading a cover letter.'; $('cv-fullName').focus(); return; }
    const draft = $('letter-draft').value.trim();
    if (draft.length < 150) { status.textContent = 'Write and review a complete cover letter before downloading.'; return; }
    if (!$('letter-reviewed').checked) { status.textContent = 'Confirm that you checked the letter and its claims before downloading.'; $('letter-reviewed').focus(); return; }
    const buttons = ['download-letter-docx', 'download-letter-pdf']; buttons.forEach(id => { $(id).disabled = true; });
    try {
      const blocks = letterBlocks(draft), bytes = format === 'pdf' ? await makePdf(blocks) : await makeDocx(blocks);
      const stem = `${getState().cv.fullName || 'candidate'}-${job.employer}-cover-letter`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
      downloadDocument(bytes, `${stem}.${format}`, format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      status.textContent = 'Download created. Open it to check the wording and layout before sending.';
    } catch (error) { status.textContent = error.message || 'Could not create the cover letter download.'; }
    finally { buttons.forEach(id => { $(id).disabled = false; }); }
  });
  $('interview-update').addEventListener('click', () => {
    const pack = getPack(); if (!pack) return;
    const focus = $('interview-focus').value.trim(), roleId = $('interview-role').value;
    if (focus.split('\n').filter(s => s.trim()).length > 3) { $('interview-export-status').textContent = 'Choose up to three requirements, one per line.'; return; }
    if (focus === pack.focus && roleId === pack.roleId) return;
    if (pack.answers.some(a => a.answer.trim()) && !confirm('Replace these questions and delete their existing practice notes?')) { $('interview-role').value = pack.roleId; $('interview-focus').value = pack.focus; return; }
    pack.focus = focus; pack.roleId = roleId; pack.answers = []; changed(); renderQuestions(); renderPreview(); $('interview-export-status').textContent = 'Practice questions updated for your chosen focus.';
  });
  const exports = ['download-cv-docx', 'download-cv-pdf', 'download-cv-text', 'download-interview-pdf', 'download-interview-text', 'download-interview-cheat'];
  async function exportFile(kind, format) {
    const state = getState(), job = getJob(), pack = getPack(); if (!job || !pack) return;
    const status = $(kind === 'cv' ? 'cv-export-status' : 'interview-export-status'); status.textContent = '';
    if (kind !== 'cv' && cleanInterviewContext(pack.interviewContext).status === 'unknown') {
      status.textContent = 'Review company & interview information first: add what you know, or confirm you have no extra information yet.';
      $('interview-context-open').focus(); return;
    }
    if (kind === 'cv') {
      if (job.description.trim().length < 100 || job.source?.summaryOnly) { status.textContent = 'Add and review the full job description before downloading a tailored CV. A short provider summary is not enough.'; return; }
      if (!state.cv.anonymous && !baseForm.reportValidity()) { status.textContent = 'Check your contact details, including the email address.'; return; }
      const issues = cvIssues(state.cv, pack); if (issues.length) { status.textContent = issues.join(' '); return; }
      if (!$('cv-reviewed').checked) { status.textContent = 'Review the CV and confirm that its claims, qualifications and dates are accurate before downloading.'; $('cv-reviewed').focus(); return; }
    } else if ($('interview-focus').value.trim() !== pack.focus || $('interview-role').value !== pack.roleId) { status.textContent = 'Use Update practice questions first so the download matches your selected focus.'; return; }
    const cheat = format === 'cheat';
    if (cheat) format = 'pdf';
    const blocks = cheat ? cheatSheetBlocks(job, pack) : kind === 'cv' ? cvBlocks(state.cv, pack, job) : interviewBlocks(job, pack);
    const suffix = job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'target-role';
    exports.forEach(id => { $(id).disabled = true; }); status.textContent = 'Creating your document on this device…';
    try {
      const bytes = format === 'pdf' ? await makePdf(blocks, { onePage: cheat }) : format === 'docx' ? await makeDocx(blocks) : plainText(blocks);
      const extension = format === 'text' ? 'txt' : format;
      downloadDocument(bytes, `rolebridge-${kind === 'cv' ? 'cv' : 'interview'}-${cheat ? 'cheat-sheet-' : ''}${suffix}.${extension}`, format === 'pdf' ? 'application/pdf' : format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain;charset=utf-8');
      status.textContent = 'Download created. Open the file to check its contents and layout before sharing it. No application was submitted.';
      announce('Your document download is ready. Review it before sharing.');
    } catch (error) { status.textContent = error.message || 'The download could not be created. Try again or use the text format.'; }
    finally { exports.forEach(id => { $(id).disabled = false; }); }
  }
  for (const id of exports) { const [, kind, format] = id.split('-'); $(id).addEventListener('click', () => exportFile(kind, format)); }
  return { render, clearImport: cvImport.clear };
}
