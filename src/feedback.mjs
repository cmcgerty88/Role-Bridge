// Independent of the job-search workspace: only these seven answers can be sent.
export const FEEDBACK_QUESTIONS = [
  { id: 'task', title: 'What was the main thing you wanted RoleBridge to help you do today?', options: [
    ['roles', 'Work out which roles might suit my experience'], ['vacancies', 'Find vacancies to explore'], ['match', 'Check my experience against a job description'], ['interview', 'Prepare for an interview'], ['tracking', 'Track applications or decide what to do next'], ['exploring', 'Look around without a specific task'], ['other', 'Something else']
  ] },
  { id: 'start', title: 'How easy or difficult was it to work out where to start?', options: [
    ['very-easy', 'Very easy'], ['quite-easy', 'Quite easy'], ['neutral', 'Neither easy nor difficult'], ['quite-difficult', 'Quite difficult'], ['very-difficult', 'Very difficult'], ['not-tried', "I didn’t get far enough to judge"]
  ] },
  { id: 'completion', title: 'Were you able to complete what you came to do?', options: [
    ['alone', 'Yes, without help'], ['with-help', 'Yes, with help from someone'], ['partly', 'Partly'], ['no', 'No'], ['exploring', 'I was only looking around']
  ] },
  { id: 'usefulness', title: 'How useful was the guidance or output you received for your job search?', options: [
    ['very', 'Very useful'], ['quite', 'Quite useful'], ['neutral', 'Neither useful nor unhelpful'], ['not-very', 'Not very useful'], ['not-at-all', 'Not at all useful'], ['not-tried', 'I didn’t receive or try any guidance or output']
  ] },
  { id: 'problems', title: 'Where, if anywhere, did you get stuck or find something confusing, inaccurate or missing?', hint: 'Name the page or feature and describe the issue briefly. Leave out CV text and personal details. Up to 1,000 characters.' },
  { id: 'return', title: 'How likely are you to use RoleBridge again for a future job-search task?', options: [
    ['very-likely', 'Very likely'], ['quite-likely', 'Quite likely'], ['neutral', 'Neither likely nor unlikely'], ['quite-unlikely', 'Quite unlikely'], ['very-unlikely', 'Very unlikely'], ['unsure', 'I’m not sure yet']
  ] },
  { id: 'improvement', title: 'What one change would make RoleBridge more useful to you?', hint: 'A sentence or two is enough. Leave out personal or confidential information. Up to 1,000 characters.' }
];
export function validFeedbackEndpoint(value) {
  // A provider form ID is public; email-based routes and arbitrary destinations are rejected.
  return typeof value === 'string' && /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]{6,32}$/.test(value);
}
export function feedbackPayload(values) {
  if (!values || values.consent !== true) throw new Error('Please confirm that you want to send these answers.');
  if (values.website) throw new Error('This response could not be submitted.');
  const result = { _subject: 'RoleBridge beta feedback', form_version: '1', _gotcha: '' };
  for (const [index, q] of FEEDBACK_QUESTIONS.entries()) {
    const value = values[q.id];
    let answer;
    if (q.options) {
      answer = q.options.find(([id]) => id === value)?.[1];
      if (!answer) throw new Error(`Please answer question ${index + 1}.`);
    } else {
      if (typeof value !== 'string' || value.length > 1000) throw new Error(`Question ${index + 1} must contain no more than 1,000 characters.`);
      answer = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim() || 'Not answered';
    }
    result[`${index + 1}. ${q.title}`] = answer;
  }
  return result;
}
export async function submitFeedback(endpoint, values, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  if (!validFeedbackEndpoint(endpoint)) throw new Error('Feedback sending is not available yet. Please come back later.');
  const payload = feedbackPayload(values), controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal
    });
  } catch {
    throw new Error('We couldn’t confirm submission. Your answers are still here. The service may have received them, so please wait before trying again.');
  } finally { clearTimeout(timeout); }
  if (!response.ok) {
    if (response.status === 429) throw new Error('The feedback service is temporarily limiting submissions. Your answers are still here; please try later.');
    if (response.status >= 500) throw new Error('We couldn’t confirm submission. Your answers are still here. The service may have received them, so please wait before trying again.');
    // Never display a provider response body: it may contain account details or markup.
    throw new Error('The feedback service could not accept this response. Your answers are still here. Please try later.');
  }
  return true; // Provider accepted the request; this does not verify mailbox delivery.
}
