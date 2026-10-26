import { FEEDBACK_ENDPOINT } from './feedback-config.mjs';
import { FEEDBACK_QUESTIONS, validFeedbackEndpoint, submitFeedback } from './feedback.mjs';
const $ = id => document.getElementById(id);
const element = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
const form = $('feedback-form'), fields = $('feedback-fields'), status = $('feedback-status');
let dirty = false, sending = false;
// Do not restore old answers/consent from browser form autofill or read any workspace storage.
form.reset();
for (const [index, question] of FEEDBACK_QUESTIONS.entries()) {
  const group = element('fieldset'); group.className = 'feedback-question';
  const legend = element('legend', `${index + 1}. ${question.title}`); group.append(legend);
  if (question.options) {
    const hint = element('p', 'Choose one answer.'); hint.className = 'hint'; group.append(hint);
    for (const [value, label] of question.options) {
      const wrapper = element('label'); wrapper.className = 'feedback-choice';
      const input = element('input'); input.type = 'radio'; input.name = question.id; input.value = value; input.required = true;
      wrapper.append(input, element('span', label)); group.append(wrapper);
    }
  } else {
    const label = element('label', 'Your answer (optional)'); label.htmlFor = `feedback-${question.id}`;
    const hint = element('p', question.hint); hint.id = `feedback-${question.id}-hint`; hint.className = 'hint';
    const input = element('textarea'); input.id = label.htmlFor; input.name = question.id; input.rows = 4; input.maxLength = 1000;
    input.spellcheck = false; input.autocomplete = 'off'; input.setAttribute('aria-describedby', hint.id);
    group.append(label, hint, input);
  }
  $('feedback-questions').append(group);
}
const configured = validFeedbackEndpoint(FEEDBACK_ENDPOINT);
$('feedback-unavailable').hidden = configured;
fields.disabled = false;
$('feedback-send').disabled = !configured;
$('feedback-clear').disabled = false;
form.addEventListener('input', () => { dirty = true; status.textContent = ''; });
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
$('feedback-clear').addEventListener('click', () => {
  if (sending || (dirty && !confirm('Clear your feedback answers from this tab? Nothing will be sent.'))) return;
  form.reset(); dirty = false; status.textContent = 'Answers cleared. Nothing was sent.';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || !configured) return;
  if (!form.reportValidity()) { status.textContent = 'Answer the required questions and confirm that you want to send your feedback.'; return; }
  const data = new FormData(form);
  const values = Object.fromEntries(FEEDBACK_QUESTIONS.map(q => [q.id, data.get(q.id) ?? '']));
  values.consent = $('feedback-consent').checked; values.website = data.get('website');
  sending = true; fields.disabled = true; $('feedback-send').disabled = true; $('feedback-clear').disabled = true;
  form.setAttribute('aria-busy', 'true'); status.textContent = 'Sending your feedback…';
  try {
    await submitFeedback(FEEDBACK_ENDPOINT, values);
    form.reset(); dirty = false; form.hidden = true; $('feedback-success').hidden = false; $('feedback-success-title').focus();
  } catch (error) {
    status.textContent = error.message; status.focus();
  } finally {
    sending = false; fields.disabled = false; $('feedback-send').disabled = false; $('feedback-clear').disabled = false; form.removeAttribute('aria-busy');
  }
});
