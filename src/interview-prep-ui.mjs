import { cleanCompanyResearch, safeCompanyUrl, hasCompanyResearch } from './company-research.mjs';
import { interviewQuestions } from './interviews.mjs';
import { sampleAnswer } from './interview-answers.mjs';
import { readCv } from './cv.mjs';
import { cvProfileDraft } from './cv-profile.mjs';
import { cleanJob } from './model.mjs';
import { cleanPack } from './application-data.mjs';
import { cleanInterviewContext } from './interview-context.mjs';
import { interviewBlocks, plainText, suggestedRole } from './application-content.mjs';
import { preInterviewSheetBlocks, interviewDaySheetBlocks, interviewEvidence, suggestedRequirements } from './interview-prep-content.mjs';
import { makePdf, makeDocx, makeCheatSheetsPdf, downloadDocument } from './document-export.mjs';
const $ = id => document.getElementById(id);
const node = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };

export function initInterviewPrep({ getState, changed, announce }) {
  let initialized = false, resultId = '', revision = 0, fileRevision = 0;
  const form = $('prep-form'); form.reset();
  const fields = ['prep-role', 'prep-skills', 'prep-evidence', 'prep-job-title', 'prep-employer', 'prep-description', 'prep-focus', 'prep-company', 'prep-process', 'prep-company-url', 'prep-company-research'];
  function invalidate() {
    revision++; $('prep-practice').hidden = true; $('prep-questions').replaceChildren(); $('prep-reviewed').checked = false; $('prep-result').hidden = true;
    $('prep-preview').replaceChildren(); $('prep-error').textContent = ''; $('prep-export-status').textContent = '';
  }
  fields.forEach(id => $(id).addEventListener('input', invalidate));
  const researchFromForm = () => cleanCompanyResearch({ url: $('prep-company-url').value.trim(), notes: $('prep-company-research').value });
  function updateCompanyLink() {
    const input = $('prep-company-url'), url = safeCompanyUrl(input.value.trim()), link = $('prep-company-link');
    input.setCustomValidity(input.value.trim() && !url ? 'Use a public HTTPS website address without login details, tracking parameters, a port or a # fragment.' : '');
    link.hidden = !url;
    if (url) link.href = url; else link.removeAttribute('href');
  }
  $('prep-company-url').addEventListener('input', updateCompanyLink);
  const contextFromForm = () => cleanInterviewContext({ status: $('prep-context-status').value, company: $('prep-company').value.trim(), process: $('prep-process').value.trim() });
  function showContextFields() { $('prep-context-fields').hidden = $('prep-context-status').value !== 'provided'; }
  $('prep-context-status').addEventListener('change', () => { invalidate(); showContextFields(); });
  function fillEvidence(source) {
    $('prep-role').value = source.role || '';
    $('prep-skills').value = source.skills || '';
    // Keep whole statements within the reviewed snapshot limit.
    const examples = []; let length = 0;
    for (const text of (source.evidence || '').split(/\n+/).filter(s => s.trim())) {
      if (length + text.length + 1 <= 4000) { examples.push(text); length += text.length + 1; }
    }
    $('prep-evidence').value = examples.join('\n');
  }
  function useProfile() {
    invalidate(); const profile = getState().profile;
    fillEvidence({ role: profile.currentRole, skills: profile.skills, evidence: profile.evidence });
    $('prep-upload-status').textContent = profile.evidence ? 'Using your workspace experience. Review it against the CV you submitted for this role; add any missing examples.' : 'Upload a CV or enter your recent role and relevant work examples below.';
  }
  $('prep-use-profile').addEventListener('click', useProfile);
  function chooseJob(reuseEvidence = false) {
    invalidate(); const state = getState(), job = state.jobs.find(j => j.id === $('prep-job').value);
    for (const [id, key] of [['prep-job-title', 'title'], ['prep-employer', 'employer'], ['prep-description', 'description']]) {
      $(id).value = job?.[key] || ''; $(id).readOnly = Boolean(job) && key !== 'description';
    }
    const pack = job && state.packs.find(p => p.jobId === job.id);
    $('prep-open-saved').hidden = !pack?.prep || cleanInterviewContext(pack?.interviewContext).status === 'unknown';
    const context = cleanInterviewContext(pack?.interviewContext);
    $('prep-context-status').value = context.status === 'unknown' ? '' : context.status;
    $('prep-company').value = context.company; $('prep-process').value = context.process; showContextFields();
    const research = cleanCompanyResearch(pack?.companyResearch);
    $('prep-company-url').value = research.url; $('prep-company-research').value = research.notes; updateCompanyLink();
    $('prep-focus').value = pack?.focus || (job ? suggestedRequirements(job.description) : '');
    $('prep-job-status').textContent = job?.source?.summaryOnly
      ? 'This is a short Reed summary. Check the full advert. Paste the full description below before creating your pack.'
      : job ? 'Using the saved description. You can update it below; changes save only when you review and create the pack.' : 'Paste the advert for the role you are interviewing for. Creating the pack will also add this vacancy to your shortlist.';
    if (pack && reuseEvidence) {
      fillEvidence(interviewEvidence(pack));
      $('prep-upload-status').textContent = 'Using the reviewed evidence from this vacancy’s existing pack. You can upload a different CV or use your workspace experience instead.';
    }
  }
  function open(jobId) {
    form.hidden = false;
    const state = getState(), previous = $('prep-job').value;
    const select = $('prep-job'); select.replaceChildren();
    const fresh = node('option', 'Paste a job description'); fresh.value = ''; select.append(fresh);
    for (const job of state.jobs) { const option = node('option', `${job.title}${job.employer ? ' — ' + job.employer : ''}`); option.value = job.id; select.append(option); }
    select.value = state.jobs.some(j => j.id === jobId) ? jobId : initialized ? (state.jobs.some(j => j.id === previous) ? previous : '') : state.jobs[0]?.id || '';
    if (!initialized) { useProfile(); chooseJob(true); initialized = true; }
    else if (previous && !select.value) chooseJob();
    // Re-read saved descriptions and notes after visiting other tools.
    else if (select.value) chooseJob(true);
    if (resultId && !state.packs.some(p => p.jobId === resultId)) invalidate();
    const savedJob = state.jobs.find(j => j.id === jobId), savedPack = state.packs.find(p => p.jobId === jobId);
    if (savedJob && savedPack?.prep && cleanInterviewContext(savedPack.interviewContext).status !== 'unknown') showResult(savedJob, savedPack);
  }
  $('prep-job').addEventListener('change', () => chooseJob());
  $('prep-find-focus').addEventListener('click', () => {
    invalidate(); $('prep-focus').value = suggestedRequirements($('prep-description').value);
    $('prep-job-status').textContent = $('prep-focus').value ? 'Suggested priorities are ready below. Review or replace them with the requirements most relevant to your interview.' : 'No clear requirements were recognised. Copy one to three important requirements into the priorities field below.';
  });
  $('prep-description').addEventListener('change', () => {
    if (!$('prep-focus').value.trim()) $('prep-focus').value = suggestedRequirements($('prep-description').value);
  });
  $('prep-cv-file').addEventListener('change', async () => {
    const file = $('prep-cv-file').files[0]; if (!file) return;
    const token = ++fileRevision; invalidate();
    $('prep-cv-file').disabled = true; $('prep-create').disabled = true;
    $('prep-upload-status').textContent = 'Reading your CV on this device…';
    try {
      const source = await readCv(file); if (token !== fileRevision) return;
      const draft = cvProfileDraft(source);
      fillEvidence({ role: draft.currentRole, skills: draft.skills, evidence: draft.evidence });
      invalidate();
      $('prep-upload-status').textContent = 'CV read locally. Review the role, recognised skills and up to three latest-role examples below. Complete any gaps; the reader cannot recognise every layout. The raw text is not retained here.';
    } catch (error) { if (token !== fileRevision) return; $('prep-upload-status').textContent = error.message || 'Could not read this CV. Try another file or enter relevant examples below.'; }
    finally { if (token === fileRevision) { $('prep-cv-file').value = ''; $('prep-cv-file').disabled = false; $('prep-create').disabled = false; } }
  });
  function showResult(job, pack) {
    resultId = job.id; form.hidden = true; $('prep-result').hidden = false; $('prep-open-saved').hidden = true; $('prep-practice').hidden = true; renderPractice(job, pack);
    renderCheatPreview(job, pack);
    $('prep-result-title').focus(); $('prep-result').scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  function renderCheatPreview(job, pack) {
    const preview = $('prep-preview'); preview.replaceChildren();
    for (const blocks of [preInterviewSheetBlocks(job, pack), interviewDaySheetBlocks(job, pack)]) {
      const sheet = node('section', ''); sheet.className = 'prep-sheet';
      for (const b of blocks) {
        const el = node(b.style === 'title' ? 'h3' : b.style === 'heading' ? 'h4' : 'p', b.text);
        el.className = `prep-lines prep-lines-${b.maxLines}`; sheet.append(el);
      }
      preview.append(sheet);
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); $('prep-error').textContent = '';
    if (!form.reportValidity()) return;
    const interviewContext = contextFromForm(), companyResearch = researchFromForm();
    if (interviewContext.status === 'unknown') { $('prep-error').textContent = 'Add company or interview-process notes, or choose “I don’t have any extra information yet”.'; $('prep-company').focus(); return; }
    if (!$('prep-role').value.trim() || $('prep-evidence').value.trim().length < 20 || !$('prep-job-title').value.trim() || $('prep-description').value.trim().length < 20) { $('prep-error').textContent = 'Add your role, a work example, the interview role and a job description before continuing.'; return; }
    const focus = $('prep-focus').value.trim(), priorities = focus.split('\n').filter(s => s.trim());
    if (!priorities.length || priorities.length > 3 || priorities.some(s => s.trim().length < 10 || s.length > 280)) { $('prep-error').textContent = 'Choose one to three advert priorities, one per line, using 10–280 characters each.'; return; }
    const state = getState(), existingJob = state.jobs.find(j => j.id === $('prep-job').value);
    if (!existingJob && state.jobs.length >= 30) { $('prep-error').textContent = 'Your shortlist already has 30 vacancies. Choose one or remove an old vacancy first.'; return; }
    const job = existingJob ? cleanJob({ ...existingJob, description: $('prep-description').value.trim() }) : cleanJob({ id: crypto.randomUUID(), title: $('prep-job-title').value.trim(), employer: $('prep-employer').value.trim(), description: $('prep-description').value.trim() });
    const existing = state.packs.find(p => p.jobId === job.id);
    if (!existing && state.packs.length >= 5) { $('prep-error').textContent = 'Five packs are already saved. Open an older saved preparation and use Manage this saved preparation to delete it before creating another.'; return; }
    const roleId = suggestedRole(job), questionsChanged = existing && (existing.focus !== focus || existing.roleId !== roleId);
    if (questionsChanged && existing.answers.some(a => a.answer.trim()) && !confirm('Changing the interview focus replaces the questions and clears their practice notes. Continue? Other saved information will be kept.')) return;
    const removedContextNotes = existing?.answers.some(a => a.answer.trim() && ((a.id === 'context-company' && !interviewContext.company) || (a.id === 'context-process' && !interviewContext.process) || (a.id === 'company-knowledge' && !hasCompanyResearch({ companyResearch }))));
    if (!questionsChanged && removedContextNotes && !confirm('Removing these company sources or process notes also removes practice answers for those questions. Other answers will be kept. Continue?')) return;
    const profile = { currentRole: $('prep-role').value.trim(), skills: $('prep-skills').value.trim(), evidence: $('prep-evidence').value.trim() };
    const token = revision; $('prep-create').disabled = true;
    try {
      const candidate = existing || cleanPack({ jobId: job.id });
      if (token !== revision || !$('prep-reviewed').checked) { $('prep-error').textContent = 'Inputs changed while preparing the pack. Review them and create it again.'; return; }
      const pack = cleanPack({ ...candidate, roleId, focus, interviewContext, companyResearch, prep: { role: profile.currentRole, skills: profile.skills, evidence: profile.evidence }, answers: questionsChanged ? [] : candidate.answers });
      // A removed context prompt must not keep notes that can no longer be edited.
      pack.answers = pack.answers.filter(a => a.id !== 'context-company' || interviewContext.company.trim()).filter(a => a.id !== 'context-process' || interviewContext.process.trim()).filter(a => a.id !== 'company-knowledge' || hasCompanyResearch(pack));
      if (!existingJob) state.jobs.push(job); else state.jobs[state.jobs.indexOf(existingJob)] = job;
      if (existing) state.packs[state.packs.indexOf(existing)] = pack; else state.packs.push(pack);
      changed(); showResult(job, pack);
      // Select the newly saved vacancy so a second creation updates the same pack.
      if (!existingJob) { const option = node('option', `${job.title}${job.employer ? ' — ' + job.employer : ''}`); option.value = job.id; $('prep-job').append(option); $('prep-job').value = job.id; }
      announce('Interview preparation is ready. Download the full PDF or Word pack and the two cheat sheets.');
    } catch { $('prep-error').textContent = 'The pack could not be created. Please retry in a current browser over HTTPS.'; }
    finally { $('prep-create').disabled = false; }
  });
  $('prep-edit').addEventListener('click', () => { form.hidden = false; chooseJob(true); $('prep-role').focus(); });
  $('prep-notes').addEventListener('click', () => { $('prep-practice').hidden = false; $('prep-practice-title').focus(); $('prep-practice-title').scrollIntoView({ behavior: 'instant', block: 'start' }); });
  $('prep-open-saved').addEventListener('click', () => {
    const state = getState(), job = state.jobs.find(j => j.id === $('prep-job').value), pack = state.packs.find(p => p.jobId === job?.id);
    if (job && pack) showResult(job, pack);
  });
  $('prep-delete').addEventListener('click', () => {
    const state = getState(), pack = state.packs.find(p => p.jobId === resultId);
    if (!pack || !confirm('Delete the interview evidence, company website research, notes and practice answers for this job?' + (pack.sourceKey ? ' This also deletes the older CV draft stored with this job; keep an encrypted backup if needed.' : '') + ' Downloaded documents must be deleted separately.')) return;
    state.packs = state.packs.filter(p => p !== pack);
    changed(); resultId = ''; invalidate(); form.hidden = false; chooseJob(true); fillEvidence({});
    $('prep-upload-status').textContent = 'Preparation deleted. Upload a CV, reuse your profile or enter examples to start again.';
  });
  function renderPractice(job, pack) {
    const list = $('prep-questions'); list.replaceChildren();
    for (const q of interviewQuestions(job, pack)) {
      const detail = node('details', ''); detail.className = 'interview-question';
      detail.append(node('summary', q.question), node('p', q.guidance));
      const sample = sampleAnswer(q, job, pack); detail.append(node('h4', sample.label), node('p', sample.text), node('p', sample.adapt));
      const label = node('label', 'My own answer / practice notes'); label.htmlFor = `prep-answer-${q.id}`;
      const input = document.createElement('textarea'); input.id = label.htmlFor; input.maxLength = 1000; input.rows = 5; input.spellcheck = false; input.autocomplete = 'off';
      input.value = pack.answers.find(a => a.id === q.id)?.answer || '';
      input.addEventListener('input', () => { pack.answers = pack.answers.filter(a => a.id !== q.id); if (input.value.trim()) pack.answers.push({ id: q.id, answer: input.value }); changed(); renderCheatPreview(job, pack); $('prep-export-status').textContent = 'Notes updated. Download again to include them in PDF or Word.'; });
      detail.append(label, input); list.append(detail);
    }
  }
  const downloads = ['prep-download-full', 'prep-download-cheat', 'prep-download-text', 'prep-download-word'];
  async function exportFile(kind) {
    const state = getState(), job = state.jobs.find(j => j.id === resultId), pack = state.packs.find(p => p.jobId === resultId);
    if (!job || !pack) { $('prep-export-status').textContent = 'This pack has been removed. Create it again before downloading.'; return; }
    const blocks = interviewBlocks(job, pack), token = revision;
    downloads.forEach(id => $(id).disabled = true); $('prep-export-status').textContent = 'Creating your document on this device…';
    try {
      const bytes = kind === 'text' ? plainText(blocks) : kind === 'word' ? await makeDocx(blocks) : kind === 'cheat' ? await makeCheatSheetsPdf([preInterviewSheetBlocks(job, pack), interviewDaySheetBlocks(job, pack)]) : await makePdf(blocks);
      if (token !== revision) return;
      const suffix = job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'target-role';
      downloadDocument(bytes, `rolebridge-interview-${kind === 'cheat' ? 'cheat-sheet-' : ''}${suffix}.${kind === 'text' ? 'txt' : kind === 'word' ? 'docx' : 'pdf'}`, kind === 'text' ? 'text/plain;charset=utf-8' : kind === 'word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
      $('prep-export-status').textContent = 'Download ready. Open the file to review it, then print in A4 portrait.';
    } catch (error) { $('prep-export-status').textContent = error.message || 'Could not create the PDF. Try the full pack in text format.'; }
    finally { downloads.forEach(id => $(id).disabled = false); }
  }
  downloads.forEach((id, index) => $(id).addEventListener('click', () => exportFile(['full', 'cheat', 'text', 'word'][index])));
  return { open, leave() { fileRevision++; revision++; $('prep-cv-file').value = ''; $('prep-cv-file').disabled = false; $('prep-create').disabled = false; } };
}
