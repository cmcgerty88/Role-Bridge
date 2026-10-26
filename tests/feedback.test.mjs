import test from 'node:test';
import assert from 'node:assert/strict';
import { FEEDBACK_QUESTIONS, validFeedbackEndpoint, feedbackPayload, submitFeedback } from '../src/feedback.mjs';
const endpoint = 'https://formspree.io/f/testform';
const answers = () => ({ task: 'interview', start: 'quite-easy', completion: 'alone', usefulness: 'very', problems: '', return: 'very-likely', improvement: 'Clearer next steps', consent: true });

test('feedback accepts only public form-ID endpoints, never email routes or other destinations', () => {
  assert.equal(validFeedbackEndpoint(endpoint), true);
  for (const url of ['', null, 'http://formspree.io/f/testform', 'https://formspree.io/private@example.test', endpoint + '?email=private@example.test', endpoint + '#fragment', endpoint + '/', 'https://formspree.io.evil.test/f/testform', 'https://user:password@formspree.io/f/testform']) assert.equal(validFeedbackEndpoint(url), false);
});
test('feedback whitelists seven readable answers, excluding workspace and contact fields', () => {
  const payload = feedbackPayload({ ...answers(), cv: 'PRIVATE_CV', email: 'private@example.test', profile: { secret: true }, _subject: 'override' });
  assert.equal(FEEDBACK_QUESTIONS.length, 7);
  assert.equal(Object.keys(payload).length, 10);
  assert.equal(payload._subject, 'RoleBridge beta feedback');
  assert.equal(payload[`1. ${FEEDBACK_QUESTIONS[0].title}`], 'Prepare for an interview');
  assert.equal(payload[`5. ${FEEDBACK_QUESTIONS[4].title}`], 'Not answered');
  assert.doesNotMatch(JSON.stringify(payload), /PRIVATE_CV|private@example|secret|override/);
});
test('invalid choices, missing consent, spam and oversized text never reach the service', async () => {
  let calls = 0;
  const options = { fetchImpl: async () => { calls++; return { ok: true }; } };
  for (const patch of [{ consent: false }, { consent: 'true' }, { task: 'invented' }, { start: '' }, { website: 'spam' }, { problems: 'x'.repeat(1001) }, { improvement: {} }]) {
    await assert.rejects(submitFeedback(endpoint, { ...answers(), ...patch }, options));
  }
  await assert.rejects(submitFeedback('', answers(), options));
  assert.equal(calls, 0);
});
test('sending omits credentials and referrer, blocks redirects, and does not read provider bodies', async () => {
  let calls = 0;
  assert.equal(await submitFeedback(endpoint, answers(), { fetchImpl: async (url, options) => {
    calls++; assert.equal(url, endpoint);
    assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer'); assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), feedbackPayload(answers()));
    return { ok: true, json() { throw Error('body must not be read'); } };
  } }), true);
  assert.equal(calls, 1);
});
test('provider errors are fixed messages without exposing provider response details', async () => {
  for (const status of [422, 429, 503]) {
    await assert.rejects(submitFeedback(endpoint, answers(), { fetchImpl: async () => ({ ok: false, status, async text() { throw Error('private-recipient@example.test'); } }) }), error => {
      assert.match(error.message, /answers are still here/); assert.doesNotMatch(error.message, /private-recipient/); return true;
    });
  }
});
test('timeout reports uncertain delivery and never retries automatically', async () => {
  let calls = 0;
  await assert.rejects(submitFeedback(endpoint, answers(), { timeoutMs: 5, fetchImpl: (_, { signal }) => {
    calls++; return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('timeout'))));
  } }), /may have received them/);
  assert.equal(calls, 1);
});
