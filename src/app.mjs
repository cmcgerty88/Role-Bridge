import { initInterviewPrep } from './interview-prep-ui.mjs';
import { initApplicationPack } from './application-ui.mjs';
import { searchNextAction, upcomingInterviews } from './search-journey.mjs';
import { cvProfileDraft } from './cv-profile.mjs';
import { initVacancies } from './vacancy-ui.mjs';
import { skillEvidence, canonicalSkill } from './skills.mjs';
import { extractWorkExamples, mergeWorkExamples } from './work-examples.mjs';
import { blankState, cleanProfile, cleanJob, safeJobUrl } from './model.mjs';
import { initWorkspace } from './workspace.mjs';
import { diagnose, STAGES, GOALS, cleanProgress, progressError } from './progress.mjs';
import { assessJob } from './matching.mjs';
import { readCv } from './cv.mjs';
import { ROLE_CATALOGUE, exploreRoles, matchRole, roleById, prepareSearchTerms } from './roles.mjs';

const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (className) value.className = className; return value; };
let state = blankState();
let profileReviewed = false, entryStep = 0;
let currentStep = 1, fileGeneration = 0, pendingRemoval = null;
let workspace, vacancies, interviewPrep, applicationPack, workspaceStarted = false, pendingSidebarStep = null, homeRequestedDuringEntry = false;
// Original field values remain the saved version until the person reviews the import.
const pendingCvFields = new Map();
const profileForm = $('profile-form'), preferencesForm = $('preferences-form'), jobForm = $('job-form');

function announce(text) { $('announcement').textContent = ''; requestAnimationFrame(() => { $('announcement').textContent = text; }); }
function syncProfile() {
  state.profile = cleanProfile({ ...Object.fromEntries(new FormData(profileForm)), ...Object.fromEntries(new FormData(preferencesForm)) });
}
function fillProfile() {
  for (const [name, value] of Object.entries(state.profile)) { const input = $(name); if (input) input.value = value; }
  $('profile-confirmed').checked = false;
  updateProfilePrompt();
}
function updateProfilePrompt() {
  $('profile-prompt').textContent = 'Review your experience';
  $('profile-continue').textContent = $('goal').value === 'offers' ? 'Prepare for my interview →' : ['interviews', 'applications'].includes($('goal').value) ? 'Choose a job to prepare →' : 'Find suitable jobs →';
  $('profile-context').textContent = 'Check the details from your CV, then choose the role and location you want next. We’ll reuse this profile for each job.';
}
function setSaveStatus() { workspace?.changed(); }
function profileChanged(event) {
  if (event?.target !== $('profile-confirmed')) $('profile-confirmed').checked = false;
  if ($('profile-confirmed').checked && pendingCvFields.size) {
    pendingCvFields.clear();
    $('cv-draft-status').textContent = 'Profile reviewed. These details can now be included if you choose encrypted saving.';
  }
  profileReviewed = $('profile-confirmed').checked;
  syncProfile(); setSaveStatus();
  updateProfilePrompt();
}
profileForm.addEventListener('input', profileChanged);
preferencesForm.addEventListener('input', () => { syncProfile(); setSaveStatus(); });
$('country').addEventListener('change', () => { $('currency').value = $('country').value === 'IE' ? 'EUR' : 'GBP'; syncProfile(); setSaveStatus(); });

function showStep(step, focus = true) {
  if (step !== 10) interviewPrep?.leave();
  if (step !== 6) applicationPack?.clearImport();
  currentStep = step;
  document.querySelectorAll('.step-panel').forEach(section => { section.hidden = section.id !== `step-${step}`; });
  document.querySelectorAll('[data-step]').forEach(button => { if (Number(button.dataset.step) === ({ 2: 1, 3: 1, 4: 8 }[step] || step)) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
  if (step === 3) renderDirections();
  if (step === 4) renderResults();
  if (step === 5) renderDashboard();
  if (step === 10) interviewPrep.open();
  if (step === 6) applicationPack?.render().catch(() => announce('Could not open the CV builder. Please try again.'));
  if (step === 8) vacancies.open();
  $('tool-menu').open = false;
  updateSidebar();
  document.querySelector('.journey-nav').hidden = step === 0;
  if (focus) {
    const heading = $({ 0: 'situation-title', 1: 'experience-title', 2: 'preferences-title', 3: 'directions-title', 4: 'vacancies-title', 5: 'dashboard-title', 6: 'pack-title', 8: 'vacancy-pool-title', 10: 'prep-title' }[step]);
    heading.focus({ preventScroll: true }); heading.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}
function navigate(step) {
  syncProfile();
  const validProfile = [...profileForm.elements].every(input => input.id === 'profile-confirmed' && profileReviewed || input.checkValidity());
  if ([4, 8].includes(step) && !validProfile) { showStep(1); profileForm.reportValidity(); return; }
  if ([3, 4].includes(step) && !preferencesForm.checkValidity()) { showStep(2); preferencesForm.reportValidity(); return; }
  showStep(step);
}
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => navigate(Number(button.dataset.step))));
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => navigate(Number(button.dataset.back))));
$('diagnosis-start').addEventListener('click', event => {
  event.preventDefault();
  if (workspaceStarted) { resumeWorkspace(); return; }
  homeRequestedDuringEntry = false; entryStep = 0; workspace.begin();
});
$('interview-shortcut').addEventListener('click', () => {
  if (workspaceStarted) { resumeWorkspace(); if (currentStep !== 10) showStep(10); }
  else { entryStep = 10; workspace.begin(); }
});
function updateSidebar() {
  document.querySelectorAll('[data-sidebar-step]').forEach(button => {
    if (workspaceStarted && $('workspace').hidden === false && Number(button.dataset.sidebarStep) === currentStep) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('[data-sidebar-home]').toggleAttribute('aria-current', !workspaceStarted || $('workspace').hidden);
}
function closeSidebar() {
  $('app-sidebar').classList.remove('is-open'); $('sidebar-backdrop').hidden = true;
  $('app-sidebar').style.top = '';
  $('sidebar-toggle').setAttribute('aria-expanded', 'false'); $('sidebar-toggle').setAttribute('aria-label', 'Open navigation');
}
$('sidebar-toggle').addEventListener('click', () => {
  const open = !$('app-sidebar').classList.contains('is-open');
  if (open) $('app-sidebar').style.top = `${window.scrollY}px`;
  $('app-sidebar').classList.toggle('is-open', open); $('sidebar-backdrop').hidden = !open;
  $('sidebar-toggle').setAttribute('aria-expanded', String(open));
  $('sidebar-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (open) $('sidebar-close').focus();
});
$('sidebar-close').addEventListener('click', () => { closeSidebar(); $('sidebar-toggle').focus(); });
$('sidebar-backdrop').addEventListener('click', () => { closeSidebar(); $('sidebar-toggle').focus(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('app-sidebar').classList.contains('is-open')) { closeSidebar(); $('sidebar-toggle').focus(); } });
document.querySelector('[data-sidebar-home]').addEventListener('click', () => { closeSidebar(); showHome(); });
document.querySelectorAll('[data-sidebar-step]').forEach(button => button.addEventListener('click', () => {
  const step = Number(button.dataset.sidebarStep); closeSidebar();
  if (!workspaceStarted) { homeRequestedDuringEntry = false; pendingSidebarStep = step; entryStep = step === 10 ? 10 : 0; workspace.begin(); return; }
  resumeWorkspace(); if (step !== currentStep) navigate(step);
}));
function resumeWorkspace() {
  document.querySelector('.hero').hidden = true; $('demo-link').hidden = true; $('workspace').hidden = false;
  // Reveal the current DOM without reopening tools: reopening can replace unreviewed drafts.
  const heading = currentStep === 10 && !$('prep-result').hidden ? $('prep-result-title') : document.querySelector(`#step-${currentStep} h2`);
  updateSidebar(); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ behavior: 'instant', block: 'start' });
}
function showHome() {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  applicationPack?.clearImport();
  applicationPack?.clearImport();
  $('workspace').hidden = true; $('signup').hidden = true; $('restore-panel').hidden = true; $('backup-restore').hidden = true;
  document.querySelector('.hero').hidden = false; $('demo-link').hidden = workspaceStarted;
  $('home-session-note').hidden = !workspaceStarted;
  $('open-workspace').hidden = workspaceStarted;
  $('diagnosis-start').textContent = workspaceStarted ? 'Continue my job search →' : 'Find my next role →';
  homeRequestedDuringEntry = !workspaceStarted; pendingSidebarStep = null; closeSidebar(); updateSidebar();
  $('hero-title').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
}
document.querySelectorAll('[data-home]').forEach(link => link.addEventListener('click', event => {
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); showHome();
}));
function focusDestination() { return state.profile.goal === 'offers' ? 10 : ['interviews', 'applications'].includes(state.profile.goal) ? 4 : 8; }
document.querySelectorAll('[data-goal]').forEach(button => button.addEventListener('click', () => {
  $('goal').value = button.dataset.goal; syncProfile(); updateProfilePrompt(); setSaveStatus();
  if (state.profile.goal === 'offers') showStep(10);
  else if (profileReviewed) navigate(focusDestination());
  else showStep(1);
}));
profileForm.addEventListener('submit', event => { event.preventDefault(); if (!profileForm.reportValidity()) return; navigate(focusDestination()); });
preferencesForm.addEventListener('submit', event => { event.preventDefault(); navigate(8); });
$('plan-home').addEventListener('click', () => navigate(5));
$('check-in-update').addEventListener('click', () => {
  if (!state.jobs.length) { navigate(4); return; }
  $('tracker-title').focus({ preventScroll: true }); $('tracker-title').scrollIntoView({ behavior: 'instant', block: 'start' });
  const form = $('application-list').querySelector('details'); if (form) form.open = true;
});
function fillFromCv() {
  const draft = cvProfileDraft($('cv-text').value);
  const filled = [];
  const labels = { currentRole: 'recent role', skills: 'skills', evidence: 'work examples' };
  for (const [field, value] of Object.entries(draft)) {
    if (!value || $(field).value.trim()) continue;
    if (!pendingCvFields.has(field)) pendingCvFields.set(field, $(field).value);
    $(field).value = value; filled.push(labels[field]);
  }
  $('cv-draft-status').hidden = false;
  $('cv-draft-status').textContent = filled.length
    ? `Draft added: ${filled.join(', ')}. Review the fields below, remove anything inaccurate or confidential, and tick the confirmation. Imported details are not saved until you do. Your target role is your choice.`
    : 'Existing entries have been kept. Any missing fields need your input; the reader may not recognise every CV layout. Open “Paste text or review what was found” to choose a role or add suggestions.';
  profileChanged();
  showSkillSuggestions(); showWorkSuggestions();
  $('cv-status').textContent = filled.length ? 'Your draft is ready to review below.' : 'CV read. Review your profile below and complete any gaps.';
}
$('fill-from-cv').addEventListener('click', fillFromCv);
$('manual-profile').addEventListener('click', () => {
  $('cv-reader').open = false;
  $('currentRole').focus(); $('currentRole').scrollIntoView({ behavior: 'instant', block: 'center' });
});

function renderSavedDirections() {
  const list = $('saved-directions'); list.replaceChildren();
  const chosen = state.roleDirections.map(roleById).filter(Boolean);
  if (!chosen.length) { list.append(node('li', 'No directions saved yet.', 'muted small')); return; }
  for (const role of chosen) {
    const item = node('li'); item.append(node('strong', role.title));
    if (!matchRole(state.profile, role).relevant) item.append(node('p', 'Saved to explore; not currently connected to your role focus and confirmed skills.', 'hint'));
    const remove = node('button', 'Remove', 'text-button'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove saved direction ${role.title}`);
    remove.addEventListener('click', () => { state.roleDirections = state.roleDirections.filter(id => id !== role.id); renderDirections(); setSaveStatus(); $('role-view').focus(); });
    item.append(remove); list.append(item);
  }
}
function renderDirections() {
  syncProfile();
  state.roleDirections = state.roleDirections.filter(id => roleById(id));
  $('direction-evidence').textContent = state.profile.evidence;
  renderSavedDirections();
  const filter = $('role-view').value, query = $('role-search').value.trim().toLowerCase();
  let results = filter === 'suggested' ? exploreRoles(state.profile) : ROLE_CATALOGUE.filter(role => filter !== 'saved' || state.roleDirections.includes(role.id)).map(role => matchRole(state.profile, role));
  results = results.filter(({ role }) => `${role.title} ${role.category} ${role.terms.join(' ')}`.toLowerCase().includes(query));
  $('direction-count').textContent = `${results.length} ${results.length === 1 ? 'direction' : 'directions'} shown · ${ROLE_CATALOGUE.length} in this limited library. Salary, location and eligibility must be checked on actual vacancies.`;
  const list = $('role-list'); list.replaceChildren();
  if (!results.length) {
    const empty = node('div', undefined, 'empty-state');
    empty.append(node('h3', query ? 'No directions match this filter.' : filter === 'saved' ? 'Your exploration list is empty.' : 'No supported directions for your role focus yet.'));
    empty.append(node('p', 'This says nothing about your employability. We prioritise your target role, or your current role if no target is entered. The library may not cover that occupation or wording. Review your titles and confirmed skills, search vacancies for your chosen role, or browse the library.'));
    const browse = node('button', 'Browse all directions', 'secondary'); browse.type = 'button'; browse.addEventListener('click', () => { $('role-view').value = 'all'; $('role-search').value = ''; renderDirections(); $('role-view').focus(); }); empty.append(browse); list.append(empty);
  }
  for (const result of results) {
    const { role, matches } = result;
    const card = node('article', undefined, 'role-card'); card.dataset.roleId = role.id;
    const header = node('div', undefined, 'job-header');
    const title = node('div'); title.append(node('p', role.category, 'eyebrow'), node('h3', role.title));
    header.append(title, node('span', result.context.direct ? 'Role title connection' : result.relevant ? 'Role & skill connections' : 'Browse to explore', 'badge ' + (result.relevant ? 'consider' : 'investigate'))); card.append(header, node('p', role.description, 'muted small'), node('p', result.context.reason, 'hint'));
    if (matches.length) {
      card.append(node('h4', 'Connections to skills you confirmed'));
      const connections = node('ul', undefined, 'role-connections');
      for (const match of matches) { const item = node('li'); item.append(node('strong', match.supplied), document.createTextNode(' ' + match.connection + '.')); connections.append(item); }
      card.append(connections);
    } else card.append(node('p', 'No confirmed skill labels connect to this entry. You can still explore it; the tool has not assessed whether you are qualified.', 'hint'));
    const details = node('details'); details.append(node('summary', 'What to check before pursuing this direction'));
    listSection(details, 'Questions for actual vacancies', role.checks);
    if (result.prompts.length) details.append(node('p', 'Other areas to look for in adverts: ' + result.prompts.join(', ') + '. These are not recorded as matching labels in your profile; that does not mean you lack them or that every employer requires them.', 'hint'));
    details.append(node('h4', 'An example you could prepare'), node('p', role.example, 'small'));
    const terms = prepareSearchTerms(role, state.profile).join('\n');
    const termsId = `terms-${role.id}`;
    const label = node('label', 'Search phrases you can use'); label.htmlFor = termsId;
    const text = node('textarea'); text.id = termsId; text.readOnly = true; text.rows = 3; text.value = terms; text.className = 'search-phrases';
    const copy = node('button', 'Copy search phrases', 'secondary'); copy.type = 'button';
    const status = node('p', '', 'hint'); status.setAttribute('role', 'status');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(terms); status.textContent = 'Copied. Paste into your preferred job site or employer search. Nothing was searched or sent automatically.'; }
      catch { text.focus(); text.select(); status.textContent = 'Automatic copying is unavailable. The phrases are selected; use your browser’s Copy action.'; }
    });
    details.append(label, text, node('p', 'These are search phrases, not links to jobs. No search is run and no information is sent to a job site.', 'hint'), copy, status); card.append(details);
    const actions = node('div', undefined, 'job-actions');
    const saved = state.roleDirections.includes(role.id);
    const save = node('button', saved ? 'Saved direction' : 'Save this direction', 'secondary'); save.type = 'button'; save.setAttribute('aria-pressed', String(saved));
    save.addEventListener('click', () => {
      const already = state.roleDirections.includes(role.id);
      if (!already && state.roleDirections.length >= 5) { $('direction-feedback').textContent = 'You have saved five directions. Remove one before adding another.'; announce('Five directions already saved. Remove one to make room.'); return; }
      state.roleDirections = already ? state.roleDirections.filter(id => id !== role.id) : [...state.roleDirections, role.id];
      save.textContent = already ? 'Save this direction' : 'Saved direction'; save.setAttribute('aria-pressed', String(!already));
      $('direction-feedback').textContent = already ? 'Direction removed from this tab.' : 'Direction added. An unlocked encrypted workspace saves this automatically.';
      renderSavedDirections(); setSaveStatus();
      if (filter === 'saved' && already) { renderDirections(); $('role-view').focus(); }
    });
    const find = node('button', 'Find vacancies for this direction', 'secondary'); find.type = 'button';
    find.addEventListener('click', () => { $('targetRole').value = role.title; syncProfile(); setSaveStatus(); navigate(8); });
    actions.append(save, find); card.append(actions); list.append(card);
  }
}
$('role-view').addEventListener('change', renderDirections);
$('role-search').addEventListener('input', renderDirections);

function showSkillSuggestions() {
  const mentions = skillEvidence($('cv-text').value);
  const container = $('skill-chips'); container.replaceChildren();
  $('skill-suggestions').hidden = false;
  container.append(node('p', `${mentions.length} skill suggestions found. Review each one; add missing skills in “Skills you can demonstrate”. This vocabulary cannot recognise every skill or establish your proficiency.`, 'hint'));
  if (!mentions.length) return;
  const addAll = node('button', 'Add all found skills', 'secondary'); addAll.type = 'button'; addAll.id = 'add-all-skills';
  const transferStatus = node('p', '', 'hint'); transferStatus.id = 'skill-transfer-status'; transferStatus.setAttribute('role', 'status');
  addAll.addEventListener('click', () => {
    const current = $('skills').value;
    const listed = new Set(current.split(/[,;\n]/).map(value => canonicalSkill(value).toLowerCase()));
    const additions = mentions.map(item => item.name).filter(skill => !listed.has(skill.toLowerCase()));
    const combined = current + (current.trim() && additions.length ? ', ' : '') + additions.join(', ');
    if (combined.length > 2000) {
      transferStatus.textContent = 'These skills would exceed the 2,000-character limit. Nothing was changed. Remove less relevant entries or add skills individually.';
      return;
    }
    if (additions.length) {
      $('skills').value = combined; profileChanged();
      const updated = new Set(combined.split(/[,;\n]/).map(value => canonicalSkill(value).toLowerCase()));
      container.querySelectorAll('button[data-skill]').forEach(button => button.setAttribute('aria-pressed', String(updated.has(button.dataset.skill.toLowerCase()))));
    }
    transferStatus.textContent = additions.length
      ? `Added ${additions.length} skills to “Skills you can demonstrate”. Existing entries were kept. Review the field and remove anything you cannot demonstrate.`
      : 'All found skills are already in “Skills you can demonstrate”. Review the field before continuing.';
    $('skills').focus(); $('skills').scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  container.append(addAll, transferStatus);
  const existing = new Set($('skills').value.split(/[,;\n]/).map(value => canonicalSkill(value).toLowerCase()));
  const evidence = node('details'); evidence.append(node('summary', 'See the CV text behind these suggestions'));
  const excerpts = node('ul');
  for (const { name: skill, snippet } of mentions) {
    const button = node('button', skill); button.type = 'button'; button.dataset.skill = skill; button.setAttribute('aria-pressed', String(existing.has(skill.toLowerCase())));
    button.addEventListener('click', () => {
      const skills = $('skills').value.split(/[,;\n]/).map(value => value.trim()).filter(Boolean);
      const found = skills.findIndex(value => canonicalSkill(value).toLowerCase() === skill.toLowerCase());
      if (found === -1) skills.push(skill); else skills.splice(found, 1);
      if (skills.join(', ').length > 2000) { announce('Your skills field is full. Remove a less relevant skill before adding another.'); return; }
      $('skills').value = skills.join(', '); button.setAttribute('aria-pressed', String(found === -1)); profileChanged();
      transferStatus.textContent = `${skill} ${found === -1 ? 'added to' : 'removed from'} “Skills you can demonstrate”.`;
    });
    container.append(button);
    const item = node('li'); item.append(node('strong', skill + ': '), document.createTextNode(snippet)); excerpts.append(item);
  }
  evidence.append(node('p', 'Extracted text with case and spacing normalised. These excerpts stay with the raw CV in this tab and are not saved to your profile.', 'hint'), excerpts);
  container.append(evidence);
}
function clearWorkSuggestions() { $('work-suggestions').replaceChildren(); $('work-suggestions').hidden = true; }
function showWorkSuggestions() {
  const result = extractWorkExamples($('cv-text').value);
  const container = $('work-suggestions'); container.replaceChildren(); container.hidden = false;
  container.append(node('h4', 'Review examples from your most recent role'), node('p', result.message, 'hint'));
  if (!result.roles.length) return;
  const label = node('label', 'Role to take examples from'); label.htmlFor = 'work-example-role';
  const select = node('select'); select.id = 'work-example-role';
  const placeholder = node('option', 'Choose your most recent role'); placeholder.value = ''; select.append(placeholder);
  for (const role of result.roles) {
    const option = node('option', `${role.label} · ${role.date}`); option.value = role.id; select.append(option);
  }
  select.value = result.suggested;
  const preview = node('div'); preview.id = 'work-example-preview';
  const status = node('p', '', 'hint'); status.id = 'work-example-status'; status.setAttribute('role', 'status');
  const render = () => {
    preview.replaceChildren(); status.textContent = '';
    const role = result.roles.find(item => item.id === select.value);
    if (!role) return;
    preview.append(node('p', `${role.examples.length} of up to 3 examples found. These are source statements, not verified outcomes. Check they describe work you did, and remove confidential details after adding.`, 'hint'));
    if (!role.examples.length) {
      preview.append(node('p', 'No clear work statements were recognised in this entry. Highlight the relevant CV text and use “Add selected text to my examples”, or type your own example.', 'hint'));
      return;
    }
    for (const example of role.examples) {
      const row = node('label', undefined, 'check');
      const checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.checked = true; checkbox.value = example;
      row.append(checkbox, node('span', example)); preview.append(row);
    }
    const add = node('button', 'Add selected examples', 'secondary'); add.type = 'button'; add.id = 'add-work-examples';
    add.addEventListener('click', () => {
      const selected = [...preview.querySelectorAll('input:checked')].map(input => input.value);
      if (!selected.length) { status.textContent = 'Select at least one example to add.'; return; }
      const merged = mergeWorkExamples($('evidence').value, selected);
      if (merged.full) { status.textContent = 'These examples would exceed the field limit. Nothing was changed. Select fewer examples or shorten the existing text.'; return; }
      if (merged.count) { $('evidence').value = merged.value; profileChanged(); }
      status.textContent = merged.count ? `Added ${merged.count} ${merged.count === 1 ? 'example' : 'examples'}. Existing text was kept. Review the wording before confirming your profile.` : 'These examples are already in your work examples field.';
      $('evidence').focus(); $('evidence').scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    preview.append(add);
  };
  select.addEventListener('change', render); container.append(label, select, preview, status); render();
}
$('find-work-examples').addEventListener('click', showWorkSuggestions);
$('clear-cv').addEventListener('click', () => { fileGeneration++; $('cv-text').value = ''; $('cv-file').value = ''; $('cv-text').disabled = false; $('cv-file').disabled = false; $('skill-chips').replaceChildren(); $('skill-suggestions').hidden = true; clearWorkSuggestions(); $('cv-status').textContent = 'Raw CV cleared. Your reviewed profile is unchanged.'; });
$('find-skills').addEventListener('click', showSkillSuggestions);
$('cv-text').addEventListener('input', () => { $('skill-suggestions').hidden = true; clearWorkSuggestions(); $('cv-status').textContent = 'CV text is held only in this tab. Review it and add relevant examples to your profile.'; });
$('use-selection').addEventListener('click', () => {
  const input = $('cv-text'); const selected = input.value.slice(input.selectionStart, input.selectionEnd).trim();
  if (!selected) { $('cv-status').textContent = 'First highlight a passage in the CV-text box, then choose “Add selected text to my examples”.'; input.focus(); return; }
  const combined = [$('evidence').value.trim(), selected].filter(Boolean).join('\n\n');
  if (combined.length > 12000) { $('cv-status').textContent = 'There is too much text for the experience profile. Select a shorter example.'; return; }
  $('evidence').value = combined; profileChanged(); $('evidence').focus(); announce('Selected text added to your examples. Please check it.');
});
$('cv-file').addEventListener('change', async () => {
  const file = $('cv-file').files[0]; if (!file) return;
  const generation = ++fileGeneration;
  clearWorkSuggestions();
  $('cv-file').disabled = true; $('cv-text').disabled = true;
  $('cv-status').textContent = 'Reading your CV on this device…'; $('cv-status').classList.remove('error-text');
  try {
    const text = await readCv(file); if (generation !== fileGeneration) return;
    $('cv-text').value = text;
    fillFromCv();
    $('cv-status').textContent = `Read ${file.name} in your browser. ` + $('cv-status').textContent;
  } catch (error) {
    if (generation !== fileGeneration) return;
    $('cv-status').textContent = error.message || 'The file could not be read. Please paste your CV text instead.';
    $('cv-status').classList.add('error-text');
  } finally {
    if (generation === fileGeneration) { $('cv-file').disabled = false; $('cv-text').disabled = false; $('cv-file').value = ''; }
  }
});

function openJob(existing) {
  if (state.jobs.length >= 30 && !existing) { announce('This first version supports 30 vacancies. Remove an old vacancy before adding another.'); return; }
  $('job-extra-facts').open = Boolean(existing);
  jobForm.reset(); $('job-error').textContent = '';
  $('job-dialog-title').textContent = existing ? 'Edit your vacancy' : 'Add a vacancy';
  if (existing) {
    for (const [key, value] of Object.entries(existing)) { const field = jobForm.elements.namedItem(key); if (field) field.value = value; }
    // A new edit must not silently assert that the source was rechecked today.
    if (existing.status === 'open') $('job-status').value = 'unchecked';
  } else { $('job-currency').value = state.profile.currency; }
  $('job-dialog').showModal(); $('job-title').focus();
}
$('add-job').addEventListener('click', () => openJob());
$('suggestions-add-manual').addEventListener('click', () => { navigate(4); if (currentStep === 4) openJob(); });
jobForm.addEventListener('submit', event => {
  event.preventDefault(); $('job-error').textContent = '';
  if (!jobForm.reportValidity()) return;
  const data = Object.fromEntries(new FormData(jobForm));
  if (data.url.trim() && !safeJobUrl(data.url)) { $('job-error').textContent = 'Use a valid HTTPS vacancy link without a username or password in the address.'; $('job-url').focus(); return; }
  if (data.salaryMin !== '' && data.salaryMax !== '' && Number(data.salaryMin) > Number(data.salaryMax)) { $('job-error').textContent = 'The lower salary must not exceed the upper salary.'; $('job-min').focus(); return; }
  const existing = state.jobs.find(job => job.id === data.id);
  const job = cleanJob({ ...data, source: existing?.description === data.description ? existing?.source : null, progress: existing?.progress, id: existing?.id || crypto.randomUUID(), selected: existing?.selected || false, checkedAt: data.status === 'open' ? new Date().toISOString() : '' });
  if (existing) state.jobs[state.jobs.indexOf(existing)] = job; else state.jobs.push(job);
  $('job-dialog').close(); showStep(4); setSaveStatus(); announce('Vacancy saved in this tab and compared with your requirements.');
});

function listSection(details, title, values) {
  if (!values.length) return;
  details.append(node('h4', title)); const list = node('ul'); values.forEach(value => list.append(node('li', value))); details.append(list);
}
function currencyAmount(value, currency) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value)); }
function renderResults() {
  syncProfile();
  $('summary-name').textContent = state.profile.name || 'Your profile';
  $('summary-role').textContent = state.profile.currentRole;
  $('summary-evidence').textContent = state.profile.evidence;
  const p = state.profile;
  const preferences = [{ GB: 'United Kingdom', IE: 'Republic of Ireland', unknown: 'Work country: not chosen yet' }[p.country]];
  if (p.locations) preferences.push(p.locations);
  if (p.minimumSalary !== '') preferences.push(`${currencyAmount(p.minimumSalary, p.currency)} minimum gross annual pay`);
  preferences.push({ any: 'Open to different working patterns', remote: 'Remote only', hybrid: 'Hybrid only', onsite: 'On-site only' }[p.workMode]);
  if (p.workMode === 'hybrid' || p.workMode === 'any') preferences.push(`Up to ${p.maxOfficeDays} office days for hybrid roles`);
  if (p.hours !== 'any') preferences.push(p.hours === 'full-time' ? 'Full-time only' : 'Part-time only');
  $('summary-preferences').replaceChildren(...preferences.map(value => node('li', value)));
  const comparisons = state.jobs.map(job => ({ job, result: assessJob(p, job) }));
  comparisons.filter(item => item.result.status === 'skip').forEach(({ job }) => { job.selected = false; });
  const count = status => comparisons.filter(item => item.result.status === status).length;
  $('results-count').textContent = state.jobs.length ? `${count('consider')} worth considering · ${count('investigate')} need checking · ${count('skip')} ruled out by your entries` : 'No vacancies added yet.';
  const container = $('job-list'); container.replaceChildren();
  if (!state.jobs.length) {
    const empty = node('div', undefined, 'empty-state'); empty.append(node('h3', 'Start with one real vacancy.'), node('p', 'Bring a job you are considering. You will see which requirements fit, which conflict and which still need checking.'));
    const button = node('button', 'Add your first vacancy', 'primary'); button.type = 'button'; button.addEventListener('click', () => openJob()); empty.append(button); container.append(empty);
    const find = node('button', 'Find suggested vacancies', 'secondary'); find.type = 'button'; find.addEventListener('click', () => navigate(8));
    const alternatives = node('div', undefined, 'button-row'); alternatives.append(find); empty.append(alternatives);
  }
  const order = { consider: 0, investigate: 1, skip: 2 };
  comparisons.sort((a, b) => order[a.result.status] - order[b.result.status]);
  for (const { job, result } of comparisons) {
    const card = node('article', undefined, `job-card ${result.status}`); card.dataset.jobId = job.id;
    const header = node('div', undefined, 'job-header'); const title = node('div');
    title.append(node('h3', job.title), node('p', job.employer, 'job-employer'));
    header.append(title, node('span', { consider: 'Consider', investigate: 'Investigate', skip: 'Skip' }[result.status], `badge ${result.status}`)); card.append(header);
    const meta = node('div', undefined, 'job-meta');
    if (job.salaryMin !== '' && job.salaryMax !== '') meta.append(node('span', `${currencyAmount(job.salaryMin, job.currency)}–${currencyAmount(job.salaryMax, job.currency)} / year`));
    if (job.location) meta.append(node('span', job.location));
    if (job.mode !== 'unknown') meta.append(node('span', { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[job.mode]));
    card.append(meta);
    if (job.source?.summaryOnly) card.append(node('p', 'Imported from a Reed summary. Read the full advert and check missing facts before using this for interview preparation. The feed retrieval is not your own check that the vacancy is open.', 'hint'));
    card.append(node('p', result.failures[0] || result.questions[0] || 'The entered requirements fit, and you confirmed the essentials. This is worth reviewing; it is not a prediction of an interview.', 'job-reason'));
    const details = node('details', undefined, 'job-details'); details.append(node('summary', 'See the reasons and missing information'));
    listSection(details, 'Conflicts with your requirements', result.failures);
    listSection(details, 'Questions to resolve', result.questions);
    listSection(details, 'What fits, based on your entries', result.fits);
    if (result.skills.length) { details.append(node('h4', 'Shared skill mentions'), node('p', result.skills.join(', ') + '. These are text matches, not proof that you meet the requirements.', 'small muted')); }
    details.append(node('h4', 'Job description you supplied'), node('p', job.description, 'small preserve-lines'));
    card.append(details);
    const checkedAt = Date.parse(job.checkedAt);
    details.append(node('p', job.status === 'open' && Number.isFinite(checkedAt) ? `You marked the original page open on ${new Date(checkedAt).toLocaleString()}. This is not an independent check or proof of hiring intent.` : job.status === 'closed' ? 'You marked this vacancy as closed.' : 'The current vacancy status has not been checked.', 'hint'));
    const next = node('p', undefined, 'next-action'); next.append(node('strong', 'Next step'), document.createTextNode(result.nextAction)); details.append(next);
    const actions = node('div', undefined, 'job-actions');
    const continueSearch = node('button', 'See my next step', 'primary'); continueSearch.type = 'button'; continueSearch.addEventListener('click', () => { showStep(5); $('application-list').querySelector(`[data-job-id="${CSS.escape(job.id)}"]`)?.scrollIntoView({ block: 'center' }); }); actions.append(continueSearch);
    const prepare = node('button', 'Prepare for interview', 'secondary'); prepare.type = 'button'; prepare.addEventListener('click', () => { openInterview(job.id); }); actions.append(prepare);
    const buildCv = node('button', 'Build a CV for this job', 'secondary'); buildCv.type = 'button'; buildCv.addEventListener('click', () => { showStep(6); applicationPack.render(job.id).catch(() => announce('Could not open the CV builder.')); }); actions.append(buildCv);
    if (job.url) { const link = node('a', 'Open original vacancy'); link.href = job.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link); }
    const edit = node('button', 'Edit', 'text-button'); edit.type = 'button'; edit.setAttribute('aria-label', `Edit ${job.title}`); edit.addEventListener('click', () => openJob(job));
    const remove = node('button', 'Remove', 'text-button danger'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${job.title}`);
    remove.addEventListener('click', () => { pendingRemoval = job.id; $('remove-description').textContent = `${job.title} at ${job.employer} will be removed from this tab.`; $('remove-job-dialog').showModal(); });
    actions.append(edit, remove); card.append(actions); container.append(card);
  }
  renderPlan(); setSaveStatus();
}
function renderPlan() {
  const plan = $('action-list'); plan.replaceChildren();
  const selected = state.jobs.filter(job => job.selected && assessJob(state.profile, job).status !== 'skip');
  const directions = state.roleDirections.map(roleById).filter(Boolean);
  document.querySelector('.plan').hidden = !selected.length && !directions.length;
  if (!selected.length && !directions.length) { plan.append(node('li', 'Save a role direction or choose a vacancy to add a practical next step here.')); return; }
  for (const role of directions) { const item = node('li'); item.append(node('strong', 'Explore: ' + role.title), node('small', role.example)); plan.append(item); }
  for (const job of selected) { const item = node('li'); item.append(node('strong', job.title), node('small', assessJob(state.profile, job).nextAction)); plan.append(item); }
}
$('remove-job-confirm').addEventListener('click', () => { state.jobs = state.jobs.filter(job => job.id !== pendingRemoval); state.packs = state.packs.filter(pack => pack.jobId !== pendingRemoval); pendingRemoval = null; $('remove-job-dialog').close(); renderResults(); announce('Vacancy removed from this tab.'); });

function openInterview(jobId) { showStep(10); interviewPrep.open(jobId); }
function trackJob(jobId) {
  showStep(5);
  const card = [...$('application-list').children].find(item => item.dataset.jobId === jobId);
  if (card) { card.scrollIntoView({ block: 'center' }); card.querySelector('.quick-outcome select').focus(); }
}

function quickOutcome(job) {
  const current = cleanProgress(job.progress), form = node('form', undefined, 'quick-outcome'); form.autocomplete = 'off';
  const label = node('label', 'What happened with this job?'), select = node('select');
  select.id = `quick-outcome-${job.id}`; label.htmlFor = select.id;
  const choices = [['', 'Choose an update'], ['saved', 'Still considering'], ['applied', 'I applied'], ['booked', 'Interview booked'], ['interview', 'Interview completed'], ['rejected', 'I was rejected'], ['offer', 'I received an offer'], ['withdrawn', 'I withdrew']];
  for (const [value, title] of choices) { const option = node('option', title); option.value = value; select.append(option); }
  select.value = '';
  const dateArea = node('div', undefined, 'quick-dates'), appliedLabel = node('label', 'Date applied'), applied = node('input'), eventLabel = node('label'), eventDate = node('input');
  applied.type = eventDate.type = 'date'; applied.id = `quick-applied-${job.id}`; eventDate.id = `quick-event-${job.id}`;
  appliedLabel.htmlFor = applied.id; eventLabel.htmlFor = eventDate.id; applied.value = current.appliedAt;
  const appliedWrap = node('div'), eventWrap = node('div'); appliedWrap.append(appliedLabel, applied); eventWrap.append(eventLabel, eventDate); dateArea.append(appliedWrap, eventWrap);
  const message = node('p', '', 'error-text'); message.setAttribute('role', 'alert');
  const save = node('button', 'Save update', 'secondary'); save.type = 'submit';
  function updateFields() {
    dateArea.hidden = !select.value || select.value === 'saved';
    eventWrap.hidden = !['booked', 'interview'].includes(select.value);
    eventLabel.textContent = select.value === 'booked' ? 'Interview date' : 'Date interview completed';
    eventDate.value = select.value === 'booked' ? current.scheduledAt : select.value === 'interview' ? current.interviewAt : '';
    message.textContent = '';
  }
  select.addEventListener('change', updateFields); updateFields();
  form.append(label, select, dateArea, message, save);
  form.addEventListener('submit', event => {
    event.preventDefault(); message.textContent = '';
    if (!select.value) { message.textContent = 'Choose what happened first.'; select.focus(); return; }
    if (select.value === 'saved' && current.stage !== 'saved') { message.textContent = 'Use More dates and follow-up details to correct an older application.'; return; }
    const next = cleanProgress({ ...current, stage: select.value === 'booked' ? 'applied' : select.value,
      appliedAt: select.value === 'saved' ? '' : applied.value,
      scheduledAt: select.value === 'saved' ? '' : select.value === 'booked' ? eventDate.value : current.scheduledAt,
      interviewAt: select.value === 'saved' ? '' : select.value === 'interview' ? eventDate.value : current.interviewAt,
      updatedAt: new Date().toISOString().slice(0, 10) });
    const error = progressError(next);
    if (error) { message.textContent = error; return; }
    if (select.value === 'booked' && !eventDate.value) { message.textContent = 'Add the booked interview date.'; return; }
    job.progress = next; renderDashboard(); setSaveStatus();
    const updated = [...$('application-list').children].find(item => item.dataset.jobId === job.id);
    updated?.querySelector('.quick-outcome select')?.focus();
    announce('Job update saved. Your next action now uses this outcome.');
  });
  return form;
}

function renderDashboard() {
  syncProfile(); const report = diagnose(state);
  const next = searchNextAction(state);
  $('search-next-title').textContent = next.title; $('search-next-detail').textContent = next.detail;
  $('search-next-action').textContent = next.action;
  $('search-next-action').onclick = () => {
    if (next.step === 10) openInterview(next.jobId);
    else if (next.step === 4) { navigate(4); if (currentStep === 4 && next.jobId) $('job-list').querySelector(`[data-job-id="${CSS.escape(next.jobId)}"]`)?.scrollIntoView({ block: 'center' }); }
    else if (next.step === 5 && next.jobId) trackJob(next.jobId);
    else navigate(next.step);
  };
  $('search-observation').hidden = report.applications < 3;
  const upcoming = upcomingInterviews(state);
  $('upcoming-interviews').hidden = !upcoming.length; $('upcoming-list').replaceChildren();
  for (const job of upcoming) {
    const item = node('div', undefined, 'upcoming-item'); item.append(node('p', `${job.progress.scheduledAt} · ${job.title} — ${job.employer}`));
    const button = node('button', 'Prepare for this interview', 'secondary'); button.type = 'button'; button.addEventListener('click', () => openInterview(job.id)); item.append(button); $('upcoming-list').append(item);
  }
  $('dashboard-goal').textContent = GOALS[state.profile.goal];
  $('dashboard-expectation').textContent = state.profile.expectedOutcome || 'Add what useful progress would look like in your profile.';
  $('dashboard-stats').replaceChildren(...[['Applications', report.applications], ['Reached interview', report.interviews], ['Awaiting reply', report.waiting], ['Current offers', report.offers]].map(([label, value]) => {
    const item = node('div', undefined, 'stat'); item.append(node('strong', String(value)), node('span', label)); return item;
  }));
  $('recommendation').textContent = report.recommendation;
  $('observations').replaceChildren(...report.observations.map(value => node('li', value)));
  $('diagnosis-caveat').textContent = report.caveat;
  $('activity').replaceChildren(...report.weeks.map(week => node('p', `${week.label}: ${week.applications} applications`)));
  const list = $('application-list'); list.replaceChildren();
  if (!state.jobs.length) list.append(node('p', 'No saved jobs yet. Choose a job above to start your first application.', 'empty-state'));
  for (const job of state.jobs) {
    const p = cleanProgress(job.progress), card = node('article', undefined, 'card'); card.dataset.jobId = job.id;
    card.append(node('h3', job.title), node('p', job.employer, 'small muted'), node('p', STAGES[p.stage] + (p.appliedAt ? ` · Applied ${p.appliedAt}` : ''), 'small'));
    const actions = node('div', undefined, 'button-row');
    const prepare = node('button', 'Review job match', 'secondary'); prepare.type = 'button'; prepare.addEventListener('click', () => navigate(4));
    const interview = node('button', 'Prepare for interview', 'secondary'); interview.type = 'button'; interview.addEventListener('click', () => openInterview(job.id));
    actions.append(prepare, interview); card.append(actions, quickOutcome(job));
    if (p.scheduledAt) card.append(node('p', `Scheduled interview: ${p.scheduledAt}`, 'small'));
    const form = node('form', undefined, 'tracker-form'); form.autocomplete = 'off'; const fields = node('div', undefined, 'field-grid');
    const add = (name, label, type, value) => {
      const wrapper = node('div'), id = `track-${job.id}-${name}`, lab = node('label', label); lab.htmlFor = id;
      const input = node(type === 'select' ? 'select' : 'input'); input.id = id; input.name = name;
      if (type === 'select') for (const [key, text] of Object.entries(STAGES)) { const option = node('option', text); option.value = key; input.append(option); }
      else { input.type = type; if (type === 'text') { input.maxLength = 300; input.spellcheck = false; } if (type === 'date' && !['nextAt', 'scheduledAt'].includes(name)) input.max = new Date().toISOString().slice(0, 10); }
      input.value = value; wrapper.append(lab, input); fields.append(wrapper);
    };
    add('stage', 'Current application stage', 'select', p.stage);
    add('appliedAt', 'Date you applied', 'date', p.appliedAt);
    add('scheduledAt', 'Scheduled interview date (optional)', 'date', p.scheduledAt);
    add('interviewAt', 'First completed interview date', 'date', p.interviewAt);
    add('nextAt', 'Next action date (optional)', 'date', p.nextAt);
    add('nextAction', 'Your next action (optional)', 'text', p.nextAction);
    const message = node('p', '', 'error-text'); message.setAttribute('role', 'alert');
    const save = node('button', 'Update outcome', 'secondary'); save.type = 'submit';
    form.append(fields, message, save);
    form.addEventListener('submit', event => {
      event.preventDefault(); const update = cleanProgress({ ...Object.fromEntries(new FormData(form)), updatedAt: new Date().toISOString().slice(0, 10) });
      const error = progressError(update); if (error) { message.textContent = error; return; }
      job.progress = update; renderDashboard(); setSaveStatus();
      const updated = [...$('application-list').children].find(item => item.dataset.jobId === job.id);
      if (updated) { updated.querySelector('details').open = true; updated.querySelector('button[type="submit"]').focus(); }
      announce('Application outcome updated. Your recommendation now uses this record.');
    });
    if (p.updatedAt) card.append(node('p', `Last updated ${p.updatedAt}. Edit the fields to correct an entry.`, 'hint'));
    if (p.nextAt && p.nextAt <= new Date().toISOString().slice(0, 10) && !['rejected', 'withdrawn', 'offer'].includes(p.stage)) card.append(node('p', `Next action due: ${p.nextAction || 'Review this application'} (${p.nextAt})`, 'next-action'));
    const details = node('details'); details.append(node('summary', 'More dates and follow-up details'), form);
    card.append(details); list.append(card);
  }
  $('pilot-useful').value = state.feedback?.useful || ''; $('pilot-return').value = state.feedback?.return || '';
}
for (const id of ['pilot-useful', 'pilot-return']) $(id).addEventListener('change', () => {
  state.feedback = { useful: $('pilot-useful').value, return: $('pilot-return').value }; $('feedback-preview').hidden = true; setSaveStatus();
});
$('preview-feedback').addEventListener('click', () => {
  const report = diagnose(state);
  $('feedback-preview').textContent = `RoleBridge private pilot — voluntary summary\nVacancies compared: ${state.jobs.length}\nApplications recorded: ${report.applications}\nReached interview: ${report.interviews}\nUseful next action: ${state.feedback?.useful || 'Not answered'}\nWould use again: ${state.feedback?.return || 'Not answered'}\nNo name, CV, profile, employer, job title, dates or free-text notes included.\nSmall-sample counts can still be identifying in context. Share only if comfortable.`;
  $('feedback-preview').hidden = false;
});

document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
for (const id of ['privacy-open', 'privacy-footer']) $(id).addEventListener('click', () => $('privacy-dialog').showModal());
// Reset browser-restored controls before opening any private workspace.
profileForm.reset(); preferencesForm.reset(); jobForm.reset();
$('cv-text').value = ''; $('cv-file').value = '';
workspace = initWorkspace({
  getState: () => {
    syncProfile();
    return { ...state, profile: { ...state.profile, ...Object.fromEntries(pendingCvFields) } };
  },
  setState: value => { pendingCvFields.clear(); state = value; fillProfile(); },
  start: ({ restored }) => {
    workspaceStarted = true;
    document.querySelector('.hero').hidden = true; $('demo-link').hidden = true;
    const complete = state.profile.currentRole.trim() && state.profile.evidence.trim().length >= 20;
    profileReviewed = Boolean(restored && complete);
    showStep(entryStep === 10 ? 10 : restored && (complete || state.jobs.length) ? 5 : restored ? 1 : 0); entryStep = 0;
    if (homeRequestedDuringEntry) { homeRequestedDuringEntry = false; showHome(); }
    else if (pendingSidebarStep !== null) { const step = pendingSidebarStep; pendingSidebarStep = null; if (step !== currentStep) navigate(step); }
  }, announce
});
interviewPrep = initInterviewPrep({ getState: () => state, changed: setSaveStatus, announce });
applicationPack = initApplicationPack({ getState: () => state, changed: setSaveStatus, announce,
  prepareInterview: openInterview, trackJob, editJob: openJob, getCvSource: () => $('cv-text').value });
vacancies = initVacancies({
  getState: () => state, navigate, prepareJob: openInterview,
  updateSearch: (target, location) => { $('targetRole').value = target; $('locations').value = location; syncProfile(); setSaveStatus(); },
  addJob: vacancy => {
    if (state.jobs.some(job => job.id === vacancy.id || job.url === vacancy.url)) return 'This vacancy is already in your shortlist.';
    if (state.jobs.length >= 30) return 'Your shortlist holds up to 30 vacancies. Remove an old vacancy before adding another.';
    if (Date.now() - Date.parse(vacancy.source.fetchedAt) > 72 * 3600000 || (vacancy.source.expiresAt && Date.parse(vacancy.source.expiresAt) <= Date.now())) return 'This listing needs a fresh source check. Refresh the vacancy pool.';
    state.jobs.push(cleanJob(vacancy)); setSaveStatus();
    announce('Added to your shortlist. The summary is ready to compare; check the full advert before applying.');
    return true;
  }
});
fillProfile(); showStep(0, false);

updateSidebar();
