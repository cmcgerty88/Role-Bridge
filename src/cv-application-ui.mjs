import { applicationCvDraft, CV_IMPORT_FIELDS } from './cv-application.mjs';
import { readCv } from './cv.mjs';
import { setCvUploadStatus } from './cv-upload-status.mjs';
const $ = id => document.getElementById(id);
const node = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
export function initApplicationCvImport({ getState, getPack, getSource, apply }) {
  let generation = 0, sourcePack = null;
  const original = new Map();
  function clear() {
    generation++; sourcePack = null; original.clear();
    $('application-cv-file').value = ''; $('application-cv-review').hidden = true;
    $('application-cv-fields').replaceChildren(); $('application-cv-confirmed').checked = false;
    setCvUploadStatus($('application-cv-status'), '', ''); $('application-cv-error').textContent = '';
  }
  function preview(source) {
    const pack = getPack(); if (!pack) return;
    sourcePack = pack;
    const { fields, clipped } = applicationCvDraft(source);
    const list = $('application-cv-fields'); list.replaceChildren();
    for (const [field, spec] of Object.entries(CV_IMPORT_FIELDS)) {
      if (!fields[field]) continue;
      const existing = spec.group === 'cv' ? getState().cv[field] : pack[field];
      original.set(field, existing);
      const wrapper = node('div'), label = node('label'); label.className = 'check';
      const choice = node('input'); choice.type = 'checkbox'; choice.dataset.importField = field;
      // Existing writing and identity details require a deliberate selection.
      choice.checked = !existing?.trim() && !['fullName', 'email', 'phone'].includes(field);
      label.append(choice, node('span', `${spec.label}${existing?.trim() ? ' — replace existing text' : ''}`));
      const id = `application-import-${field}`, inputLabel = node('label', 'Review extracted ' + spec.label.toLowerCase()); inputLabel.htmlFor = id;
      const input = node('textarea'); input.id = id; input.rows = ['history', 'education', 'summary'].includes(field) ? 5 : 2;
      input.value = fields[field]; input.maxLength = spec.limit; input.spellcheck = false; input.autocomplete = 'off';
      wrapper.append(label, inputLabel, input); list.append(wrapper);
    }
    const found = Boolean(list.children.length);
    $('application-cv-review').hidden = !found;
    $('application-cv-confirmed').checked = false;
    $('application-cv-status').textContent = found
      ? 'Review the extracted details below. Existing fields are kept unless you select them for replacement. Nothing from this import is saved until you apply it.' + (clipped.length ? ` Shortened to field limits: ${clipped.join(', ')}. Check the endings and any omitted details.` : '')
      : 'No supported sections were recognised. Use headings such as Work experience, Education and Certifications, or enter the career details manually below.';
  }
  $('application-cv-file').addEventListener('change', async () => {
    const file = $('application-cv-file').files[0]; clear(); if (!file) return;
    const token = generation, pack = getPack(); setCvUploadStatus($('application-cv-status'), 'loading', 'Reading your CV on this device…');
    try {
      const source = await readCv(file);
      if (token !== generation || getPack() !== pack) return;
      preview(source);
      setCvUploadStatus($('application-cv-status'), 'success', `CV read locally. ${$('application-cv-status').textContent}`);
    } catch (error) { if (token === generation) setCvUploadStatus($('application-cv-status'), 'error', error.message || 'Could not read this CV. You can still enter details manually.'); }
  });
  $('application-cv-reuse').addEventListener('click', () => {
    clear(); const source = getSource();
    if (source.trim()) preview(source);
    else $('application-cv-status').textContent = 'The original CV is no longer in this tab. Upload it here, or use the manual fields below. Original files are never saved.';
  });
  $('application-cv-fields').addEventListener('input', () => { $('application-cv-confirmed').checked = false; });
  $('application-cv-apply').addEventListener('click', () => {
    if (getPack() !== sourcePack || !sourcePack) { clear(); return; }
    if (!$('application-cv-confirmed').checked) { $('application-cv-error').textContent = 'Review the selected details and confirm before using them.'; $('application-cv-confirmed').focus(); return; }
    const values = { cv: {}, pack: {} };
    for (const choice of $('application-cv-fields').querySelectorAll('input:checked')) {
      const field = choice.dataset.importField, spec = CV_IMPORT_FIELDS[field];
      values[spec.group][field] = $(`application-import-${field}`).value.slice(0, spec.limit);
    }
    if (!Object.keys(values.cv).length && !Object.keys(values.pack).length) { $('application-cv-error').textContent = 'Select at least one field to use. Existing text stays unchanged.'; return; }
    const changedFields = Object.entries(CV_IMPORT_FIELDS).filter(([field, spec]) => Object.hasOwn(values[spec.group], field) && original.get(field) !== (spec.group === 'cv' ? getState().cv[field] : sourcePack[field])).map(([, spec]) => spec.label);
    if (changedFields.length && !confirm(`These fields were edited after the import was prepared: ${changedFields.join(', ')}. Replace those edits with the reviewed import?`)) return;
    apply(values); clear();
    $('application-cv-status').textContent = 'Selected details added. Review and tailor the CV below before downloading. Career details are shared across your CV drafts; summary, skills and achievements belong to this job.';
  });
  $('application-cv-discard').addEventListener('click', clear);
  $('application-cv-manual').addEventListener('click', () => { clear(); $('cv-history').focus(); });
  return { clear };
}
